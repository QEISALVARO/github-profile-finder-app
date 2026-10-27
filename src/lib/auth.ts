import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// PRD v2 K2 — GitHub OAuth via Supabase (scope minimal `read:user`, tanpa
// email — POL-2). Alur: signInWithOAuth → browser → deep link kembali ke app.
// Welcome screen (mock session) diganti dengan fungsi ini saat backend R0
// hidup; bentuk AuthSession di useAuthStore TIDAK berubah.
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

/**
 * Buka browser OAuth GitHub. Mengembalikan error (string Indonesia) atau null.
 * Sesi Supabase dibuat otomatis dari callback; pendengar onAuthStateChange di
 * providers/QueryProvider yang memetakan sesi → useAuthStore.
 */
export async function signInWithGitHub(): Promise<OAuthResult> {
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

export async function signOutRemote(): Promise<void> {
  await supabase.auth.signOut();
}
