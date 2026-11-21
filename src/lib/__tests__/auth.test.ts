import { MissingEnvironmentError } from '@/api/errors';
import * as WebBrowser from 'expo-web-browser';

import {
  AUTH_SETUP_MESSAGES,
  completeOAuthFromUrl,
  completeOAuthWithCode,
  isOAuthCallbackUrl,
  linkGitHubIdentity,
  mapSupabaseSession,
  probeAuthorizeUrl,
  resetOAuthExchangeCache,
  signInWithGitHub,
  signInWithGoogle,
} from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

const mockedOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;
const fetchMock = jest.fn();

// Jest tidak memuat manifest expo-constants, jadi `makeRedirectUri` asli
// melempar error sebelum skenario OAuth diuji. Deep link-nya sendiri sudah
// didaftarkan di app.json (`scheme: "gitscope"`).
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'gitscope://auth/callback'),
}));

type AuthStub = {
  auth: {
    signInWithOAuth: jest.Mock;
    linkIdentity: jest.Mock;
    exchangeCodeForSession: jest.Mock;
    setSession: jest.Mock;
    getUser: jest.Mock;
    updateUser: jest.Mock;
  };
  rpc: jest.Mock;
};

async function authStub(): Promise<AuthStub> {
  return (await getSupabase()) as unknown as AuthStub;
}

/**
 * Regresi APK release: build cloud tidak membawa `.env` sehingga `getSupabase()`
 * melempar `MissingEnvironmentError`. Handler tombol Welcome tidak boleh ikut
 * reject (dulu: tombol "Continue with GitHub" terasa mati) — fungsi ini wajib
 * mengembalikan `{ error }` agar layar bisa jatuh ke sesi demo lokal.
 */
describe('signInWithGitHub', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('returns not_configured instead of throwing when the backend is missing', async () => {
    (getSupabase as jest.Mock).mockRejectedValueOnce(
      new MissingEnvironmentError(['EXPO_PUBLIC_SUPABASE_URL']),
    );

    const result = await signInWithGitHub();
    expect(result.reason).toBe('not_configured');
    expect(result.error).toMatch(/konfigurasi Supabase/i);
  });

  it('returns the provider error when OAuth cannot build a URL', async () => {
    const supabase = await authStub();
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: null },
      error: { message: 'Provider GitHub belum aktif.' },
    });

    await expect(signInWithGitHub()).resolves.toEqual({
      error: 'Provider GitHub belum aktif.',
      reason: 'oauth_failed',
    });
  });

  it('stops before opening the browser when GitHub answers 404 for the Client ID', async () => {
    const supabase = await authStub();
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://ref.supabase.co/auth/v1/authorize?provider=github' },
      error: null,
    });
    fetchMock.mockResolvedValueOnce({ status: 404, text: async () => '' });

    const result = await signInWithGitHub();

    expect(result.reason).toBe('github_client_id');
    expect(result.error).toBe(AUTH_SETUP_MESSAGES.githubClientId);
    expect(result.error).toMatch(/OAuth Apps/);
    expect(mockedOpenAuthSession).not.toHaveBeenCalled();
  });

  it('does not block login when the probe fails', async () => {
    const supabase = await authStub();
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://ref.supabase.co/auth/v1/authorize?provider=github' },
      error: null,
    });
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    mockedOpenAuthSession.mockResolvedValueOnce({
      type: 'success',
      url: 'gitscope://auth/callback?code=abc',
    });
    supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: null });

    await expect(signInWithGitHub()).resolves.toEqual({ error: null });
    expect(mockedOpenAuthSession).toHaveBeenCalled();
  });
});

describe('probeAuthorizeUrl', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('returns github_404 only for a 404 response', async () => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValueOnce({ status: 404, text: async () => '' });
    await expect(probeAuthorizeUrl('https://ref.supabase.co/auth/v1/authorize')).resolves.toBe(
      'github_404',
    );

    fetchMock.mockResolvedValueOnce({ status: 200, text: async () => '' });
    await expect(probeAuthorizeUrl('https://ref.supabase.co/auth/v1/authorize')).resolves.toBe(
      'ok',
    );
  });

  it('returns unknown instead of throwing on network errors', async () => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(probeAuthorizeUrl('https://ref.supabase.co/auth/v1/authorize')).resolves.toBe(
      'unknown',
    );
  });
});

describe('OAuth callback handling', () => {
  beforeEach(() => {
    resetOAuthExchangeCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exchanges the PKCE code itself, not the whole callback URL', async () => {
    const supabase = await authStub();
    supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: null });

    const result = await completeOAuthFromUrl(
      'gitscope://auth/callback?code=34e770dd-9ff9-416c-87fa-43b31d7ef225',
    );

    expect(result).toEqual({ error: null });
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      '34e770dd-9ff9-416c-87fa-43b31d7ef225',
      undefined,
    );
  });

  it('forwards sb_flow_id to Supabase when present', async () => {
    const supabase = await authStub();
    supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: null });

    await completeOAuthFromUrl('gitscope://auth/callback?code=abc&sb_flow_id=flow-1');

    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc', {
      flowId: 'flow-1',
    });
  });

  it('exchanges a code at most once even when both callback paths fire', async () => {
    const supabase = await authStub();
    supabase.auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });

    const [fromPromise, fromRoute] = await Promise.all([
      completeOAuthFromUrl('gitscope://auth/callback?code=abc'),
      completeOAuthWithCode('abc'),
    ]);

    expect(fromPromise).toEqual({ error: null });
    expect(fromRoute).toEqual({ error: null });
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it('surfaces provider errors from the callback query string', async () => {
    const result = await completeOAuthFromUrl(
      'gitscope://auth/callback?error=access_denied&error_description=User%20denied',
    );

    expect(result.error).toBe('User denied');
    expect(result.reason).toBe('oauth_failed');
  });

  it('separates a GitHub Client ID error from a Supabase redirect error', async () => {
    const clientId = await completeOAuthFromUrl(
      'gitscope://auth/callback?error_description=invalid_client',
    );
    expect(clientId.error).toBe(AUTH_SETUP_MESSAGES.githubClientId);

    const callback = await completeOAuthFromUrl(
      'gitscope://auth/callback?error_description=redirect_uri%20mismatch',
    );
    expect(callback.error).toBe(AUTH_SETUP_MESSAGES.githubCallbackUrl);

    const redirect = await completeOAuthFromUrl(
      'gitscope://auth/callback?error_description=redirect_to%20not%20allowed',
    );
    expect(redirect.error).toBe(AUTH_SETUP_MESSAGES.supabaseRedirectUrl);
  });

  it('detects whether a deep link carries OAuth data', () => {
    expect(isOAuthCallbackUrl('gitscope://auth/callback?code=abc')).toBe(true);
    expect(isOAuthCallbackUrl('gitscope://auth/callback?error=access_denied')).toBe(true);
    expect(isOAuthCallbackUrl('gitscope://auth/callback')).toBe(false);
    expect(isOAuthCallbackUrl('gitscope://')).toBe(false);
  });
});

describe('mapSupabaseSession', () => {
  it('keeps a Google session without GitHub so the link gate can render', () => {
    const mapped = mapSupabaseSession({
      user: {
        id: 'u-1',
        email: 'rina@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: { full_name: 'Rina', avatar_url: 'https://x/a.png' },
      },
    });

    expect(mapped).toMatchObject({
      login: 'rina',
      name: 'Rina',
      avatarUrl: 'https://x/a.png',
      githubId: 0,
      provider: 'google',
    });
  });

  it('does not treat a Google sub as a GitHub id', () => {
    const mapped = mapSupabaseSession({
      user: {
        id: 'u-1',
        email: 'rina@example.com',
        app_metadata: { provider: 'google' },
        // provider_id Google + preferred_username bisa ada tanpa GitHub terhubung.
        user_metadata: { provider_id: '109876', preferred_username: 'rina' },
      },
    });

    expect(mapped?.githubId).toBe(0);
    expect(mapped?.provider).toBe('google');
  });

  it('reads the GitHub identity cached after linking', () => {
    const mapped = mapSupabaseSession({
      user: {
        id: 'u-1',
        email: 'rina@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: {
          full_name: 'Rina',
          gitscope_github: true,
          github_id: '583231',
          user_name: 'octocat',
          avatar_url: 'https://github.com/octocat.png',
        },
      },
    });

    expect(mapped).toMatchObject({
      login: 'octocat',
      githubId: 583231,
      provider: 'google',
    });
  });
});

describe('signInWithGoogle', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('opens the Google authorize URL and finishes the PKCE exchange', async () => {
    const supabase = await authStub();
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://ref.supabase.co/auth/v1/authorize?provider=google' },
      error: null,
    });
    mockedOpenAuthSession.mockResolvedValueOnce({
      type: 'success',
      url: 'gitscope://auth/callback?code=google-code',
    });
    supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: null });

    await expect(signInWithGoogle()).resolves.toEqual({ error: null });
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    );
  });

  it('reports a disabled Google provider', async () => {
    const supabase = await authStub();
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: null },
      error: { message: 'Unsupported provider: provider is not enabled (google)' },
    });

    await expect(signInWithGoogle()).resolves.toEqual({
      error: 'Provider Google belum diaktifkan di project Supabase.',
      reason: 'oauth_failed',
    });
  });
});

describe('linkGitHubIdentity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('stores the verified GitHub identity through the RPC without reopening the browser', async () => {
    const supabase = await authStub();
    supabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          identities: [
            {
              provider: 'github',
              identity_data: {
                user_name: 'octocat',
                provider_id: '583231',
                avatar_url: 'https://github.com/octocat.png',
              },
            },
          ],
        },
      },
    });
    supabase.rpc.mockResolvedValueOnce({
      data: [
        { login: 'octocat', github_id: 583231, name: 'Octo Cat', avatar_url: 'https://a.png' },
      ],
      error: null,
    });

    const result = await linkGitHubIdentity();

    expect(result.error).toBeNull();
    expect(result.identity).toEqual({
      login: 'octocat',
      githubId: 583231,
      name: 'Octo Cat',
      avatarUrl: 'https://a.png',
    });
    expect(supabase.rpc).toHaveBeenCalledWith('connect_github_identity');
    expect(supabase.auth.linkIdentity).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ gitscope_github: true }) }),
    );
  });

  it('surfaces the manual-linking setup error instead of opening the browser', async () => {
    const supabase = await authStub();
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: { identities: [] } } });
    supabase.auth.linkIdentity.mockResolvedValueOnce({
      data: { url: null },
      error: { message: 'Manual linking is disabled' },
    });

    const result = await linkGitHubIdentity();

    expect(result.error).toBe(AUTH_SETUP_MESSAGES.manualLinking);
    expect(mockedOpenAuthSession).not.toHaveBeenCalled();
  });
});
