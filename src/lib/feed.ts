import type { FeedProject } from '@/data/seed';

// ---------------------------------------------------------------------------
// PRD §5.1 — feed filtering, verbatim from the prototype. Do NOT "fix"
// behaviour here (no keyword aliases): chips like "Python ML" and "Golang"
// intentionally return an empty state (PRD O4).
// ---------------------------------------------------------------------------

export const parseKeywords = (query: string): string[] =>
  query
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean);

export type FeedFilters = {
  query: string;
  role: string;
  /** Legacy v1 location chip (city name, `Indonesia`, or `All locations`). */
  location: string;
  recentOnly: boolean;
  /** PRD v2 §11A — ISO 3166-1 alpha-2 codes; empty/undefined = every country. */
  countries?: string[];
  /** City filter; empty/undefined = every city. */
  city?: string;
};

export function filterProjects(projects: FeedProject[], f: FeedFilters): FeedProject[] {
  const keywords = parseKeywords(f.query);
  const countries = f.countries ?? [];
  const city = (f.city ?? '').trim().toLowerCase();

  return projects.filter((p) => {
    const searchable =
      `${p.name} ${p.description} ${p.role} ${p.stack.join(' ')} ${p.developer.name}`.toLowerCase();
    const matchesKeyword = keywords.length === 0 || keywords.every((k) => searchable.includes(k));
    const matchesRole = f.role === 'All' || p.role === f.role;
    const matchesLocation =
      f.location === 'All locations' ||
      p.location === f.location ||
      (f.location === 'Indonesia' && p.location !== '');
    // POL-9 — a project without a country never passes an active country filter.
    const matchesCountry =
      countries.length === 0 ||
      (p.countryCode !== null && p.countryCode !== undefined && countries.includes(p.countryCode));
    const matchesCity = city === '' || (p.city ?? p.location).toLowerCase() === city;
    return (
      matchesKeyword &&
      matchesRole &&
      matchesLocation &&
      matchesCountry &&
      matchesCity &&
      (!f.recentOnly || p.active)
    );
  });
}

// ---------------------------------------------------------------------------
// Proof-row demo label (FR-E6/E7).
//
// The seed stores a display label ("Play Store", "Vercel"), while the API
// contract carries a URL in `FeedItem.demoUrl`. Both shapes render here: a
// plain label passes through, a URL is reduced to its host. The link target
// itself stays `https://github.com/{login}` (FR-E7).
// ---------------------------------------------------------------------------

export function demoLabel(demoUrl: string | null): string | null {
  if (!demoUrl) return null;
  if (!/^https?:\/\//i.test(demoUrl)) return demoUrl;
  return demoUrl
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .split('?')[0];
}

// ---------------------------------------------------------------------------
// compactNumber — `Intl.NumberFormat` compact notation, with a verified manual
// fallback because Hermes builds ship without compact notation support.
// ---------------------------------------------------------------------------

type Unit = { divider: number; suffix: string; next: Unit | null };

const MILLION: Unit = { divider: 1_000_000, suffix: 'M', next: null };
const THOUSAND: Unit = { divider: 1_000, suffix: 'K', next: MILLION };

function formatWithUnit(value: number, unit: Unit): string {
  const scaled = value / unit.divider;
  // Rounding can cross the unit boundary (999_950 → 1000.0K); promote instead.
  const rounded = Math.round(scaled * 10) / 10;
  if (unit.next && rounded >= 1000) {
    return formatWithUnit(value, unit.next);
  }
  return `${rounded.toFixed(1).replace(/\.0$/, '')}${unit.suffix}`;
}

function manualCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1000) return String(value);
  return formatWithUnit(value, abs < 1_000_000 ? THOUSAND : MILLION);
}

function makeIntlCompact(): Intl.NumberFormat | null {
  try {
    const formatter = new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    // Verify the runtime really implements compact notation correctly.
    return formatter.format(1280) === '1.3K' && formatter.format(842) === '842'
      ? formatter
      : null;
  } catch {
    return null;
  }
}

const intlCompact = makeIntlCompact();

/** `1280 → "1.3K"`, `842 → "842"`, `1_250_000 → "1.3M"` (PRD Lampiran A). */
export function compactNumber(value: number): string {
  return intlCompact ? intlCompact.format(value) : manualCompact(value);
}
