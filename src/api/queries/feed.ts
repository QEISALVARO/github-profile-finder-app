// ---------------------------------------------------------------------------
// FE-10a — feed hooks. The screen only knows `FeedPage`; the adapter behind it
// is chosen by EXPO_PUBLIC_DS_FEED.
// ---------------------------------------------------------------------------

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

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

export function useFeedInfinite(filters: FeedFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.feed(filters),
    queryFn: ({ pageParam }) => feedAdapter.fetchPage(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: FeedPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    retry: shouldRetry,
  });
}

export function useFeedCountryFacets(filters: FeedFilters) {
  return useQuery({
    // Facets do NOT include the active `countries` filter — same as backend.
    // We use a key without `countries` so the facet cache is shared across
    // different country selections.
    queryKey: queryKeys.feedFacets({
      query: filters.query,
      role: filters.role,
      location: filters.location,
      recentOnly: filters.recentOnly,
      countries: [],
      city: '',
    }),
    queryFn: () => feedAdapter.fetchCountryFacets(filters),
    retry: shouldRetry,
    staleTime: 10 * 60_000,
  });
}

export function useFeedCityFacets(country: string, filters: FeedFilters) {
  // City facets are only relevant when drilling into a single country, but they
  // should still track the current query/role/recentOnly so they do not freeze
  // on `query: ''`.
  const effectiveForCity = {
    ...filters,
    countries: [country],
  };

  return useQuery({
    queryKey: queryKeys.feedCityFacets(country, effectiveForCity),
    queryFn: () => feedAdapter.fetchCityFacets(country, effectiveForCity),
    retry: shouldRetry,
    staleTime: 5 * 60_000,
    // Only enabled when exactly one country is selected.
    enabled: filters.countries?.length === 1 && filters.countries[0] === country,
  });
}
