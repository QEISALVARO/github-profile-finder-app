import { useEffect } from 'react';

import { anyApiDomainEnabled, getSupabase } from '@/lib/supabase';
import { mapSupabaseSession } from '@/lib/auth';
import { useAuthStore } from '@/store/useAuthStore';

// ---------------------------------------------------------------------------
// Sinkron sesi Supabase → useAuthStore. Dipanggil sekali dari DataProvider:
// - cold start: baca sesi tersimpan (refresh token otomatis via AsyncStorage)
// - login/logout: onAuthStateChange memetakan user GitHub → AuthSession
//
// FE-2: when every domain is on `mock` the hook does nothing at all, so the
// app runs offline without `EXPO_PUBLIC_SUPABASE_*`.
// ---------------------------------------------------------------------------

export function useSyncSupabaseSession() {
  useEffect(() => {
    if (!anyApiDomainEnabled()) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    void getSupabase()
      .then((supabase) => {
        if (cancelled) return;

        void supabase.auth.getSession().then(({ data }) => {
          if (cancelled || !data.session) return;
          const mapped = mapSupabaseSession(data.session as never);
          if (mapped) useAuthStore.getState().signIn(mapped);
        });

        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!session) {
            const current = useAuthStore.getState().session;
            // Hanya logout remote yang menghapus sesi lokal; signOut manual sudah
            // mengosongkan store duluan.
            if (current && current.githubId === 0) return;
            if (current && current.login !== 'octocat') useAuthStore.getState().signOut();
            return;
          }
          const mapped = mapSupabaseSession(session as never);
          if (mapped) useAuthStore.getState().signIn(mapped);
        });

        unsubscribe = () => data.subscription.unsubscribe();
      })
      .catch(() => {
        // Missing environment in api mode is surfaced by the adapters; the
        // session sync simply stays idle.
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);
}
