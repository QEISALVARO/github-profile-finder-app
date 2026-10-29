import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// ---------------------------------------------------------------------------
// Sinkron sesi Supabase → useAuthStore. Dipanggil sekali dari DataProvider:
// - cold start: baca sesi tersimpan (refresh token otomatis via AsyncStorage)
// - login/logout: onAuthStateChange memetakan user GitHub → AuthSession
// Bentuk AuthSession TIDAK berubah — UI lama tetap jalan saat offline.
// ---------------------------------------------------------------------------

function mapSession(session: {
  user: {
    id: number | string;
    user_metadata?: Record<string, unknown>;
  };
}): {
  login: string;
  name: string;
  avatarUrl: string;
  githubId: number;
  bio: string | null;
  locationText: string | null;
} | null {
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
    name: typeof meta.full_name === 'string' && meta.full_name.length > 0 ? meta.full_name : login,
    avatarUrl:
      typeof meta.avatar_url === 'string' && meta.avatar_url.length > 0
        ? meta.avatar_url
        : `https://github.com/${login}.png?size=128`,
    githubId: Number.isFinite(githubId) ? githubId : 0,
    bio: typeof meta.bio === 'string' ? meta.bio : null,
    locationText: null,
  };
}

export function useSyncSupabaseSession() {
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return;
      const mapped = mapSession(data.session as never);
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
      const mapped = mapSession(session as never);
      if (mapped) useAuthStore.getState().signIn(mapped);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);
}
