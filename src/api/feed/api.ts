// ---------------------------------------------------------------------------
// FE-2 — feed `api` adapter.
//
// The feed RPC/Edge Function lands with BE-3. Until then flipping
// EXPO_PUBLIC_DS_FEED=api shows "Fitur ini belum tersedia di backend" instead
// of crashing or inventing projects (POL-5).
// ---------------------------------------------------------------------------

import type { CountryFacet, FeedPage } from '@/api/contracts';

import { apiNotReady } from '@/api/errors';
import type { FeedFilters } from '@/lib/feed';

export async function fetchFeedPage(_filters: FeedFilters): Promise<FeedPage> {
  throw apiNotReady('feed', 'GET /feed (menunggu BE-3)');
}

export async function fetchFeedCountryFacets(_filters: FeedFilters): Promise<CountryFacet[]> {
  throw apiNotReady('feed', 'RPC country_facets (menunggu BE-3)');
}
