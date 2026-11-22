// ---------------------------------------------------------------------------
// FE-2 — auth `api` adapter: wraps `lib/auth.ts` (GitHub/Google OAuth and
// email/password via Supabase) and `lib/profile.ts` (RPC onboarding/settings,
// called by the screens).
//
// The existing api behaviour is unchanged: OAuth opens the browser, the
// Supabase session is mapped into `useAuthStore`, and failures surface as a
// readable AppError instead of a crash. Email signup/signin never create a
// local demo session — if the backend is missing, the error is returned.
// ---------------------------------------------------------------------------

import {
  deleteAccountRemote,
  getSessionRemote,
  resetPasswordForEmail as resetPasswordRemote,
  updatePassword as updatePasswordRemote,
  resendSignupConfirmation as resendConfirmationRemote,
  signInWithEmail as signInWithEmailRemote,
  signInWithGitHub as signInWithGitHubRemote,
  signOutRemote,
  signUpWithEmail as signUpWithEmailRemote,
} from '@/lib/auth';
import { useAuthStore, type AuthSession } from '@/store/useAuthStore';

import type {
  AuthAdapter,
  EmailActionResult,
  EmailSignInResult,
  EmailSignUpResult,
  PasswordUpdateResult,
} from './types';

function toAuthSession(session: {
  login: string;
  name: string;
  avatarUrl: string;
  githubId: number;
  bio: string | null;
  locationText: string | null;
  provider?: 'github' | 'google' | 'email';
  email?: string | null;
}): AuthSession {
  return session;
}

function persist(session: AuthSession): AuthSession {
  useAuthStore.getState().signIn(session);
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

  async signUpWithEmail(email: string, password: string): Promise<EmailSignUpResult> {
    const result = await signUpWithEmailRemote(email, password);
    const needsEmailConfirmation = result.needsEmailConfirmation ?? false;

    // Bila konfirmasi email dimatikan, Supabase langsung membuat sesi. Simpan
    // sesi itu supaya onboarding tidak jatuh kembali ke Welcome.
    if (!result.error && !needsEmailConfirmation) {
      const remote = await getSessionRemote();
      if (remote) persist(toAuthSession(remote));
    }

    return {
      error: result.error,
      needsEmailConfirmation,
      reason: result.reason,
    };
  },

  async signInWithEmail(email: string, password: string): Promise<EmailSignInResult> {
    const result = await signInWithEmailRemote(email, password);
    if (result.error) {
      return { error: result.error, session: null, reason: result.reason };
    }

    const remote = await getSessionRemote();
    if (!remote) {
      return {
        error: 'Login berhasil tetapi sesi Supabase tidak terbaca. Coba lagi.',
        session: null,
        reason: 'failed',
      };
    }

    return { error: null, session: persist(toAuthSession(remote)) };
  },

  async resetPasswordForEmail(email: string): Promise<EmailActionResult> {
    const result = await resetPasswordRemote(email);
    return { error: result.error, reason: result.reason };
  },

  async resendSignupConfirmation(email: string): Promise<EmailActionResult> {
    const result = await resendConfirmationRemote(email);
    return { error: result.error, reason: result.reason };
  },

  async updatePassword(password: string): Promise<PasswordUpdateResult> {
    return updatePasswordRemote(password);
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
