// ---------------------------------------------------------------------------
// FE-2 — auth hooks over the auth adapter.
//
// Route guarding in `src/app/_layout.tsx` keeps reading `useAuthStore` (FE-8
// owns session state); these hooks are the data-layer entry points for screens
// that sign in, sign out or delete the account.
// ---------------------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAuthAdapter, type AuthSession } from '@/api/auth';
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
