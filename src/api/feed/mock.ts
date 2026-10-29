// ---------------------------------------------------------------------------
// FE-2 — mock feed adapter.
//
// Wraps the verbatim v1 filter (`lib/feed.ts#filterProjects`) over the seed
// data and shapes the result as a `FeedPage`. No network, fully deterministic:
// the Explore feed behaves exactly as before (PRD §7.1 AC keep passing) while
// gaining `countryCode`/`city` for the PRD v2 §11A filters.
// ---------------------------------------------------------------------------

import type { Availability, CountryFacet, FeedItem, FeedPage } from '@/api/contracts';

import { feedProjects, type FeedProject } from '@/data/seed';
import { filterProjects, type FeedFilters } from '@/lib/feed';
import { toAvailability } from '@/lib/availability';

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

export async function fetchFeedPage(filters: FeedFilters): Promise<FeedPage> {
  const items = filterProjects(feedProjects, filters).map(buildFeedItem);
  return { items, nextCursor: null, totalCount: items.length };
}

/**
 * Country facets need the server-side `country_facets` RPC (R3). In mock mode
 * the honest answer is computed from the seed, not invented.
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
