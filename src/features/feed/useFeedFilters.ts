import { useAppStore } from '@/store/useAppStore';

import type { FeedFilters } from '@/lib/feed';

// ---------------------------------------------------------------------------
// useFeedFilters — single source of truth for the *effective* feed filters
// used by both `FeedFilters` (facet/query) and `explore/index.tsx` (actual
// feed query).
//
// Effective countries := UI-selected `countries` when non-empty, otherwise the
// auth `targetCountries` default. Effective city/location comes from the
// country drill-down only.
//
// This hook is the only place that computes effective countries; both consumers
// import from here so there are never two competing calculations.
// ---------------------------------------------------------------------------

export function useFeedFilters(): FeedFilters {
  const query = useAppStore((s) => s.query);
  const feedRole = useAppStore((s) => s.feedRole);
  const recentOnly = useAppStore((s) => s.recentOnly);

  const countries = useAppStore((s) => s.countries);
  const city = useAppStore((s) => s.city);

  const targetCountries = useAppStore((s) => s.targetCountries);

  const effectiveCountries = countries.length > 0 ? countries : targetCountries;
  const effectiveCity = city ?? '';
  const effectiveLocation = 'All locations';

  return {
    query,
    role: feedRole,
    countries: effectiveCountries,
    city: effectiveCity,
    location: effectiveLocation,
    recentOnly,
  };
}
