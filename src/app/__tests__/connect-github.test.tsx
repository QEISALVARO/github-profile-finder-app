import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { router } from 'expo-router';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { linkGitHubIdentity, signOutRemote } from '@/lib/auth';
import { useAuthStore, type AuthSession } from '@/store/useAuthStore';

import ConnectGitHubScreen from '../connect-github';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  ...jest.requireActual<{ default: Record<string, unknown> }>(
    'react-native-safe-area-context/jest/mock',
  ).default,
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('@/lib/auth', () => ({
  linkGitHubIdentity: jest.fn(),
  signOutRemote: jest.fn(),
}));

const mockedLink = linkGitHubIdentity as jest.MockedFunction<typeof linkGitHubIdentity>;
const mockedSignOutRemote = signOutRemote as jest.MockedFunction<typeof signOutRemote>;
const mockedReplace = router.replace as jest.Mock;

/** Sesi Google sebelum penautan: githubId 0 = gerbang belum terlewati. */
const GOOGLE_SESSION: AuthSession = {
  login: 'rina',
  name: 'Rina',
  avatarUrl: 'https://x/rina.png',
  githubId: 0,
  bio: null,
  locationText: null,
  provider: 'google',
};

let tree: ReactTestRenderer | null = null;

function render(): ReactTestRenderer {
  act(() => {
    tree = create(<ConnectGitHubScreen />);
  });
  return tree as ReactTestRenderer;
}

async function press(target: ReactTestRenderer, label: string): Promise<void> {
  const button = target.root
    .findAll((n) => n.props.accessibilityLabel === label)
    .find((n) => typeof n.props.onPress === 'function');
  if (!button) throw new Error(`Tombol "${label}" tidak ditemukan`);
  await act(async () => {
    await button.props.onPress();
  });
}

function textOf(node: unknown, acc: string[] = []): string {
  if (node == null) return acc.join('');
  if (Array.isArray(node)) {
    node.forEach((child) => textOf(child, acc));
    return acc.join('');
  }
  if (typeof node === 'string') {
    acc.push(node);
    return acc.join('');
  }
  const container = node as { children?: unknown };
  if (container.children) textOf(container.children, acc);
  return acc.join('');
}

beforeEach(() => {
  useAuthStore.getState().signIn(GOOGLE_SESSION);
});

afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  useAuthStore.getState().deleteAccount();
  jest.clearAllMocks();
});

describe('ConnectGitHub — penautan', () => {
  it('updates the local session with the verified GitHub identity', async () => {
    mockedLink.mockResolvedValueOnce({
      error: null,
      identity: {
        login: 'octocat',
        githubId: 583231,
        name: 'Octo Cat',
        avatarUrl: 'https://github.com/octocat.png',
      },
    });

    const target = render();
    await press(target, 'Hubungkan GitHub');

    expect(mockedLink).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session).toMatchObject({
      login: 'octocat',
      name: 'Octo Cat',
      avatarUrl: 'https://github.com/octocat.png',
      githubId: 583231,
      // Metode login tetap Google; GitHub baru identitas yang ditautkan.
      provider: 'google',
    });
    // Belum onboarded → kembali ke onboarding setelah sesi diperbarui.
    expect(mockedReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('returns an onboarded account to the profile after linking', async () => {
    useAuthStore.getState().setRoles(['recruiter']);
    useAuthStore.getState().completeOnboarding();
    mockedLink.mockResolvedValueOnce({
      error: null,
      identity: { login: 'octocat', githubId: 583231, name: 'Octo Cat', avatarUrl: null },
    });

    const target = render();
    await press(target, 'Hubungkan GitHub');

    expect(mockedReplace).toHaveBeenCalledWith('/profile');
  });

  it('keeps the previous name and avatar when GitHub profile data is missing', async () => {
    mockedLink.mockResolvedValueOnce({
      error: null,
      identity: { login: 'octocat', githubId: 583231, name: null, avatarUrl: null },
    });

    const target = render();
    await press(target, 'Hubungkan GitHub');

    expect(useAuthStore.getState().session).toMatchObject({
      login: 'octocat',
      name: 'Rina',
      avatarUrl: 'https://x/rina.png',
      githubId: 583231,
    });
  });

  it('shows the manual-linking setup message and leaves the session gated', async () => {
    mockedLink.mockResolvedValueOnce({
      error: 'Penautan akun belum aktif di Supabase.',
      reason: 'oauth_failed',
    });

    const target = render();
    await press(target, 'Hubungkan GitHub');

    expect(useAuthStore.getState().session).toMatchObject({ login: 'rina', githubId: 0 });
    expect(textOf(target.toJSON())).toContain('Penautan akun belum aktif di Supabase.');
    expect(mockedReplace).not.toHaveBeenCalled();
  });

  it('falls back to a local message when no error and no identity come back', async () => {
    mockedLink.mockResolvedValueOnce({ error: null });

    const target = render();
    await press(target, 'Hubungkan GitHub');

    expect(textOf(target.toJSON())).toContain('Penautan GitHub gagal. Coba lagi.');
    expect(useAuthStore.getState().session?.githubId).toBe(0);
  });

  it('surfaces a thrown error instead of leaving the button silent', async () => {
    mockedLink.mockRejectedValueOnce(new Error('Jaringan terputus'));

    const target = render();
    await press(target, 'Hubungkan GitHub');

    expect(textOf(target.toJSON())).toContain('Jaringan terputus');
    expect(useAuthStore.getState().session?.githubId).toBe(0);
  });
});

describe('ConnectGitHub — keluar', () => {
  it('clears the local session and returns to Welcome', async () => {
    mockedSignOutRemote.mockResolvedValueOnce(undefined);

    const target = render();
    await press(target, 'Keluar dari akun');

    expect(mockedSignOutRemote).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session).toBeNull();
    expect(mockedReplace).toHaveBeenCalledWith('/welcome');
  });

  it('still signs out locally when the remote sign-out fails', async () => {
    mockedSignOutRemote.mockRejectedValueOnce(new Error('offline'));

    const target = render();
    await press(target, 'Keluar dari akun');

    expect(useAuthStore.getState().session).toBeNull();
    expect(mockedReplace).toHaveBeenCalledWith('/welcome');
  });
});
