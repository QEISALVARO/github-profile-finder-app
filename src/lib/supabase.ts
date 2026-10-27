import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Supabase client (PRD v2 K1, K7) — satu-satunya jalur FE ke backend.
// Client memakai anon key (aman di bawah RLS); service role key TIDAK PERNAH
// ada di bundle (dijaga CI backend.yml + secret scan).
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

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  supabaseAnonKey ?? 'missing-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-client-info': 'gitscope-expo' },
    },
  },
);
