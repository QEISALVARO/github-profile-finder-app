/**
 * Mock global `@/lib/supabase` untuk Jest.
 *
 * Alasan: `@supabase/supabase-js` membutuhkan WebSocket native (Node 22+),
 * sementara CI memakai Node 20 — mengimpor modul asli saat test membuat
 * suite gagal sebelum satu test pun jalan. Test FE menguji UI/store/adapter,
 * bukan jaringan, jadi client diganti stub yang bentuknya sama.
 *
 * Sejak FE-2 klien dibuat malas (`getSupabase()`), jadi mock ini mengekspor
 * permukaan modul yang sama:
 *  - `getSupabase()` → stub client (`functions.invoke`, `auth.*`, `rpc`, `from`)
 *  - `anyApiDomainEnabled()` → `false` (default: mode mock, tanpa jaringan)
 *  - `missingSupabaseEnv()` / `resetSupabaseClient()` → no-op yang aman
 *
 * Dipakai lewat `jest.mock('@/lib/supabase')` (tanpa factory) di suite yang
 * menyentuh rantai auth/analyze, sehingga tidak ada stub ad-hoc yang saling
 * bertentangan. Suite yang butuh mengatur hasil `invoke` cukup meng-override
 * `getSupabase` itu sendiri.
 */

/** Stub client dengan bentuk sama seperti `SupabaseClient` yang dipakai FE. */
export const supabaseStub = {
  functions: { invoke: jest.fn() },
  auth: {
    signInWithOAuth: jest.fn(),
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    exchangeCodeForSession: jest.fn(),
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    signOut: jest.fn(),
  },
  rpc: jest.fn(async () => ({ data: null, error: null })),
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => ({ data: null, error: null })),
    single: jest.fn(async () => ({ data: null, error: null })),
  })),
};

export const getSupabase = jest.fn(async () => supabaseStub);

export const anyApiDomainEnabled = jest.fn(() => false);

export const missingSupabaseEnv = jest.fn((): string[] => []);

export const resetSupabaseClient = jest.fn(() => {});
