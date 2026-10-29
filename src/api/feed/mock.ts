// ---------------------------------------------------------------------------
// FE-2 — mock feed adapter.
//
// Wraps the verbatim v1 filter (`lib/feed.ts#filterProjects`) over the seed
// data and shapes the result as `FeedPage`. No network, fully deterministic:
// the Explore feed behaves exactly as before (PRD §7.1 AC keep passing).
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
  return {
    id: String(project.id),
    name: project.name,
    description: project.description,
    role: project.role,
    stack: project.stack.map(parseStackEntry),
    // Feed country filtering lands with R3; the seed only carries a city.
    countryCode: null,
    city: project.location,
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
 * Facets need the server-side RPC (`country_facets`) in R3; in mock mode the
 * seed has no country codes, so the honest answer is an empty list.
 */
export async function fetchFeedCountryFacets(_filters: FeedFilters): Promise<CountryFacet[]> {
  return [];
}
