import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { router } from 'expo-router';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { signInWithGitHub } from '@/lib/auth';
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
}));

const mockedSignIn = signInWithGitHub as jest.MockedFunction<typeof signInWithGitHub>;
const mockedReplace = router.replace as jest.Mock;

let tree: ReactTestRenderer | null = null;

function render(): ReactTestRenderer {
  act(() => {
    tree = create(<WelcomeScreen />);
  });
  return tree as ReactTestRenderer;
}

async function pressContinue(target: ReactTestRenderer): Promise<void> {
  const button = target.root
    .findAll((n) => n.props.accessibilityLabel === 'Continue with GitHub')
    .find((n) => typeof n.props.onPress === 'function');
  if (!button) throw new Error('Tombol Continue with GitHub tidak ditemukan');
  await act(async () => {
    await button.props.onPress();
  });
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
