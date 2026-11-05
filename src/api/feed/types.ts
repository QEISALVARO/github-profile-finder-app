// ---------------------------------------------------------------------------
// FE-10a — feed domain contract + adapter interface.
//
// UI code never sees which adapter answered; it only sees `FeedPage` (SP-0).
// Infinite-scroll aware: `nextCursor` carries the server cursor for the next
// page; `totalCount` comes from the first page and is treated as exact.
// ---------------------------------------------------------------------------

import type {
  Availability,
  CityFacet,
  CountryCode,
  CountryFacet,
  DeveloperRef,
  FeedItem,
  FeedPage,
  FeedQuery,
} from '@/api/contracts';

import type { FeedFilters } from '@/lib/feed';

export type { Availability, CityFacet, CountryCode, CountryFacet, DeveloperRef, FeedItem, FeedPage, FeedQuery };
export type { FeedFilters };

export interface FeedAdapter {
  /**
   * Returns one page of feed items plus the cursor for the next page.
   * `totalCount` is taken from the first page; callers that need the exact
   * total must look at page one's `totalCount`.
   */
  fetchPage(filters: FeedFilters, cursor?: string | null): Promise<FeedPage>;
  /** Country facets for the filter chip (PRD v2 §11A). Does NOT include the
   * active `countries` filter — the backend computes facets over all matching
   * projects regardless of the per-request country filter. */
  fetchCountryFacets(filters: FeedFilters): Promise<CountryFacet[]>;
  /** City facets for a single selected country (PRD v2 §11A drill-down).
   * Only meaningful when exactly one country is selected. */
  fetchCityFacets(country: string, filters: FeedFilters): Promise<CityFacet[]>;
  /** Report a project for moderator review (PRD §12). Returns `true` when the
   * report was accepted (including duplicate reports — the server deduplicates). */
  reportProject(projectId: string, reason: string): Promise<boolean>;
}
