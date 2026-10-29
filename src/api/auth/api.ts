// ---------------------------------------------------------------------------
// FE-2 — auth `api` adapter (stub). GitHub OAuth via Supabase lands with R0 /
// FE-8 integration; until then this fails loudly instead of faking a session.
// ---------------------------------------------------------------------------

import { NotImplementedError } from '@/api/errors';

import type { AuthAdapter, AuthSession } from './types';

export const authApi: AuthAdapter = {
  getSession(): Promise<AuthSession | null> {
    throw new NotImplementedError('auth', 'GET /auth/session');
  },
  signInWithGitHub(): Promise<AuthSession> {
    throw new NotImplementedError('auth', 'signInWithOAuth({ provider: "github" })');
  },
  signOut(): Promise<void> {
    throw new NotImplementedError('auth', 'POST /auth/signout');
  },
};
