import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { MissingEnvironmentError } from '@/api/errors';
import { getSupabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// PRD v2 K2 — GitHub OAuth via Supabase (scope minimal `read:user`, tanpa
// email — POL-2). Alur: signInWithOAuth → browser → deep link kembali ke app
// (`gitscope://auth/callback`) → tukar `code` PKCE menjadi sesi.
//
// The Supabase client is created lazily (`lib/supabase.ts`), so importing this
// module never touches the network or the environment in mock mode.
// ---------------------------------------------------------------------------

WebBrowser.maybeCompleteAuthSession();

const AUTH_CALLBACK_PATH = 'auth/callback';

/**
 * Deep link yang didaftarkan di app.json scheme + Supabase redirect allowlist.
 * `EXPO_PUBLIC_AUTH_REDIRECT_URL` bisa menimpanya (mis. dev build / Expo Go
 * yang memakai URL `exp://`), tanpa mengubah kode.
 */
export function authCallbackUrl(): string {
  const override = (process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL ?? '').trim();
  if (override.length > 0) return override;
  return makeRedirectUri({ path: AUTH_CALLBACK_PATH });
}

/** Kenapa login gagal — menentukan fallback yang aman di layar Welcome. */
export type OAuthFailureReason = 'not_configured' | 'cancelled' | 'oauth_failed';

export interface OAuthResult {
  error: string | null;
  /** true bila user sendiri menutup browser OAuth (bukan kegagalan teknis). */
  cancelled?: boolean;
  /** `not_configured` = build ini tidak membawa env Supabase / flag `api`. */
  reason?: OAuthFailureReason;
}

/** Bentuk sesi yang dipakai `useAuthStore` (tidak berubah sejak R1). */
export type SupabaseAuthSession = {
  login: string;
  name: string;
  avatarUrl: string;
  githubId: number;
  bio: string | null;
  locationText: string | null;
};

type SessionLike = {
  user: {
    id: number | string;
    user_metadata?: Record<string, unknown>;
  };
};

/** Supabase session → store session. `null` when GitHub login is missing. */
export function mapSupabaseSession(session: SessionLike): SupabaseAuthSession | null {
  const meta = session.user.user_metadata ?? {};
  const login =
    typeof meta.user_name === 'string'
      ? meta.user_name
      : typeof meta.preferred_username === 'string'
        ? meta.preferred_username
        : null;
  if (!login) return null;

  const githubId = typeof meta.provider_id === 'string' ? Number(meta.provider_id) : NaN;
  return {
    login,
    name:
      typeof meta.full_name === 'string' && meta.full_name.length > 0
        ? meta.full_name
        : login,
    avatarUrl:
      typeof meta.avatar_url === 'string' && meta.avatar_url.length > 0
        ? meta.avatar_url
        : `https://github.com/${login}.png?size=128`,
    githubId: Number.isFinite(githubId) ? githubId : 0,
    bio: typeof meta.bio === 'string' ? meta.bio : null,
    locationText: null,
  };
}

/**
 * Pesan Supabase diterjemahkan ke kalimat yang bisa ditindaklanjuti. Pesan
 * teknis tetap dipakai bila tidak ada padanan yang lebih jelas.
 */
function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid flow state') || lower.includes('code challenge')) {
    return 'Sesi login kedaluwarsa (code sudah dipakai). Tutup lalu coba login lagi.';
  }
  if (lower.includes('pkce code verifier') || lower.includes('code verifier')) {
    return 'Verifier PKCE tidak ditemukan di perangkat. Coba login ulang dari awal.';
  }
  if (lower.includes('redirect') && (lower.includes('not allowed') || lower.includes('invalid'))) {
    return 'Redirect URL belum diizinkan di Supabase. Tambahkan gitscope://auth/callback di Auth → URL Configuration.';
  }
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return 'Provider GitHub belum diaktifkan di project Supabase.';
  }
  if (
    lower.includes('missing environment') ||
    lower.includes('environment variable') ||
    lower.includes('expo_public_')
  ) {
    return 'Build ini belum membawa konfigurasi Supabase (EXPO_PUBLIC_*). Pakai sesi demo atau build ulang dengan env EAS.';
  }
  return message;
}

function toAuthError(error: unknown): string {
  return friendlyAuthError(
    error instanceof Error && error.message.length > 0
      ? error.message
      : 'Login GitHub gagal. Coba lagi.',
  );
}

// ---------------------------------------------------------------------------
// Callback handling
//
// Satu code OAuth hanya boleh ditukar sekali. Deep link yang sama bisa tiba
// lewat dua jalur: promise `openAuthSessionAsync` (app masih hidup) dan route
// `/auth/callback` (app di-kill saat browser terbuka). Cache + in-flight guard
// membuat kedua jalur berbagi hasil yang sama, bukan menukar dua kali.
// ---------------------------------------------------------------------------

const EXCHANGE_DEDUPE_MS = 60_000;

let lastExchange: { code: string; result: OAuthResult; at: number } | null = null;
const inFlightExchanges = new Map<string, Promise<OAuthResult>>();

/** Test seam: kosongkan cache code yang sudah ditukar. */
export function resetOAuthExchangeCache(): void {
  lastExchange = null;
  inFlightExchanges.clear();
}

/** Apakah URL deep link ini membawa hasil OAuth (code/token/error)? */
export function isOAuthCallbackUrl(url: string): boolean {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  return Boolean(
    params.code ||
      params.access_token ||
      params.error ||
      params.error_description ||
      errorCode,
  );
}

/**
 * Tukar `code` PKCE menjadi sesi Supabase. Idempoten untuk code yang sama
 * selama `EXCHANGE_DEDUPE_MS`.
 */
export async function completeOAuthWithCode(code: string, flowId?: string): Promise<OAuthResult> {
  const cached = lastExchange;
  if (cached && cached.code === code && Date.now() - cached.at < EXCHANGE_DEDUPE_MS) {
    return cached.result;
  }

  const running = inFlightExchanges.get(code);
  if (running) return running;

  const run = (async (): Promise<OAuthResult> => {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      );
      const result: OAuthResult = error
        ? { error: friendlyAuthError(error.message), reason: 'oauth_failed' }
        : { error: null };
      lastExchange = { code, result, at: Date.now() };
      return result;
    } catch (error) {
      const result: OAuthResult = {
        error: toAuthError(error),
        reason: error instanceof MissingEnvironmentError ? 'not_configured' : 'oauth_failed',
      };
      lastExchange = { code, result, at: Date.now() };
      return result;
    } finally {
      inFlightExchanges.delete(code);
    }
  })();

  inFlightExchanges.set(code, run);
  return run;
}

/**
 * Selesaikan login dari URL callback, mendukung dua flow Supabase:
 * - PKCE (default): `?code=...` → `exchangeCodeForSession(code)`
 * - implicit (project lama): `#access_token=...` → `setSession(...)`
 */
export async function completeOAuthFromUrl(url: string): Promise<OAuthResult> {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  const providerError = params.error_description ?? params.error ?? errorCode;
  if (providerError) {
    return { error: friendlyAuthError(providerError), reason: 'oauth_failed' };
  }

  if (params.code) return completeOAuthWithCode(params.code, params.sb_flow_id);

  if (params.access_token) {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token ?? '',
      });
      return error
        ? { error: friendlyAuthError(error.message), reason: 'oauth_failed' }
        : { error: null };
    } catch (error) {
      return {
        error: toAuthError(error),
        reason: error instanceof MissingEnvironmentError ? 'not_configured' : 'oauth_failed',
      };
    }
  }

  return { error: 'Callback GitHub tidak membawa kode login.', reason: 'oauth_failed' };
}

/**
 * Buka browser OAuth GitHub. Mengembalikan error (string Indonesia) atau null.
 * Sesi Supabase dibuat otomatis dari callback; pendengar onAuthStateChange di
 * providers/useSyncSupabaseSession yang memetakan sesi → useAuthStore.
 */
export async function signInWithGitHub(): Promise<OAuthResult> {
  try {
    const supabase = await getSupabase();
    const redirectTo = Platform.OS === 'web' ? window.location.origin : authCallbackUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
        scopes: 'read:user',
        skipBrowserRedirect: true,
      },
    });
    if (error || !data?.url) {
      return {
        error: friendlyAuthError(error?.message ?? 'Gagal membuka login GitHub. Coba lagi.'),
        reason: 'oauth_failed',
      };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) {
      // App masih hidup: tukar code langsung di sini. Route /auth/callback
      // memakai helper + cache yang sama bila app sempat di-kill.
      return completeOAuthFromUrl(result.url);
    }
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { error: 'Login dibatalkan.', cancelled: true, reason: 'cancelled' };
    }
    return { error: 'Login GitHub gagal. Coba lagi.', reason: 'oauth_failed' };
  } catch (error) {
    // Release build tanpa EXPO_PUBLIC_SUPABASE_* / flag `api`: getSupabase
    // melempar MissingEnvironmentError. Jangan biarkan promise rejection
    // menggagalkan handler tombol — kembalikan error yang bisa ditampilkan
    // (Welcome lalu memakai sesi demo lokal).
    return {
      error: toAuthError(error),
      reason: error instanceof MissingEnvironmentError ? 'not_configured' : 'oauth_failed',
    };
  }
}

/** Current Supabase session mapped to the store shape (cold start / guard). */
export async function getSessionRemote(): Promise<SupabaseAuthSession | null> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  return mapSupabaseSession(data.session as never);
}

export async function signOutRemote(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
}

/**
 * PRD v2 §6 — `delete-account` Edge Function: menghapus auth user + data
 * (cascade). Sesi lokal dibersihkan setelah server mengonfirmasi.
 */
export async function deleteAccountRemote(): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  await supabase.auth.signOut();
}
