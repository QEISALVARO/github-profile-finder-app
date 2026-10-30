// ---------------------------------------------------------------------------
// Supabase client (PRD v2 K1, K7) — satu-satunya jalur FE ke backend.
//
// Client memakai anon key (aman di bawah RLS); service role key TIDAK PERNAH
// ada di bundle (dijaga CI backend.yml + secret scan).
//
// FE-2 + main digabung di sini:
//  - Klien dibuat **malas** (lazy) dan hanya bila env lengkap + minimal satu
//    domain berflag `api`. Mode `mock` tidak pernah membuat klien dan tidak
//    crash walau `EXPO_PUBLIC_SUPABASE_*` kosong.
//  - Web SSR/static-render: modul ini boleh diimpor saat prerender Node, tapi
//    TIDAK BOLEH menyentuh `window`/AsyncStorage saat itu. Storage dipilih
//    malas: memori di web/prerender, AsyncStorage di native.
//
// Referensi (Expo SDK 57 + Supabase, 27 Okt 2026):
//   https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
//   https://docs.expo.dev/guides/using-supabase/
// ---------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { MissingEnvironmentError } from '@/api/errors';
import { getDataSource } from '@/config/dataSource';

if (Platform.OS !== 'web') {
  // Side-effect import: patches global URL/URLSearchParams for React Native.
  // Di web dilewati karena bentrok dengan implementasi `URL` platform.
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

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

if (!isTestEnv && anyApiDomainEnabled() && missingSupabaseEnv().length > 0) {
  // Gagal cepat saat dev agar misconfig env ketahuan sebelum runtime aneh.
  // Mode `mock` tidak pernah sampai ke sini, jadi aplikasi offline tetap sunyi.
  console.warn(
    '[supabase] Mode "api" aktif tetapi EXPO_PUBLIC_SUPABASE_URL / ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY belum diset. Salin .env.example ke .env ' +
      'dan isi nilainya (lihat `supabase status`).',
  );
}

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function memoryStorage(): AsyncStorageLike {
  const store = new Map<string, string>();
  return {
    getItem: async (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  };
}

/** Native → AsyncStorage; web/SSR → memori (tanpa `window`). */
function selectStorage(): AsyncStorageLike {
  if (Platform.OS === 'web' || typeof window === 'undefined') return memoryStorage();
  return AsyncStorage;
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
      storage: selectStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-client-info': 'gitscope-expo' },
    },
  });

  return client;
}

/** Test seam: drop the cached client so each test starts clean. */
export function resetSupabaseClient(): void {
  client = null;
}
