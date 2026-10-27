import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSyncSupabaseSession } from '@/providers/useSyncSupabaseSession';

// ---------------------------------------------------------------------------
// PRD v2 K7 — TanStack Query provider. Satu-satunya cache server-state FE;
// Zustand tetap untuk UI-state lokal. Refetch on app-focus meniru perilaku
// web (stale-while-revalidate) tanpa polling.
// ---------------------------------------------------------------------------

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function onAppStateChange(status: AppStateStatus) {
  if (status === 'active') focusManager.setFocused(true);
  else focusManager.setFocused(false);
}

/** Bungkus RootNavigatorSlot: QueryProvider + sinkron sesi Supabase → store. */
export function DataProvider({ children }: { children: ReactNode }) {
  useSyncSupabaseSession();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
