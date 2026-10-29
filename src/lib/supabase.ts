// ---------------------------------------------------------------------------
// FE-2 — lazy Supabase client.
//
// References (Expo SDK 57 + Supabase docs, fetched 27 Okt 2026):
//   https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
//   https://docs.expo.dev/guides/using-supabase/
//
// Rules honoured here:
//  - The client is created **lazily**, and only when both env vars exist and
//    at least one domain flag asks for the `api` adapter.
//  - Empty env never throws at import time — `getSupabase()` rejects with a
//    readable `MissingEnvironmentError` instead.
//  - Session storage uses AsyncStorage (already a dependency) with
//    `persistSession`, per the React Native guidance. `detectSessionInUrl` is
//    off because there is no browser URL on native.
//  - `react-native-url-polyfill` is installed on native only: on web it
//    conflicts with the platform `URL` implementation.
// ---------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { MissingEnvironmentError } from '@/api/errors';
import { getDataSource } from '@/config/dataSource';

if (Platform.OS !== 'web') {
  // Side-effect import: patches global URL/URLSearchParams for React Native.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-url-polyfill/auto');
}

/** Static reads so Metro can inline them (see src/config/dataSource.ts). */
function readSupabaseEnv(): { url: string | undefined; anonKey: string | undefined } {
  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
}

const DOMAINS_USING_API = ['auth', 'feed', 'analysis', 'talent', 'chat', 'reports'] as const;

export function missingSupabaseEnv(): string[] {
  const env = readSupabaseEnv();
  const missing: string[] = [];
  if (!env.url) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!env.anonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return missing;
}

/** True when at least one domain is switched to the `api` adapter. */
export function anyApiDomainEnabled(): boolean {
  return DOMAINS_USING_API.some((domain) => getDataSource(domain) === 'api');
}

type SupabaseClient = import('@supabase/supabase-js').SupabaseClient;

let client: SupabaseClient | null = null;

/**
 * Create (once) and return the Supabase client, or reject with a readable
 * error when the environment/flag is not ready. Callers only reach this from
 * the `api` adapters, so mock mode never touches the network.
 */
export async function getSupabase(): Promise<SupabaseClient> {
  if (client) return client;

  const missing = missingSupabaseEnv();
  if (missing.length > 0) throw new MissingEnvironmentError(missing);
  if (!anyApiDomainEnabled()) throw new MissingEnvironmentError(['EXPO_PUBLIC_DS_* = api']);

  const { createClient } = await import('@supabase/supabase-js');
  const env = readSupabaseEnv();

  client = createClient(env.url as string, env.anonKey as string, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}

/** Test seam: drop the cached client so each test starts clean. */
export function resetSupabaseClient(): void {
  client = null;
}
