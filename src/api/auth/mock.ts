// ---------------------------------------------------------------------------
// FE-2 — mock auth adapter: a thin wrapper over `useAuthStore`.
//
// FE-8 owns the session and its POL-* guards; nothing here re-implements or
// bypasses them — the adapter only exposes the data-layer interface.
//
// Email/password in mock mode is a DEV-ONLY convenience: it creates a local
// session with `githubId: 0` and `provider: 'email'`, never a GitHub identity.
// Production builds never reach this adapter (see `src/config/dataSource.ts`).
// Reset/konfirmasi butuh backend sungguhan, jadi mock mengembalikan error jelas.
// ---------------------------------------------------------------------------

import { useAuthStore, type AuthSession } from '@/store/useAuthStore';

import type {
  AuthAdapter,
  EmailActionResult,
  EmailSignInResult,
  EmailSignUpResult,
  PasswordUpdateResult,
} from './types';

const MOCK_BACKEND_MESSAGE =
  'Fitur ini membutuhkan backend Supabase aktif (EXPO_PUBLIC_DS_AUTH=api).';

function emailSession(email: string): AuthSession {
  const normalized = email.trim().toLowerCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  const suffix = hash.toString(16).padStart(6, '0').slice(0, 6);
  const localPart = normalized.split('@')[0] ?? 'user';

  return {
    login: `user-${suffix}`,
    name: localPart.length > 0 ? localPart : 'Akun email',
    avatarUrl: '',
    // Tidak ada identitas GitHub pada akun email.
    githubId: 0,
    bio: null,
    locationText: null,
    provider: 'email',
    email: normalized,
  };
}

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
      provider: 'github',
    };
    useAuthStore.getState().signIn(session);
    return session;
  },

  async signUpWithEmail(email: string): Promise<EmailSignUpResult> {
    // Mock tidak punya backend konfirmasi: sesi lokal langsung dibuat.
    const session = emailSession(email);
    useAuthStore.getState().signIn(session);
    return { error: null, needsEmailConfirmation: false };
  },

  async signInWithEmail(email: string): Promise<EmailSignInResult> {
    const session = emailSession(email);
    useAuthStore.getState().signIn(session);
    return { error: null, session };
  },

  async resetPasswordForEmail(): Promise<EmailActionResult> {
    return { error: MOCK_BACKEND_MESSAGE, reason: 'not_configured' };
  },

  async resendSignupConfirmation(): Promise<EmailActionResult> {
    return { error: MOCK_BACKEND_MESSAGE, reason: 'not_configured' };
  },

  async updatePassword(): Promise<PasswordUpdateResult> {
    return { error: MOCK_BACKEND_MESSAGE, reason: 'not_configured' };
  },

  async signOut(): Promise<void> {
    useAuthStore.getState().signOut();
  },

  // Mock delete: the demo account has no server row, so clearing the session is
  // the whole operation. No fake network call, no fake success payload.
  async deleteAccount(): Promise<void> {
    useAuthStore.getState().deleteAccount();
  },
};
