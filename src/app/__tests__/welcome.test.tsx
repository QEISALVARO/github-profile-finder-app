import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { router } from 'expo-router';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { signInWithGitHub, signInWithGoogle } from '@/lib/auth';
import { useAuthStore } from '@/store/useAuthStore';

import WelcomeScreen from '../welcome';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  ...jest.requireActual<{ default: Record<string, unknown> }>(
    'react-native-safe-area-context/jest/mock',
  ).default,
}));

jest.mock('@/lib/supabase');
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));
jest.mock('@/lib/auth', () => ({
  signInWithGitHub: jest.fn(),
  signInWithGoogle: jest.fn(),
}));

const mockedSignIn = signInWithGitHub as jest.MockedFunction<typeof signInWithGitHub>;
const mockedSignInGoogle = signInWithGoogle as jest.MockedFunction<typeof signInWithGoogle>;
const mockedReplace = router.replace as jest.Mock;

let tree: ReactTestRenderer | null = null;

function render(): ReactTestRenderer {
  act(() => {
    tree = create(<WelcomeScreen />);
  });
  return tree as ReactTestRenderer;
}

async function pressLabel(target: ReactTestRenderer, label: string): Promise<void> {
  const button = target.root
    .findAll((n) => n.props.accessibilityLabel === label)
    .find((n) => typeof n.props.onPress === 'function');
  if (!button) throw new Error(`Tombol "${label}" tidak ditemukan`);
  await act(async () => {
    await button.props.onPress();
  });
}

async function pressContinue(target: ReactTestRenderer): Promise<void> {
  await pressLabel(target, 'Continue with GitHub');
}

async function pressContinueGoogle(target: ReactTestRenderer): Promise<void> {
  await pressLabel(target, 'Continue with Google');
}

afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  useAuthStore.getState().deleteAccount();
  jest.clearAllMocks();
});

/**
 * Regresi APK (#continue-dead): build tanpa env Supabase harus tetap membuka
 * sesi demo, sedangkan kegagalan OAuth sungguhan ditampilkan sebagai error
 * (tidak diam-diam jadi demo).
 */
describe('Welcome — Continue with GitHub', () => {
  it('falls back to the local demo session when the build has no Supabase env', async () => {
    mockedSignIn.mockResolvedValueOnce({
      error: 'Build ini belum membawa konfigurasi Supabase.',
      reason: 'not_configured',
    });

    const target = render();
    await pressContinue(target);

    expect(useAuthStore.getState().session?.login).toBe('octocat');
    expect(mockedReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('shows the real OAuth failure instead of forcing a demo session', async () => {
    mockedSignIn.mockResolvedValueOnce({
      error: 'Redirect URL belum diizinkan di Supabase.',
      reason: 'oauth_failed',
    });

    const target = render();
    await pressContinue(target);

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().authError).toMatch(/Redirect URL/);
    expect(mockedReplace).not.toHaveBeenCalled();
    expect(JSON.stringify(target.toJSON())).toContain('Redirect URL belum diizinkan');
  });

  it('does not start a demo session when the user cancels the browser', async () => {
    mockedSignIn.mockResolvedValueOnce({
      error: 'Login dibatalkan.',
      cancelled: true,
      reason: 'cancelled',
    });

    const target = render();
    await pressContinue(target);

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().authError).toBe('Login dibatalkan.');
    expect(mockedReplace).not.toHaveBeenCalled();
  });
});

/**
 * Google hanya alternatif *masuk*, bukan identitas: sesi Google tanpa GitHub
 * harus dibiarkan ke gerbang /connect-github (guard root), sedangkan akun yang
 * sudah punya githubId langsung boleh onboarding.
 */
describe('Welcome — Continue with Google', () => {
  it('leaves a Google-only session for the root guard to gate', async () => {
    mockedSignInGoogle.mockImplementationOnce(async () => {
      // onAuthStateChange memetakan sesi Supabase sebelum promise selesai.
      useAuthStore.getState().signIn({
        login: 'rina',
        name: 'Rina',
        avatarUrl: '',
        githubId: 0,
        bio: null,
        locationText: null,
        provider: 'google',
      });
      return { error: null };
    });

    const target = render();
    await pressContinueGoogle(target);

    expect(mockedSignInGoogle).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session?.provider).toBe('google');
    expect(useAuthStore.getState().session?.githubId).toBe(0);
    expect(mockedReplace).not.toHaveBeenCalled();
  });

  it('routes a Google account that already links GitHub to onboarding', async () => {
    mockedSignInGoogle.mockImplementationOnce(async () => {
      useAuthStore.getState().signIn({
        login: 'octocat',
        name: 'Octo Cat',
        avatarUrl: 'https://github.com/octocat.png?size=128',
        githubId: 583231,
        bio: null,
        locationText: null,
        provider: 'google',
      });
      return { error: null };
    });

    const target = render();
    await pressContinueGoogle(target);

    expect(mockedReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('falls back to the demo session only when the build has no Supabase env', async () => {
    mockedSignInGoogle.mockResolvedValueOnce({
      error: 'Build ini belum membawa konfigurasi Supabase.',
      reason: 'not_configured',
    });

    const target = render();
    await pressContinueGoogle(target);

    expect(useAuthStore.getState().session?.login).toBe('octocat');
    expect(mockedReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('shows a disabled-provider error and keeps the signed-out state', async () => {
    mockedSignInGoogle.mockResolvedValueOnce({
      error: 'Provider Google belum diaktifkan di project Supabase.',
      reason: 'oauth_failed',
    });

    const target = render();
    await pressContinueGoogle(target);

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().authError).toMatch(/Provider Google/);
    expect(mockedReplace).not.toHaveBeenCalled();
    expect(JSON.stringify(target.toJSON())).toContain('Provider Google belum diaktifkan');
  });

  it('does not force a demo session when the Google browser is cancelled', async () => {
    mockedSignInGoogle.mockResolvedValueOnce({
      error: 'Login dibatalkan.',
      cancelled: true,
      reason: 'cancelled',
    });

    const target = render();
    await pressContinueGoogle(target);

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().authError).toBe('Login dibatalkan.');
    expect(mockedReplace).not.toHaveBeenCalled();
  });
});
