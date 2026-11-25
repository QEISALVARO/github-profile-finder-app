// ---------------------------------------------------------------------------
// FE-2 + BE-3 — feed `api` adapter.
//
// Connects the SP-0 contract to the BE-3 RPCs `search_projects` and
// `country_facets` (supabase/migrations/20261001000020/…21, contract doc:
// docs/backend/feed.md). The RPC already answers with the `FeedPage` jsonb
// shape, so this file only:
//   1. maps `FeedFilters` (UI) → RPC named params,
//   2. normalises the two nullable profile fields (`profiles.name`,
//      `profiles.avatar_url`) onto the non-nullable contract,
//   3. turns Postgres `raise exception '<CODE>'` failures into `AppError`.
// Failures are surfaced through `ErrorState` — never replaced with invented
// projects (POL-5).
// ---------------------------------------------------------------------------

import type { CountryFacet, FeedItem, FeedPage } from '@/api/contracts';

import { mapRpcError, toAppError, type AppError } from '@/api/errors';
import type { FeedFilters } from '@/lib/feed';
import { getSupabase } from '@/lib/supabase';

/** RPC page size (docs/backend/feed.md: `lim` clamped 1–50, default 20). */
const PAGE_SIZE = 20;

/** `profiles.name` / `avatar_url` are nullable; the contract is not. */
type RpcFeedItem = Omit<FeedItem, 'developer'> & {
  developer: Omit<FeedItem['developer'], 'name' | 'avatarUrl'> & {
    name: string | null;
    avatarUrl: string | null;
  };
};

/**
 * PRD v2 §11A — pemetaan chip lokasi v1 (PRD_V2_REAL.md §11A):
 * `All locations` → semua negara; `Indonesia` → `ID`; nama kota → `p_city`.
 */
function legacyLocation(filters: FeedFilters): { countries: string[] | null; city: string | null } {
  const location = filters.location.trim();
  if (location === '' || location === 'All locations') return { countries: null, city: null };
  if (location === 'Indonesia') return { countries: ['ID'], city: null };
  return { countries: null, city: location };
}

/** `FeedFilters` → `search_projects` named params. */
function searchArgs(filters: FeedFilters) {
  const legacy = legacyLocation(filters);
  return {
    p_q: filters.query.trim() || null,
    p_role: filters.role === 'All' ? null : filters.role,
    // v2 `countries` (bila diisi) menimpa chip lokasi legacy.
    p_countries: filters.countries?.length ? [...filters.countries] : legacy.countries,
    p_city: filters.city?.trim() || legacy.city,
    p_active_only: filters.recentOnly,
    p_lim: PAGE_SIZE,
  };
}

/** `FeedFilters` → `country_facets` params: same filters *except* `countries`. */
function facetArgs(filters: FeedFilters) {
  const legacy = legacyLocation(filters);
  return {
    p_q: filters.query.trim() || null,
    p_role: filters.role === 'All' ? null : filters.role,
    p_city: filters.city?.trim() || legacy.city,
    p_active_only: filters.recentOnly,
  };
}

function upstream(message = 'Feed gagal dimuat. Coba lagi.'): AppError {
  return toAppError({ code: 'UPSTREAM_ERROR', message, status: 502 });
}

function toFeedItem(row: RpcFeedItem): FeedItem {
  return {
    ...row,
    developer: {
      ...row.developer,
      // Nullable profile fields fall back to the real GitHub identity (login),
      // never an invented display name (POL-5). The avatar URL is GitHub's
      // canonical endpoint for that login — the same pattern the seed uses.
      name: row.developer.name ?? row.developer.login,
      avatarUrl: row.developer.avatarUrl ?? `https://github.com/${row.developer.login}.png`,
    },
  };
}

/** Shape guard: the RPC must answer with the contract jsonb object. */
function toFeedPage(data: unknown): FeedPage {
  const record = data as { items?: unknown } | null | undefined;
  if (record === null || typeof record !== 'object' || !Array.isArray(record.items)) {
    throw upstream();
  }
  const page = record as {
    items: RpcFeedItem[];
    nextCursor?: string | null;
    totalCount?: number;
  };
  return {
    items: page.items.map(toFeedItem),
    nextCursor: page.nextCursor ?? null,
    totalCount: typeof page.totalCount === 'number' ? page.totalCount : page.items.length,
  };
}

export async function fetchFeedPage(filters: FeedFilters): Promise<FeedPage> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('search_projects', searchArgs(filters));
  if (error) throw mapRpcError(error);
  return toFeedPage(data);
}

export async function fetchFeedCountryFacets(filters: FeedFilters): Promise<CountryFacet[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('country_facets', facetArgs(filters));
  if (error) throw mapRpcError(error);
  if (!Array.isArray(data)) throw upstream();
  return data as CountryFacet[];
}
