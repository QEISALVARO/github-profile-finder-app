import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Supabase client (PRD v2 K1, K7) — satu-satunya jalur FE ke backend.
// Client memakai anon key (aman di bawah RLS); service role key TIDAK PERNAH
// ada di bundle (dijaga CI backend.yml + secret scan).
//
// Web SSR/static-render: modul ini boleh diimpor saat prerender Node, tapi
// TIDAK BOLEH menyentuh `window`/AsyncStorage saat itu. Storage dipilih
// malas (lazy): di web memakai adapter memori, di native AsyncStorage.
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

if (!isTestEnv && (!supabaseUrl || !supabaseAnonKey)) {
  // Gagal cepat saat dev agar misconfig env ketahuan sebelum runtime aneh.
  // Di production build tanpa env, error ini muncul di log Metro/EAS.
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY belum diset. ' +
      'Salin .env.example ke .env dan isi nilainya.',
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

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  supabaseAnonKey ?? 'missing-anon-key',
  {
    auth: {
      storage: selectStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-client-info': 'gitscope-expo' },
    },
  },
);
