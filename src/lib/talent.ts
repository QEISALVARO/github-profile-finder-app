// ---------------------------------------------------------------------------
// FE-5 / FE-2 — pure Talent logic (PRD §5.4, §7.3, PRD v2 §11).
//
// No React, no store, no I/O: the Discover adapter, the Talent screen and the
// unit tests all share these functions.
//
// POL-8 — filtering is limited to role, score and country of residence.
// Never add citizenship/ethnicity/religion/age/gender filters here.
// POL-9 — a candidate without a declared country never passes an *active*
// country filter.
// ---------------------------------------------------------------------------

import type { PipelineStage } from '@/api/contracts';

import type { Candidate } from '@/types';

export const ALL_ROLES = 'All roles';
export const DEFAULT_MIN_SCORE = 85;
export const MIN_SCORE = 70;
export const MAX_SCORE = 95;

/** Compare holds at most two candidates; the oldest pick is displaced (FIFO). */
export const COMPARE_LIMIT = 2;

export type TalentFilters = {
  /** `All roles` or a concrete role such as `Front-End`. */
  role: string;
  /** 70–95, displayed as `{n}+`. */
  minScore: number;
  /** ISO 3166-1 alpha-2 codes; empty = every country (PRD v2 §11A). */
  countries: string[];
};

export const DEFAULT_TALENT_FILTERS: TalentFilters = {
  role: ALL_ROLES,
  minScore: DEFAULT_MIN_SCORE,
  countries: [],
};

export function filterCandidates(items: Candidate[], filters: TalentFilters): Candidate[] {
  return items.filter((candidate) => {
    if (filters.role !== ALL_ROLES && candidate.role !== filters.role) return false;
    if (candidate.score < filters.minScore) return false;
    if (filters.countries.length > 0) {
      const code = candidate.countryCode ?? null;
      if (code === null || !filters.countries.includes(code)) return false;
    }
    return true;
  });
}

/**
 * PRD §5.4 — selecting a third candidate while two are selected drops the
 * oldest one. Deselecting always wins over selecting.
 */
export function toggleCompare(selected: string[], login: string): string[] {
  if (selected.includes(login)) return selected.filter((entry) => entry !== login);
  return [...selected.slice(-(COMPARE_LIMIT - 1)), login];
}

export type PipelineCounts = Record<PipelineStage, number>;

export const PIPELINE_STAGES: PipelineStage[] = ['interviewing', 'saved', 'hired'];

/** PRD §7.3 FR-T6 — the three summary numbers, computed from real data. */
export function countByStage<T extends { stage: PipelineStage }>(entries: T[]): PipelineCounts {
  const counts: PipelineCounts = { saved: 0, interviewing: 0, hired: 0 };
  for (const entry of entries) counts[entry.stage] += 1;
  return counts;
}
