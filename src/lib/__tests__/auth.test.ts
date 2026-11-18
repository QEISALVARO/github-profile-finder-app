import { MissingEnvironmentError } from '@/api/errors';
import {
  completeOAuthFromUrl,
  completeOAuthWithCode,
  isOAuthCallbackUrl,
  resetOAuthExchangeCache,
  signInWithGitHub,
} from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

// Jest tidak memuat manifest expo-constants, jadi `makeRedirectUri` asli
// melempar error sebelum skenario OAuth diuji. Deep link-nya sendiri sudah
// didaftarkan di app.json (`scheme: "gitscope"`).
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'gitscope://auth/callback'),
}));

type AuthStub = {
  auth: {
    signInWithOAuth: jest.Mock;
    exchangeCodeForSession: jest.Mock;
    setSession: jest.Mock;
  };
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
  afterEach(() => {
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

  it('detects whether a deep link carries OAuth data', () => {
    expect(isOAuthCallbackUrl('gitscope://auth/callback?code=abc')).toBe(true);
    expect(isOAuthCallbackUrl('gitscope://auth/callback?error=access_denied')).toBe(true);
    expect(isOAuthCallbackUrl('gitscope://auth/callback')).toBe(false);
    expect(isOAuthCallbackUrl('gitscope://')).toBe(false);
  });
});
