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
  location: string;
  recentOnly: boolean;
};

export function filterProjects(projects: FeedProject[], f: FeedFilters): FeedProject[] {
  const keywords = parseKeywords(f.query);
  return projects.filter((p) => {
    const searchable =
      `${p.name} ${p.description} ${p.role} ${p.stack.join(' ')} ${p.developer.name}`.toLowerCase();
    const matchesKeyword = keywords.length === 0 || keywords.every((k) => searchable.includes(k));
    const matchesRole = f.role === 'All' || p.role === f.role;
    const matchesLocation =
      f.location === 'All locations' ||
      p.location === f.location ||
      (f.location === 'Indonesia' && p.location !== '');
    return matchesKeyword && matchesRole && matchesLocation && (!f.recentOnly || p.active);
  });
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
