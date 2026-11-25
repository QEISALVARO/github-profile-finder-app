// ---------------------------------------------------------------------------
// FE-10a — feed adapter barrel: picks the implementation from EXPO_PUBLIC_DS_FEED.
// ---------------------------------------------------------------------------

import type { CityFacet, CountryFacet, FeedPage } from '@/api/contracts';

import { getDataSource } from '@/config/dataSource';
import type { FeedFilters } from '@/lib/feed';

import * as api from './api';
import * as mock from './mock';
import type { FeedAdapter } from './types';

export * from './types';

export const feedAdapter: FeedAdapter = {
  fetchPage: (filters: FeedFilters, cursor?: string | null): Promise<FeedPage> =>
    getDataSource('feed') === 'api'
      ? api.fetchFeedPage(filters, cursor)
      : mock.fetchFeedPage(filters, cursor),

  fetchCountryFacets: (filters: FeedFilters): Promise<CountryFacet[]> =>
    getDataSource('feed') === 'api'
      ? api.fetchFeedCountryFacets(filters)
      : mock.fetchFeedCountryFacets(filters),

  fetchCityFacets: (country: string, filters: FeedFilters): Promise<CityFacet[]> =>
    getDataSource('feed') === 'api'
      ? api.fetchFeedCityFacets(country, filters)
      : mock.fetchFeedCityFacets(country, filters),

  reportProject: (projectId: string, reason: string): Promise<boolean> =>
    getDataSource('feed') === 'api'
      ? api.reportProject(projectId, reason)
      : mock.reportProject(projectId, reason),
};
