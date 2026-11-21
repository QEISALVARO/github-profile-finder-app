import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { router } from 'expo-router';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { completeOAuthFromUrl, isOAuthCallbackUrl } from '@/lib/auth';
import { useAuthStore, type AuthSession } from '@/store/useAuthStore';

import AuthCallbackScreen from '../auth/callback';

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

let mockCurrentUrl: string | null = 'gitscope://auth/callback?code=abc';

jest.mock('expo-linking', () => ({
  useURL: () => mockCurrentUrl,
}));

jest.mock('@/lib/auth', () => ({
  completeOAuthFromUrl: jest.fn(),
  isOAuthCallbackUrl: jest.fn((url: string) => /[?&](code|error|access_token)=/.test(url)),
}));

const mockedComplete = completeOAuthFromUrl as jest.MockedFunction<typeof completeOAuthFromUrl>;
const mockedIsCallback = isOAuthCallbackUrl as jest.MockedFunction<typeof isOAuthCallbackUrl>;
const mockedReplace = router.replace as jest.Mock;

const GITHUB_SESSION: AuthSession = {
  login: 'octocat',
  name: 'Octo Cat',
  avatarUrl: 'https://github.com/octocat.png',
  githubId: 583231,
  bio: null,
  locationText: null,
};

const GOOGLE_SESSION: AuthSession = {
  ...GITHUB_SESSION,
  login: 'rina',
  name: 'Rina',
  githubId: 0,
  provider: 'google',
};

let tree: ReactTestRenderer | null = null;

/** Render lalu biarkan efek async (exchange → routing) selesai. */
async function render(): Promise<ReactTestRenderer> {
  await act(async () => {
    tree = create(<AuthCallbackScreen />);
  });
  return tree as ReactTestRenderer;
}

afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  mockCurrentUrl = 'gitscope://auth/callback?code=abc';
  useAuthStore.getState().deleteAccount();
  jest.clearAllMocks();
});

/**
 * Route ini jaring pengaman untuk app yang di-kill saat browser OAuth terbuka:
 * code ditukar di sini, lalu tujuan mengikuti sesi yang sudah masuk store.
 */
describe('auth/callback — routing setelah penukaran code', () => {
  it('sends a Google account without GitHub to the link gate', async () => {
    useAuthStore.getState().signIn(GOOGLE_SESSION);
    mockedComplete.mockResolvedValueOnce({ error: null });

    await render();

    expect(mockedComplete).toHaveBeenCalledWith('gitscope://auth/callback?code=abc');
    expect(mockedReplace).toHaveBeenCalledWith('/connect-github');
  });

  it('sends a GitHub account to onboarding', async () => {
    useAuthStore.getState().signIn(GITHUB_SESSION);
    mockedComplete.mockResolvedValueOnce({ error: null });

    await render();

    expect(mockedReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('sends an onboarded account to the tabs', async () => {
    const store = useAuthStore.getState();
    store.signIn(GITHUB_SESSION);
    store.setRoles(['developer']);
    store.completeOnboarding();
    mockedComplete.mockResolvedValueOnce({ error: null });

    await render();

    expect(mockedReplace).toHaveBeenCalledWith('/explore');
  });

  it('returns to Welcome when no session was established', async () => {
    mockedComplete.mockResolvedValueOnce({ error: null });

    await render();

    expect(mockedReplace).toHaveBeenCalledWith('/welcome');
  });

  it('shows the provider error on Welcome instead of entering the app', async () => {
    mockedComplete.mockResolvedValueOnce({
      error: 'Authorization callback URL tidak cocok.',
      reason: 'oauth_failed',
    });

    await render();

    expect(useAuthStore.getState().authError).toMatch(/callback URL/);
    expect(mockedReplace).toHaveBeenCalledWith('/welcome');
    expect(mockedReplace).not.toHaveBeenCalledWith('/onboarding');
  });

  it('skips the exchange for a deep link without OAuth data', async () => {
    mockCurrentUrl = 'gitscope://';
    useAuthStore.getState().signIn(GOOGLE_SESSION);

    await render();

    expect(mockedIsCallback).toHaveBeenCalled();
    expect(mockedComplete).not.toHaveBeenCalled();
    expect(mockedReplace).toHaveBeenCalledWith('/connect-github');
  });
});
