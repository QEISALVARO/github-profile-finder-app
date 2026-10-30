// ---------------------------------------------------------------------------
// FE-2 — analysis hooks.
//
// `useAnalysis(login)` returns the contract VM plus everything the screen
// needs to render its states: loading → skeleton, stale → banner, error →
// ErrorState. The login comes from the route param, so deep links and refresh
// work without any global "last analysis" state.
// ---------------------------------------------------------------------------

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { AnalysisVM, FeedItem } from '@/api/contracts';

import { analysisAdapter } from '@/api/analysis';
import { errorMessage, shouldRetry, type AppError, toAppError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { useAppStore } from '@/store/useAppStore';

const ANALYSIS_STALE_TIME = 5 * 60_000;

export type AnalysisState = {
  data: AnalysisVM | null;
  /** `fresh` | `cache` | `stale` — straight from the VM. */
  source: AnalysisVM['source'] | null;
  isLoading: boolean;
  isStale: boolean;
  staleSince: string | undefined;
  error: AppError | null;
  refetch: () => void;
};

export function useAnalysis(login: string | null): AnalysisState {
  const normalized = login?.trim() || 'octocat';

  const query = useQuery({
    queryKey: queryKeys.analysis(normalized),
    queryFn: (): Promise<AnalysisVM> => analysisAdapter.fetchAnalysis({ login: normalized }),
    staleTime: ANALYSIS_STALE_TIME,
    retry: shouldRetry,
  });

  return {
    data: query.data ?? null,
    source: query.data?.source ?? null,
    isLoading: query.isPending,
    isStale: query.data?.source === 'stale',
    staleSince: query.data?.staleSince,
    error: query.error ? toAppError(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
  };
}

export type AnalyzeResult = {
  ok: boolean;
  error: AppError | null;
};

/**
 * FR-E7 / D1 + D2 — the feed's "Analyze" action.
 *
 * Warms the query cache for the tapped developer while *only that card* shows
 * a spinner, then reports success so the screen can navigate. Failures are
 * surfaced in the FR-E9 error slot (friendly per `ErrorBody.code`), never by
 * opening an empty Analysis screen.
 */
export function useAnalyze() {
  const queryClient = useQueryClient();
  const loadingId = useAppStore((s) => s.loadingId);
  const setLoadingId = useAppStore((s) => s.setLoadingId);
  const setError = useAppStore((s) => s.setError);

  const analyze = useCallback(
    async (item: FeedItem): Promise<AnalyzeResult> => {
      // Guard against double taps / taps on other cards while one is running.
      if (useAppStore.getState().loadingId !== null) return { ok: false, error: null };

      const login = item.developer.login;
      setLoadingId(item.id);
      setError('');
      try {
        // The cached entry is keyed by login; passing the project lets the mock
        // adapter describe exactly the developer that was tapped.
        await queryClient.fetchQuery({
          queryKey: queryKeys.analysis(login),
          queryFn: () => analysisAdapter.fetchAnalysis({ login, project: item }),
          staleTime: ANALYSIS_STALE_TIME,
          retry: shouldRetry,
        });
        return { ok: true, error: null };
      } catch (error) {
        const app = toAppError(error);
        setError(errorMessage(app));
        return { ok: false, error: app };
      } finally {
        setLoadingId(null);
      }
    },
    [queryClient, setError, setLoadingId],
  );

  return {
    analyze,
    /** D2 — only the tapped card may show a spinner. */
    loadingId,
    isLoading: loadingId !== null,
  };
}
