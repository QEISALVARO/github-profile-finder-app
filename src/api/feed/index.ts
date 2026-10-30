// ---------------------------------------------------------------------------
// FE-2 — feed adapter barrel: picks the implementation from EXPO_PUBLIC_DS_FEED.
// ---------------------------------------------------------------------------

import type { CountryFacet, FeedPage } from '@/api/contracts';

import { getDataSource } from '@/config/dataSource';
import type { FeedFilters } from '@/lib/feed';

import * as api from './api';
import * as mock from './mock';
import type { FeedAdapter } from './types';

export * from './types';

export const feedAdapter: FeedAdapter = {
  fetchPage: (filters: FeedFilters): Promise<FeedPage> =>
    getDataSource('feed') === 'api' ? api.fetchFeedPage(filters) : mock.fetchFeedPage(filters),

  fetchCountryFacets: (filters: FeedFilters): Promise<CountryFacet[]> =>
    getDataSource('feed') === 'api'
      ? api.fetchFeedCountryFacets(filters)
      : mock.fetchFeedCountryFacets(filters),
};
