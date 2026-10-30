// ---------------------------------------------------------------------------
// FE-2 — mock talent adapter: Discover over the seed candidates and an
// in-memory pipeline. No network, deterministic.
// ---------------------------------------------------------------------------

import type { DiscoverItem, DiscoverPage, PipelineEntry } from '@/api/contracts';

import { candidates } from '@/data/seed';
import { toAvailability } from '@/lib/availability';
import { countByStage, filterCandidates, type TalentFilters } from '@/lib/talent';
import type { Candidate } from '@/types';

import type { PipelineSnapshot } from './types';

export function buildDiscoverItem(candidate: Candidate): DiscoverItem {
  return {
    login: candidate.login,
    name: candidate.name,
    avatarUrl: candidate.avatar,
    role: candidate.role,
    primaryLanguage: candidate.language,
    countryCode: candidate.countryCode ?? null,
    city: candidate.city ?? candidate.location,
    score: candidate.score,
    availability: toAvailability(candidate.availability),
  };
}

export async function discover(filters: TalentFilters): Promise<DiscoverPage> {
  const items = filterCandidates(candidates, filters)
    .slice()
    .sort((a, b) => b.score - a.score)
    .map(buildDiscoverItem);
  return { items, nextCursor: null, totalCount: items.length };
}

// --- Pipeline (in-memory, seeded from the candidate stages) -----------------

const STAGE_BY_LABEL: Record<Candidate['stage'], PipelineEntry['stage']> = {
  Saved: 'saved',
  Interviewing: 'interviewing',
  Hired: 'hired',
};

function seedPipeline(): PipelineEntry[] {
  return candidates.map((candidate) => ({
    id: `pipeline:${candidate.login}`,
    githubLogin: candidate.login,
    stage: STAGE_BY_LABEL[candidate.stage],
    note: null,
    updatedAt: '2026-10-27T09:00:00.000Z',
  }));
}

let pipelineEntries: PipelineEntry[] = seedPipeline();

function snapshot(): PipelineSnapshot {
  return { entries: pipelineEntries.map((entry) => ({ ...entry })) };
}

/** Test seam — restore the seed between suites. */
export function resetPipeline(): void {
  pipelineEntries = seedPipeline();
}

export async function pipeline(): Promise<PipelineSnapshot> {
  return snapshot();
}

export async function setStage(
  id: string,
  stage: PipelineEntry['stage'],
): Promise<PipelineSnapshot> {
  pipelineEntries = pipelineEntries.map((entry) =>
    entry.id === id
      ? { ...entry, stage, updatedAt: new Date().toISOString() }
      : entry,
  );
  return snapshot();
}

/** Convenience for the Pipeline screen summary — same numbers as the data. */
export function pipelineCounts(snapshotValue: PipelineSnapshot) {
  return countByStage(snapshotValue.entries);
}
