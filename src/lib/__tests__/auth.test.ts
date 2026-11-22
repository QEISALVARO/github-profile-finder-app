import { MissingEnvironmentError } from '@/api/errors';
import * as WebBrowser from 'expo-web-browser';

import {
  AUTH_SETUP_MESSAGES,
  completeOAuthFromUrl,
  completeOAuthWithCode,
  completePasswordRecoveryFromUrl,
  friendlyEmailAuthError,
  friendlyRecoveryError,
  passwordRecoveryRedirectUrl,
  isOAuthCallbackUrl,
  isPasswordRecoveryUrl,
  linkGitHubIdentity,
  mapSupabaseSession,
  probeAuthorizeUrl,
  resetOAuthExchangeCache,
  resendSignupConfirmation,
  resetPasswordForEmail,
  signInWithEmail,
  signInWithGitHub,
  signInWithGoogle,
  signUpWithEmail,
  updatePassword,
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
  makeRedirectUri: jest.fn(({ path }: { path?: string } = {}) =>
    path ? `gitscope://${path}` : 'gitscope://auth/callback',
  ),
}));

type AuthStub = {
  auth: {
    signInWithOAuth: jest.Mock;
    linkIdentity: jest.Mock;
    exchangeCodeForSession: jest.Mock;
    setSession: jest.Mock;
    getUser: jest.Mock;
    updateUser: jest.Mock;
    signUp: jest.Mock;
    signInWithPassword: jest.Mock;
    resetPasswordForEmail: jest.Mock;
    resend: jest.Mock;
    signOut: jest.Mock;
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

describe('email auth', () => {
  afterEach(() => jest.clearAllMocks());

  it('maps invalid credentials to an actionable message', () => {
    const mapped = friendlyEmailAuthError('Invalid login credentials', 'invalid_credentials');
    expect(mapped.reason).toBe('invalid_credentials');
    expect(mapped.message).toMatch(/Email atau password salah/i);
  });

  it('maps an unconfirmed email to the confirmation reason', () => {
    const mapped = friendlyEmailAuthError('Email not confirmed', 'email_not_confirmed');
    expect(mapped.reason).toBe('email_not_confirmed');
    expect(mapped.message).toMatch(/belum dikonfirmasi/i);
  });

  it('signs up with email and reports the confirmation state without a session', async () => {
    const supabase = await authStub();
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'u-1', email: 'rina@company.com' }, session: null },
      error: null,
    });

    await expect(signUpWithEmail('rina@company.com', 'rahasia123')).resolves.toEqual({
      error: null,
      needsEmailConfirmation: true,
    });
    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'rina@company.com', password: 'rahasia123' }),
    );
  });

  it('surfaces a duplicate email as already_registered', async () => {
    const supabase = await authStub();
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'User already registered', code: 'user_already_exists' },
    });

    const result = await signUpWithEmail('rina@company.com', 'rahasia123');
    expect(result.reason).toBe('email_taken');
    expect(result.error).toMatch(/sudah terdaftar/i);
  });

  it('signs in with email and persists a mapped session without GitHub identity', async () => {
    const supabase = await authStub();
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: 'u-1',
          email: 'rina@company.com',
          app_metadata: { provider: 'email' },
          user_metadata: { full_name: 'Rina' },
        },
        session: { access_token: 'token' },
      },
      error: null,
    });

    await expect(signInWithEmail('rina@company.com', 'rahasia123')).resolves.toEqual({
      error: null,
    });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'rina@company.com',
      password: 'rahasia123',
    });
  });

  it('returns a configuration error instead of a fake email session', async () => {
    (getSupabase as jest.Mock).mockRejectedValueOnce(
      new MissingEnvironmentError(['EXPO_PUBLIC_SUPABASE_URL']),
    );

    const result = await signInWithEmail('rina@company.com', 'rahasia123');
    expect(result.reason).toBe('not_configured');
    expect(result.error).toMatch(/konfigurasi Supabase/i);
  });

  it('builds a dedicated recovery redirect, separate from OAuth callback', () => {
    expect(passwordRecoveryRedirectUrl()).toBe('gitscope://auth/update-password');
  });

  it('sends reset and resend requests through Supabase Auth', async () => {
    const supabase = await authStub();
    supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });
    supabase.auth.resend.mockResolvedValueOnce({ data: {}, error: null });

    await expect(resetPasswordForEmail('rina@company.com')).resolves.toEqual({ error: null });
    await expect(resendSignupConfirmation('rina@company.com')).resolves.toEqual({ error: null });

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'rina@company.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('auth/update-password') }),
    );
    expect(supabase.auth.resend).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'signup', email: 'rina@company.com' }),
    );
  });
});

describe('password recovery', () => {
  beforeEach(() => {
    resetOAuthExchangeCache();
  });
  afterEach(() => jest.clearAllMocks());

  it('recognises the custom-scheme recovery deep link without type=recovery', () => {
    expect(isPasswordRecoveryUrl('gitscope://auth/update-password?code=abc')).toBe(true);
    expect(isPasswordRecoveryUrl('https://app.example.com/auth/update-password?code=abc')).toBe(true);
    expect(isPasswordRecoveryUrl('gitscope://auth/callback?code=abc')).toBe(false);
  });

  it('maps expired and reused links to the same safe message', () => {
    const expired = friendlyRecoveryError('Email link is invalid or has expired');
    const reused = friendlyRecoveryError('invalid flow state, code already used');
    expect(expired.reason).toBe('link_expired');
    expect(reused.reason).toBe('link_expired');
    expect(expired.message).toBe(reused.message);
    expect(expired.message).toMatch(/kedaluwarsa atau pernah dipakai/i);
  });

  it('maps a missing recovery session without leaking token details', () => {
    const mapped = friendlyRecoveryError('Auth session missing!');
    expect(mapped.reason).toBe('session_expired');
    expect(mapped.message).toMatch(/Sesi reset tidak valid/);
    expect(mapped.message).not.toMatch(/eyJ|access_token|refresh_token/i);
  });

  it('exchanges a PKCE recovery code through the existing OAuth callback helper', async () => {
    const supabase = await authStub();
    supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: null });

    await expect(
      completePasswordRecoveryFromUrl('gitscope://auth/update-password?code=recovery-code'),
    ).resolves.toEqual({ error: null });
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('recovery-code', undefined);
  });

  it('rejects a recovery deep link without a token', async () => {
    const result = await completePasswordRecoveryFromUrl(
      'gitscope://auth/update-password?type=recovery',
    );
    expect(result.error).toMatch(/tidak valid atau tidak membawa token/i);
  });

  it('returns the Supabase update error instead of success', async () => {
    const supabase = await authStub();
    supabase.auth.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Auth session missing!', code: 'session_not_found' },
    });

    await expect(updatePassword('rahasia-baru-123')).resolves.toEqual({
      error: 'Sesi reset tidak valid atau sudah berakhir. Minta tautan reset baru.',
      reason: 'session_expired',
    });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'rahasia-baru-123' });
  });

  it('updates the password through Supabase Auth', async () => {
    const supabase = await authStub();
    supabase.auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(updatePassword('rahasia-baru-123')).resolves.toEqual({ error: null });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'rahasia-baru-123' });
  });
});
