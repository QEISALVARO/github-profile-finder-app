// ---------------------------------------------------------------------------
// FE-2 — auth hooks over the auth adapter.
//
// Route guarding in `src/app/_layout.tsx` keeps reading `useAuthStore` (FE-8
// owns session state); these hooks are the data-layer entry points for screens
// that sign in, sign up, reset a password or delete the account.
// ---------------------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getAuthAdapter,
  type AuthSession,
  type EmailActionResult,
  type EmailSignInResult,
  type EmailSignUpResult,
  type PasswordUpdateResult,
} from '@/api/auth';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/store/useAuthStore';

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session(),
    queryFn: (): Promise<AuthSession | null> => getAuthAdapter().getSession(),
    staleTime: Infinity,
  });
}

/** FE-8 keeps the same UX; the adapter only swaps local demo ↔ GitHub OAuth. */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (): Promise<AuthSession> => getAuthAdapter().signInWithGitHub(),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.session(), session);
    },
  });
}

export function useSignUpWithEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { email: string; password: string }): Promise<EmailSignUpResult> =>
      getAuthAdapter().signUpWithEmail(input.email, input.password),
    onSuccess: (result) => {
      if (result.error) return;
      const session = useAuthStore.getState().session;
      if (session) queryClient.setQueryData(queryKeys.session(), session);
    },
  });
}

export function useSignInWithEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { email: string; password: string }): Promise<EmailSignInResult> =>
      getAuthAdapter().signInWithEmail(input.email, input.password),
    onSuccess: (result) => {
      if (result.session) queryClient.setQueryData(queryKeys.session(), result.session);
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (email: string): Promise<EmailActionResult> =>
      getAuthAdapter().resetPasswordForEmail(email),
  });
}

export function useResendSignupConfirmation() {
  return useMutation({
    mutationFn: (email: string): Promise<EmailActionResult> =>
      getAuthAdapter().resendSignupConfirmation(email),
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (password: string): Promise<PasswordUpdateResult> =>
      getAuthAdapter().updatePassword(password),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (): Promise<void> => getAuthAdapter().signOut(),
    onSuccess: () => {
      queryClient.clear();
      useAuthStore.getState().signOut();
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (): Promise<void> => getAuthAdapter().deleteAccount(),
    onSuccess: () => {
      queryClient.clear();
      useAuthStore.getState().deleteAccount();
    },
  });
}
