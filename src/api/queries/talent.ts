// ---------------------------------------------------------------------------
// FE-2 — talent hooks (Discover + Pipeline). The Talent screen never sees the
// adapter; EXPO_PUBLIC_DS_TALENT picks the source.
// ---------------------------------------------------------------------------

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { talentAdapter, type DiscoverPage, type PipelineSnapshot } from '@/api/talent';
import type { TalentFilters } from '@/lib/talent';

export const TALENT_QUERY_KEY = 'talent';

export function useDiscover(filters: TalentFilters) {
  return useQuery({
    queryKey: [TALENT_QUERY_KEY, 'discover', filters],
    queryFn: (): Promise<DiscoverPage> => talentAdapter.discover(filters),
    placeholderData: keepPreviousData,
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: [TALENT_QUERY_KEY, 'pipeline'],
    queryFn: (): Promise<PipelineSnapshot> => talentAdapter.pipeline(),
  });
}

export function useSetStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; stage: PipelineSnapshot['entries'][number]['stage'] }) =>
      talentAdapter.setStage(input.id, input.stage),
    onSuccess: (snapshot) => {
      queryClient.setQueryData([TALENT_QUERY_KEY, 'pipeline'], snapshot);
    },
  });
}
