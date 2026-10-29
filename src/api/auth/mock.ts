// ---------------------------------------------------------------------------
// FE-2 — mock auth adapter: a thin wrapper over `useAuthStore`.
//
// FE-8 owns the session and its POL-* guards; nothing here re-implements or
// bypasses them — the adapter only exposes the data-layer interface.
// ---------------------------------------------------------------------------

import { useAuthStore, type AuthSession } from '@/store/useAuthStore';

import type { AuthAdapter } from './types';

export const authMock: AuthAdapter = {
  async getSession(): Promise<AuthSession | null> {
    return useAuthStore.getState().session;
  },

  async signInWithGitHub(): Promise<AuthSession> {
    const existing = useAuthStore.getState().session;
    if (existing) return existing;

    // Same demo session Welcome creates today (R1 is UI-only).
    const session: AuthSession = {
      login: 'octocat',
      name: 'Octo Cat',
      avatarUrl: 'https://github.com/octocat.png?size=128',
      githubId: 583231,
      bio: null,
      locationText: null,
    };
    useAuthStore.getState().signIn(session);
    return session;
  },

  async signOut(): Promise<void> {
    useAuthStore.getState().signOut();
  },
};
