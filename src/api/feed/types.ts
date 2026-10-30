// ---------------------------------------------------------------------------
// FE-2 — feed domain contract + adapter interface.
//
// UI code never sees which adapter answered; it only sees `FeedPage` (SP-0).
// ---------------------------------------------------------------------------

import type {
  Availability,
  CountryCode,
  CountryFacet,
  DeveloperRef,
  FeedItem,
  FeedPage,
  FeedQuery,
} from '@/api/contracts';

import type { FeedFilters } from '@/lib/feed';

export type { Availability, CountryCode, CountryFacet, DeveloperRef, FeedItem, FeedPage, FeedQuery };
export type { FeedFilters };

export interface FeedAdapter {
  /** Returns a full page; `nextCursor` is always null in mock mode. */
  fetchPage(filters: FeedFilters): Promise<FeedPage>;
  /** Country facets for the filter chip (PRD v2 §11A). */
  fetchCountryFacets(filters: FeedFilters): Promise<CountryFacet[]>;
}
