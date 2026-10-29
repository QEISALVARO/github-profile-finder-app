// ---------------------------------------------------------------------------
// FE-2 — talent hooks (Discover + Pipeline). The Talent screen never sees the
// adapter; EXPO_PUBLIC_DS_TALENT picks the source.
// ---------------------------------------------------------------------------

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { shouldRetry } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { talentAdapter, type DiscoverPage, type PipelineSnapshot } from '@/api/talent';
import type { TalentFilters } from '@/lib/talent';

export function useDiscover(filters: TalentFilters) {
  return useQuery({
    queryKey: queryKeys.discover(filters),
    queryFn: (): Promise<DiscoverPage> => talentAdapter.discover(filters),
    placeholderData: keepPreviousData,
    retry: shouldRetry,
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: queryKeys.pipeline(),
    queryFn: (): Promise<PipelineSnapshot> => talentAdapter.pipeline(),
    retry: shouldRetry,
  });
}

export function useSetStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; stage: PipelineSnapshot['entries'][number]['stage'] }) =>
      talentAdapter.setStage(input.id, input.stage),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(queryKeys.pipeline(), snapshot);
    },
  });
}
