// ---------------------------------------------------------------------------
// FE-2 — session hook over the auth adapter.
//
// Note: route guarding in `src/app/_layout.tsx` keeps reading `useAuthStore`
// directly (FE-8 owns session state); this hook is the data-layer entry point
// for screens that only need "who is signed in".
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query';

import { getAuthAdapter, type AuthSession } from '@/api/auth';

export const AUTH_QUERY_KEY = 'auth';

export function useSession() {
  return useQuery({
    queryKey: [AUTH_QUERY_KEY, 'session'],
    queryFn: (): Promise<AuthSession | null> => getAuthAdapter().getSession(),
    staleTime: Infinity,
  });
}
