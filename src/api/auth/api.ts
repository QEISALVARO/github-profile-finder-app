// ---------------------------------------------------------------------------
// FE-2 — auth `api` adapter: wraps `lib/auth.ts` (GitHub OAuth via Supabase)
// and `lib/profile.ts` (RPC onboarding/settings, called by the screens).
//
// The existing api behaviour is unchanged: OAuth opens the browser, the
// Supabase session is mapped into `useAuthStore`, and failures surface as a
// readable AppError instead of a crash.
// ---------------------------------------------------------------------------

import {
  deleteAccountRemote,
  getSessionRemote,
  signInWithGitHub as signInWithGitHubRemote,
  signOutRemote,
} from '@/lib/auth';
import { useAuthStore, type AuthSession } from '@/store/useAuthStore';

import type { AuthAdapter } from './types';

function toAuthSession(session: {
  login: string;
  name: string;
  avatarUrl: string;
  githubId: number;
  bio: string | null;
  locationText: string | null;
}): AuthSession {
  return session;
}

function persist(session: AuthSession): AuthSession {
  const current = useAuthStore.getState().session;
  if (!current || current.login !== session.login) {
    useAuthStore.getState().signIn(session);
  }
  return session;
}

export const authApi: AuthAdapter = {
  async getSession(): Promise<AuthSession | null> {
    const remote = await getSessionRemote();
    if (!remote) return null;
    return persist(toAuthSession(remote));
  },

  async signInWithGitHub(): Promise<AuthSession> {
    const { error } = await signInWithGitHubRemote();
    if (error) {
      throw { code: 'UNAUTHORIZED' as const, message: error, status: 401 };
    }

    const remote = await getSessionRemote();
    if (!remote) {
      throw {
        code: 'UNAUTHORIZED' as const,
        message: 'Login GitHub gagal. Coba lagi.',
        status: 401,
      };
    }
    return persist(toAuthSession(remote));
  },

  async signOut(): Promise<void> {
    await signOutRemote();
    useAuthStore.getState().signOut();
  },

  async deleteAccount(): Promise<void> {
    await deleteAccountRemote();
    useAuthStore.getState().deleteAccount();
  },
};
