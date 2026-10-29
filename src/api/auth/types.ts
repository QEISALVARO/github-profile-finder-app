// ---------------------------------------------------------------------------
// FE-2 — auth domain types (PRD v2 §6).
//
// The shape mirrors the DB session so the `api` adapter only swaps the source;
// FE-8's `useAuthStore` stays the single owner of session state.
// ---------------------------------------------------------------------------

import type { AuthSession } from '@/store/useAuthStore';

export type { AuthSession };

export interface AuthAdapter {
  getSession(): Promise<AuthSession | null>;
  /** Mock mode creates a local demo session; api mode runs GitHub OAuth. */
  signInWithGitHub(): Promise<AuthSession>;
  signOut(): Promise<void>;
  /** PRD v2 §6 `delete-account`: removes the account, then the local session. */
  deleteAccount(): Promise<void>;
}
