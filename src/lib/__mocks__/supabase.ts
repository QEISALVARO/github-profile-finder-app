/**
 * Mock global `@/lib/supabase` untuk Jest.
 *
 * Alasan: `@supabase/supabase-js` membutuhkan WebSocket native (Node 22+),
 * sementara CI memakai Node 20 — mengimpor modul asli saat test membuat
 * suite gagal sebelum satu test pun jalan. Test FE menguji UI/store, bukan
 * jaringan, jadi client diganti stub yang bentuknya sama.
 *
 * Dipakai otomatis oleh semua suite via `roots` + `setupFiles` di
 * package.json — tidak perlu `jest.mock` per berkas.
 */
export const supabase = {
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
