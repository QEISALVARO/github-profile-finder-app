// ---------------------------------------------------------------------------
// FE-2 — analysis hook. Returns an `AnalysisVM` plus the loading / error /
// stale flags the screen renders (skeleton, ErrorState, StaleBanner).
// ---------------------------------------------------------------------------

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  analysisAdapter,
  analysisKey,
  type AnalysisTarget,
  type AnalysisVM,
} from '@/api/analysis';
import { useAppStore } from '@/store/useAppStore';

export const ANALYSIS_QUERY_KEY = 'analysis';

export type AnalysisState = {
  vm: AnalysisVM | null;
  isLoading: boolean;
  error: Error | null;
  /** `source === 'stale'` → render the StaleBanner with a reload action. */
  isStale: boolean;
  staleSince: string | undefined;
  refetch: () => void;
};

export function useAnalysis(target: AnalysisTarget): AnalysisState {
  // /dev fixtures inject a prebuilt VM; normal navigation always goes through
  // the adapter.
  const override = useAppStore((s) => s.analysisOverride);

  const query = useQuery({
    queryKey: [ANALYSIS_QUERY_KEY, analysisKey(target)],
    queryFn: (): Promise<AnalysisVM> => analysisAdapter.fetchAnalysis(target),
    staleTime: 5 * 60_000,
    enabled: override === null,
  });

  if (override !== null) {
    return {
      vm: override,
      isLoading: false,
      error: null,
      isStale: override.source === 'stale',
      staleSince: override.staleSince,
      refetch: () => {},
    };
  }

  return {
    vm: query.data ?? null,
    isLoading: query.isPending,
    error: query.error instanceof Error ? query.error : null,
    isStale: query.data?.source === 'stale',
    staleSince: query.data?.staleSince,
    refetch: () => {
      void query.refetch();
    },
  };
}

/**
 * FR-E7 / D1 — "Analyze" flow.
 *
 * Warms the query cache for the tapped developer while the card shows its
 * spinner (D2), then records the target. Navigation is left to the caller, so
 * this hook stays free of router concerns. Failures are swallowed on purpose:
 * the Analysis screen renders the same `ErrorState` either way.
 */
export function useAnalyze() {
  const queryClient = useQueryClient();
  const openAnalysis = useAppStore((s) => s.openAnalysis);
  const setLoadingId = useAppStore((s) => s.setLoadingId);

  return useCallback(
    async (target: AnalysisTarget, cardId?: string): Promise<void> => {
      // Guard against double taps / taps on other cards while one is running.
      if (useAppStore.getState().loadingId !== null) return;

      setLoadingId(cardId ?? '__analysis__');
      try {
        await queryClient.fetchQuery({
          queryKey: [ANALYSIS_QUERY_KEY, analysisKey(target)],
          queryFn: () => analysisAdapter.fetchAnalysis(target),
          staleTime: 5 * 60_000,
        });
      } catch {
        // Handled by the Analysis screen's error state.
      } finally {
        openAnalysis(target);
        setLoadingId(null);
      }
    },
    [queryClient, openAnalysis, setLoadingId],
  );
}
