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

/**
 * Kenapa login gagal — menentukan fallback yang aman di layar Welcome.
 * `github_client_id` dipakai saat GitHub sendiri tidak mengenali Client ID
 * (halaman 404 "Didn't find anything here!") — beda kelas dari `oauth_failed`
 * biasa karena yang salah adalah setelan GitHub OAuth App, bukan sesi user.
 */
export type OAuthFailureReason =
  | 'not_configured'
  | 'cancelled'
  | 'oauth_failed'
  | 'github_client_id';

export interface OAuthResult {
  error: string | null;
  /** true bila user sendiri menutup browser OAuth (bukan kegagalan teknis). */
  cancelled?: boolean;
  /** `not_configured` = build ini tidak membawa env Supabase / flag `api`. */
  reason?: OAuthFailureReason;
}

/**
 * Tiga kesalahan setelan OAuth yang paling sering tertukar, dengan pesan yang
 * menyebut menu persisnya. Dipakai `friendlyAuthError`, probe authorize, dan
 * `docs/auth-github-oauth.md` (troubleshooting) supaya tidak saling menyimpang.
 */
export const AUTH_SETUP_MESSAGES = {
  /** GitHub membalas 404: Client ID tidak dikenal (klasik: Client ID GitHub App). */
  githubClientId:
    'GitHub tidak mengenali Client ID ini (halaman 404 "Didn\u2019t find anything here!"). ' +
    'Isi Supabase → Authentication → Providers → GitHub dengan Client ID dari tab "OAuth Apps" ' +
    '(bukan "GitHub Apps"), dari app yang sama dengan secret-nya.',
  /** Authorization callback URL di GitHub OAuth App bukan ke Supabase. */
  githubCallbackUrl:
    'Authorization callback URL di GitHub OAuth App tidak cocok. Isinya harus ' +
    'https://<PROJECT_REF>.supabase.co/auth/v1/callback — bukan gitscope://auth/callback.',
  /** redirect_to app belum masuk allowlist Supabase. */
  supabaseRedirectUrl:
    'Redirect URL belum diizinkan di Supabase. Tambahkan gitscope://auth/callback di ' +
    'Authentication → URL Configuration → Redirect URLs.',
  /** Browser ditutup tanpa membawa code — penyebabnya tidak terbaca dari app. */
  closedWithoutResult:
    'Login belum selesai: browser ditutup sebelum hasil masuk ke aplikasi. ' +
    'Bila tadi muncul halaman 404 GitHub, Client ID di Supabase bukan dari "OAuth Apps"; ' +
    'bila GitHub menolak callback, Authorization callback URL harus ' +
    'https://<PROJECT_REF>.supabase.co/auth/v1/callback.',
  /** Menautkan akun Google ke GitHub butuh opsi ini di project Supabase. */
  manualLinking:
    'Penautan akun belum aktif di Supabase. Aktifkan Authentication → Providers → ' +
    '"Allow manual linking" (lokal: `enable_manual_linking = true` di supabase/config.toml).',
} as const;

/** Bentuk sesi yang dipakai `useAuthStore` (tidak berubah sejak R1). */
export type SupabaseAuthSession = {
  login: string;
  name: string;
  avatarUrl: string;
  githubId: number;
  bio: string | null;
  locationText: string | null;
  /** Metode login: GitHub langsung, atau Google (GitHub ditautkan setelahnya). */
  provider?: 'github' | 'google';
};

type SessionLike = {
  user: {
    id: number | string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };
};

/**
 * Supabase session → store session.
 *
 * - GitHub (atau Google yang sudah menautkan GitHub): `githubId > 0`, profil
 *   bisa langsung dipakai.
 * - Google tanpa GitHub: sesi tetap dikembalikan dengan `githubId: 0` supaya
 *   root layout bisa menahan user di gerbang "Hubungkan GitHub".
 * - Sesi lain (mis. email lama): `null`.
 */
export function mapSupabaseSession(session: SessionLike): SupabaseAuthSession | null {
  const meta = session.user.user_metadata ?? {};
  const appMeta = session.user.app_metadata ?? {};
  const isGoogle = appMeta.provider === 'google';

  const githubLogin =
    typeof meta.user_name === 'string' && meta.user_name.length > 0
      ? meta.user_name
      : typeof meta.preferred_username === 'string' && meta.preferred_username.length > 0
        ? meta.preferred_username
        : null;

  // `gitscope_github` + `github_login` di metadata ditulis setelah penautan
  // berhasil (lihat finalizeGitHubLink), supaya cold start tahu GitHub sudah
  // terhubung. Profil di database tetap sumber otoritatif untuk backend.
  const githubLinked =
    !isGoogle || meta.gitscope_github === true || typeof meta.github_id === 'string';

  if (githubLogin && githubLinked) {
    const githubIdSource =
      typeof meta.github_id === 'string' ? meta.github_id : meta.provider_id;
    const githubId = typeof githubIdSource === 'string' ? Number(githubIdSource) : NaN;
    return {
      login: githubLogin,
      name:
        typeof meta.full_name === 'string' && meta.full_name.length > 0
          ? meta.full_name
          : githubLogin,
      avatarUrl:
        typeof meta.avatar_url === 'string' && meta.avatar_url.length > 0
          ? meta.avatar_url
          : `https://github.com/${githubLogin}.png?size=128`,
      githubId: Number.isFinite(githubId) ? githubId : 0,
      bio: typeof meta.bio === 'string' ? meta.bio : null,
      locationText: null,
      provider: isGoogle ? 'google' : 'github',
    };
  }

  if (!isGoogle) return null;

  // Akun Google sebelum penautan. Email hanya dipakai sebagai label lokal
  // (bukan dikirim ke database — POL-2).
  const email = typeof session.user.email === 'string' ? session.user.email : null;
  const localPart = email ? email.split('@')[0] : '';
  const login = localPart.length > 0 ? localPart : 'user';
  const name =
    (typeof meta.full_name === 'string' && meta.full_name.length > 0 && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name.length > 0 && meta.name) ||
    login;
  const avatarUrl =
    typeof meta.avatar_url === 'string'
      ? meta.avatar_url
      : typeof meta.picture === 'string'
        ? meta.picture
        : '';

  return {
    login,
    name,
    avatarUrl,
    githubId: 0,
    bio: typeof meta.bio === 'string' ? meta.bio : null,
    locationText: null,
    provider: 'google',
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
  // GitHub menolak karena callback OAuth App tidak sama dengan callback Supabase.
  if (lower.includes('mismatch') || lower.includes('must match') || lower.includes('does not match')) {
    return AUTH_SETUP_MESSAGES.githubCallbackUrl;
  }
  // Client ID tidak dikenal GitHub / Client ID dari tab "GitHub Apps".
  if (
    lower.includes('invalid_client') ||
    lower.includes('client_id') ||
    lower.includes('client id') ||
    lower.includes('404')
  ) {
    return AUTH_SETUP_MESSAGES.githubClientId;
  }
  // Supabase menolak redirect_to karena belum ada di allowlist aplikasi.
  if (lower.includes('redirect') && (lower.includes('not allowed') || lower.includes('invalid'))) {
    return AUTH_SETUP_MESSAGES.supabaseRedirectUrl;
  }
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return lower.includes('google')
      ? 'Provider Google belum diaktifkan di project Supabase.'
      : 'Provider GitHub belum diaktifkan di project Supabase.';
  }
  if (lower.includes('manual linking')) {
    return AUTH_SETUP_MESSAGES.manualLinking;
  }
  if (lower.includes('identity is already linked') || lower.includes('already linked')) {
    return 'Akun GitHub ini sudah tertaut ke akun Gitscope lain. Masuk dengan GitHub langsung, atau tautkan akun GitHub yang berbeda.';
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

// ---------------------------------------------------------------------------
// Probe authorize URL
//
// 404 GitHub terjadi SEBELUM app menerima apa pun: browser berhenti di
// github.com dan `openAuthSessionAsync` hanya selesai saat user menutup tab,
// tanpa `code`. Satu-satunya cara membedakannya dari "user membatalkan" adalah
// mengikuti URL authorize Supabase sampai ke GitHub lebih dulu dan melihat
// status akhirnya. Best-effort: timeout / jaringan gagal = `unknown`, dan alur
// login tetap berjalan seperti biasa.
// ---------------------------------------------------------------------------

const AUTHORIZE_PROBE_TIMEOUT_MS = 6_000;

export type AuthorizeProbe = 'ok' | 'github_404' | 'unknown';

export async function probeAuthorizeUrl(url: string): Promise<AuthorizeProbe> {
  // Web: CORS memblokir pembacaan respons lintas origin, dan di sana 404
  // memang terlihat langsung oleh user.
  if (Platform.OS === 'web' || typeof fetch !== 'function') return 'unknown';

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<AuthorizeProbe>((resolve) => {
      timer = setTimeout(() => resolve('unknown'), AUTHORIZE_PROBE_TIMEOUT_MS);
    });

    const probe = (async (): Promise<AuthorizeProbe> => {
      const response = await fetch(url, { redirect: 'follow' });
      // Body tidak dipakai; baca habis agar koneksi tidak menggantung.
      await response.text().catch(() => '');
      if (response.status !== 404) return 'ok';
      return 'github_404';
    })();

    return await Promise.race([probe, timeout]);
  } catch {
    return 'unknown';
  } finally {
    if (timer) clearTimeout(timer);
  }
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

    // Jangan buka browser ke halaman 404: beri tahu penyebabnya langsung.
    if ((await probeAuthorizeUrl(data.url)) === 'github_404') {
      return { error: AUTH_SETUP_MESSAGES.githubClientId, reason: 'github_client_id' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) {
      // App masih hidup: tukar code langsung di sini. Route /auth/callback
      // memakai helper + cache yang sama bila app sempat di-kill.
      return completeOAuthFromUrl(result.url);
    }
    if (result.type === 'cancel' || result.type === 'dismiss') {
      // Di Android tab yang ditutup juga melaporkan `cancel`, jadi hasil ini
      // tidak membedakan "user berubah pikiran" dari "berhenti di 404/error
      // GitHub". Pesannya karena itu menyebut kedua kemungkinan.
      return { error: AUTH_SETUP_MESSAGES.closedWithoutResult, cancelled: true, reason: 'cancelled' };
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

/**
 * Login Google (alternatif). GitHub tetap wajib ditautkan sebelum onboarding —
 * lihat `linkGitHubIdentity`.
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  try {
    const supabase = await getSupabase();
    const redirectTo = Platform.OS === 'web' ? window.location.origin : authCallbackUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      return {
        error: friendlyAuthError(error?.message ?? 'Gagal membuka login Google. Coba lagi.'),
        reason: 'oauth_failed',
      };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) {
      return completeOAuthFromUrl(result.url);
    }
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { error: AUTH_SETUP_MESSAGES.closedWithoutResult, cancelled: true, reason: 'cancelled' };
    }
    return { error: 'Login Google gagal. Coba lagi.', reason: 'oauth_failed' };
  } catch (error) {
    return {
      error: toAuthError(error),
      reason: error instanceof MissingEnvironmentError ? 'not_configured' : 'oauth_failed',
    };
  }
}

// ---------------------------------------------------------------------------
// Penautan GitHub (akun Google → GitHub)
//
// `linkIdentity` menambah identitas GitHub ke user yang sedang login (butuh
// "Allow manual linking" di Supabase). Setelah code ditukar, identitas GitHub
// yang sudah diverifikasi server disalin ke profiles lewat RPC — klien tidak
// pernah mengirim login/github_id sendiri.
// ---------------------------------------------------------------------------

export type GitHubIdentity = {
  login: string;
  githubId: number;
  name: string | null;
  avatarUrl: string | null;
};

export interface GitHubLinkResult extends OAuthResult {
  identity?: GitHubIdentity;
}

/** Identitas GitHub yang sudah tertaut ke sesi aktif (dari Supabase). */
async function readLinkedGitHubIdentity(): Promise<GitHubIdentity | null> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getUser();
  const identity = data.user?.identities?.find((item) => item.provider === 'github');
  if (!identity) return null;

  const raw = (identity.identity_data ?? {}) as Record<string, unknown>;
  const login =
    typeof raw.user_name === 'string'
      ? raw.user_name
      : typeof raw.preferred_username === 'string'
        ? raw.preferred_username
        : null;
  const githubId = typeof raw.provider_id === 'string' ? Number(raw.provider_id) : NaN;
  if (!login || !Number.isFinite(githubId)) return null;

  return {
    login,
    githubId,
    name: typeof raw.full_name === 'string' ? raw.full_name : null,
    avatarUrl: typeof raw.avatar_url === 'string' ? raw.avatar_url : null,
  };
}

/** Simpan identitas GitHub ke profil + metadata sesi (untuk cold start). */
async function finalizeGitHubLink(identity: GitHubIdentity): Promise<GitHubLinkResult> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('connect_github_identity');
  if (error) {
    return {
      error: friendlyAuthError(error.message),
      reason: 'oauth_failed',
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { login?: unknown; github_id?: unknown; name?: unknown; avatar_url?: unknown }
    | null;
  const login = typeof row?.login === 'string' ? row.login : identity.login;
  const githubId = Number(row?.github_id ?? identity.githubId);

  // Profil di database sudah benar; metadata hanya cache lokal agar gerbang
  // "Hubungkan GitHub" tidak muncul lagi saat cold start.
  await supabase.auth.updateUser({
    data: { gitscope_github: true, github_id: String(githubId), user_name: login },
  });

  return {
    error: null,
    identity: {
      login,
      githubId,
      name: (typeof row?.name === 'string' && row.name) || identity.name,
      avatarUrl: (typeof row?.avatar_url === 'string' && row.avatar_url) || identity.avatarUrl,
    },
  };
}

/**
 * Hubungkan akun GitHub ke sesi Google yang aktif. Dipanggil dari layar
 * `connect-github` sebelum onboarding.
 */
export async function linkGitHubIdentity(): Promise<GitHubLinkResult> {
  try {
    const supabase = await getSupabase();

    // Sudah tertaut (mis. tautan berhasil tetapi app ditutup sebelum profil
    // tersimpan) → cukup finalisasi tanpa membuka browser lagi.
    const existing = await readLinkedGitHubIdentity();
    if (existing) return finalizeGitHubLink(existing);

    const redirectTo = Platform.OS === 'web' ? window.location.origin : authCallbackUrl();
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'github',
      options: {
        redirectTo,
        scopes: 'read:user',
        skipBrowserRedirect: true,
      },
    });
    if (error || !data?.url) {
      return {
        error: friendlyAuthError(error?.message ?? 'Gagal membuka penautan GitHub. Coba lagi.'),
        reason: 'oauth_failed',
      };
    }

    if ((await probeAuthorizeUrl(data.url)) === 'github_404') {
      return { error: AUTH_SETUP_MESSAGES.githubClientId, reason: 'github_client_id' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) {
      const exchanged = await completeOAuthFromUrl(result.url);
      if (exchanged.error) return exchanged;

      const identity = await readLinkedGitHubIdentity();
      if (!identity) {
        return { error: 'Akun GitHub belum tertaut. Coba lagi.', reason: 'oauth_failed' };
      }
      return finalizeGitHubLink(identity);
    }
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { error: AUTH_SETUP_MESSAGES.closedWithoutResult, cancelled: true, reason: 'cancelled' };
    }
    return { error: 'Penautan GitHub gagal. Coba lagi.', reason: 'oauth_failed' };
  } catch (error) {
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
