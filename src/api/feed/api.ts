// ---------------------------------------------------------------------------
// FE-2 — feed `api` adapter (stub).
//
// Filled in during the backend integration phase; until then it fails loudly
// with a readable message so flipping EXPO_PUBLIC_DS_FEED=api shows the error
// state instead of crashing.
// ---------------------------------------------------------------------------

import type { CountryFacet, FeedPage } from '@/api/contracts';

import { NotImplementedError } from '@/api/errors';
import type { FeedFilters } from '@/lib/feed';

export async function fetchFeedPage(_filters: FeedFilters): Promise<FeedPage> {
  throw new NotImplementedError('feed', 'GET /feed');
}

export async function fetchFeedCountryFacets(_filters: FeedFilters): Promise<CountryFacet[]> {
  throw new NotImplementedError('feed', 'RPC country_facets()');
}
