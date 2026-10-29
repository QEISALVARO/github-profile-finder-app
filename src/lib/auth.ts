import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// PRD v2 K2 — GitHub OAuth via Supabase (scope minimal `read:user`, tanpa
// email — POL-2). Alur: signInWithOAuth → browser → deep link kembali ke app.
//
// The Supabase client is created lazily (`lib/supabase.ts`), so importing this
// module never touches the network or the environment in mock mode.
// ---------------------------------------------------------------------------

WebBrowser.maybeCompleteAuthSession();

const AUTH_CALLBACK_PATH = 'auth/callback';

/** Deep link yang didaftarkan di app.json scheme + supabase config.toml. */
export function authCallbackUrl(): string {
  return makeRedirectUri({ path: AUTH_CALLBACK_PATH });
}

export interface OAuthResult {
  error: string | null;
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
 * Buka browser OAuth GitHub. Mengembalikan error (string Indonesia) atau null.
 * Sesi Supabase dibuat otomatis dari callback; pendengar onAuthStateChange di
 * providers/useSyncSupabaseSession yang memetakan sesi → useAuthStore.
 */
export async function signInWithGitHub(): Promise<OAuthResult> {
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
    return { error: error?.message ?? 'Gagal membuka login GitHub. Coba lagi.' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'success' && result.url) {
    // Supabase JS v2 menukar code → session otomatis bila detectSessionInUrl;
    // di native, set session dari URL callback secara eksplisit.
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
    if (exchangeError) return { error: exchangeError.message };
    return { error: null };
  }
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { error: 'Login dibatalkan.' };
  }
  return { error: 'Login GitHub gagal. Coba lagi.' };
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
