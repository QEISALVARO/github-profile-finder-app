// ---------------------------------------------------------------------------
// FE-2 — auth domain types (PRD v2 §6).
//
// The shape mirrors the DB session so the `api` adapter only swaps the source;
// FE-8's `useAuthStore` stays the single owner of session state.
// ---------------------------------------------------------------------------

import type { AuthSession } from '@/store/useAuthStore';

import type { PasswordUpdateResult } from '@/lib/auth';

export type { AuthSession };

/** Hasil operasi email yang butuh state khusus di layar (mis. cek inbox). */
export interface EmailSignUpResult {
  error: string | null;
  /** true bila Supabase mengirim tautan konfirmasi dan belum membuat sesi. */
  needsEmailConfirmation: boolean;
  reason?: string;
}

export interface EmailSignInResult {
  error: string | null;
  session: AuthSession | null;
  reason?: string;
}

export interface EmailActionResult {
  error: string | null;
  reason?: string;
}

export type { PasswordUpdateResult };

export interface AuthAdapter {
  getSession(): Promise<AuthSession | null>;
  /** Mock mode creates a local demo session; api mode runs GitHub OAuth. */
  signInWithGitHub(): Promise<AuthSession>;
  /** Email/password — recruiter tanpa akun GitHub (P0). */
  signUpWithEmail(email: string, password: string): Promise<EmailSignUpResult>;
  signInWithEmail(email: string, password: string): Promise<EmailSignInResult>;
  resetPasswordForEmail(email: string): Promise<EmailActionResult>;
  resendSignupConfirmation(email: string): Promise<EmailActionResult>;
  /** Simpan password baru pada sesi recovery yang valid. */
  updatePassword(password: string): Promise<PasswordUpdateResult>;
  signOut(): Promise<void>;
  /** PRD v2 §6 `delete-account`: removes the account, then the local session. */
  deleteAccount(): Promise<void>;
}
