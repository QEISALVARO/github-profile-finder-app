// ---------------------------------------------------------------------------
// FE-2 — feed hooks. The screen only knows `FeedPage`; the adapter behind it
// is chosen by EXPO_PUBLIC_DS_FEED.
// ---------------------------------------------------------------------------

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { feedAdapter, type FeedPage } from '@/api/feed';
import { shouldRetry } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import type { FeedFilters } from '@/lib/feed';

export function useFeed(filters: FeedFilters) {
  return useQuery({
    queryKey: queryKeys.feed(filters),
    queryFn: (): Promise<FeedPage> => feedAdapter.fetchPage(filters),
    // Keeps the previous page on screen while a keystroke refetches, so the
    // list never flashes between filter states.
    placeholderData: keepPreviousData,
    retry: shouldRetry,
  });
}

export function useFeedCountryFacets(filters: FeedFilters) {
  return useQuery({
    queryKey: queryKeys.feedFacets(filters),
    queryFn: () => feedAdapter.fetchCountryFacets(filters),
    retry: shouldRetry,
    staleTime: 10 * 60_000,
  });
}
