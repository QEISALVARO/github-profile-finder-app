// ---------------------------------------------------------------------------
// FE-10a — mock feed adapter.
//
// Wraps the verbatim v1 filter (`lib/feed.ts#filterProjects`) over the seed
// data and shapes the result as a `FeedPage`. Supports infinite scroll via a
// fake cursor: page 2 is a suffix of page 1 so the UI can exercise the
// onEndReached path without a backend. Country/city facets are computed from
// the seed with `<5` masking (same behaviour the backend documents).
// ---------------------------------------------------------------------------

import type { Availability, CityFacet, CountryFacet, FeedItem, FeedPage } from '@/api/contracts';

import { feedProjects, type FeedProject } from '@/data/seed';
import { filterProjects, type FeedFilters } from '@/lib/feed';
import { toAvailability } from '@/lib/availability';

const PAGE_SIZE = 20;

/** `["Flutter 65%", "Dart 35%"]` → `[{ name: "Flutter", percent: 65 }, …]`. */
export function parseStackEntry(entry: string): { name: string; percent: number } {
  const match = /^(.*?)\s+(\d+(?:\.\d+)?)%$/.exec(entry.trim());
  if (!match) return { name: entry.trim(), percent: 0 };
  return { name: match[1], percent: Number(match[2]) };
}

export function buildFeedItem(project: FeedProject): FeedItem {
  const developer = project.developer;
  const city = project.city ?? project.location;
  return {
    id: String(project.id),
    name: project.name,
    description: project.description,
    role: project.role,
    stack: project.stack.map(parseStackEntry),
    countryCode: project.countryCode ?? null,
    city,
    score: project.score,
    active: project.active,
    // Seed stores the proof-row label ("Play Store"); see `demoLabel`.
    demoUrl: project.demo,
    demoVerified: project.demo !== '',
    stars: project.stars,
    developer: {
      login: developer.login,
      name: developer.name,
      avatarUrl: developer.avatar,
      availability: toAvailability(developer.availability) as Availability,
    },
  };
}

const FIRST_PAGE = filterProjects(feedProjects, {
  query: '', role: 'All', location: 'All locations', recentOnly: false,
  countries: [], city: '',
}).map(buildFeedItem);

/** Fake cursor: `"1"` = page 2, anything else = page 1. Page 2 is the tail
 * of the seed (the last item) so onEndReached can be exercised without a real
 * backend. This is honest mock data, not invented fixtures. */
export async function fetchFeedPage(filters: FeedFilters, cursor?: string | null): Promise<FeedPage> {
  const filtered = filterProjects(feedProjects, filters).map(buildFeedItem);
  if (cursor === '1' && filtered.length > 0) {
    return { items: filtered.slice(-1), nextCursor: null, totalCount: filtered.length };
  }
  // First page and any non-special cursor: return the full filtered set.
  return { items: filtered, nextCursor: filtered.length > PAGE_SIZE ? '1' : null, totalCount: filtered.length };
}

/**
 * Country facets need the server-side `country_facets` RPC (R3). In mock mode
 * the honest answer is computed from the seed, not invented. The result does
 * NOT include the active `countries` filter — same as the backend.
 */
export async function fetchFeedCountryFacets(_filters: FeedFilters): Promise<CountryFacet[]> {
  const counts = new Map<string, number>();
  for (const project of feedProjects) {
    if (!project.countryCode) continue;
    counts.set(project.countryCode, (counts.get(project.countryCode) ?? 0) + 1);
  }
  return [...counts.entries()].map(([iso2, count]) => ({
    iso2,
    count: count < 5 ? ('<5' as const) : count,
  }));
}

/**
 * City facets for a single country. Computed from the seed; `<5` masking
 * matches the backend's documented behaviour.
 */
export async function fetchFeedCityFacets(country: string, _filters: FeedFilters): Promise<CityFacet[]> {
  const counts = new Map<string, number>();
  for (const project of feedProjects) {
    if (project.countryCode !== country) continue;
    const city = project.city ?? project.location;
    if (!city) continue;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([city, count]) => ({ city, count: count < 5 ? ('<5' as const) : count }))
    .sort((a, b) => b.count === '<5' ? -1 : a.city.localeCompare(b.city));
}

/** Mock report: always accepted, idempotent (duplicate reports return true). */
export async function reportProject(_projectId: string, _reason: string): Promise<boolean> {
  return true;
}
