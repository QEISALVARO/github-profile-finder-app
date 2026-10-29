// ---------------------------------------------------------------------------
// FE-2 — feed hooks. The screen only knows `FeedPage`; the adapter behind it
// is chosen by EXPO_PUBLIC_DS_FEED.
// ---------------------------------------------------------------------------

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { feedAdapter, type FeedPage } from '@/api/feed';
import type { FeedFilters } from '@/lib/feed';

export const FEED_QUERY_KEY = 'feed';

export function useFeed(filters: FeedFilters) {
  return useQuery({
    queryKey: [FEED_QUERY_KEY, filters],
    queryFn: (): Promise<FeedPage> => feedAdapter.fetchPage(filters),
    // Keeps the previous page on screen while a keystroke refetches, so the
    // list never flashes between filter states.
    placeholderData: keepPreviousData,
  });
}
