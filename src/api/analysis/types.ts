// ---------------------------------------------------------------------------
// FE-2 — analysis domain contract + adapter interface.
//
// The Analysis screen consumes `AnalysisVM` (SP-0), never raw GitHub payloads.
// ---------------------------------------------------------------------------

import type { AnalysisVM, AnalyzeRequest, Evidence, FeedItem } from '@/api/contracts';

import type { Candidate } from '@/types';

export type { AnalysisVM, AnalyzeRequest, Evidence };

/**
 * What the UI knows when it asks for an analysis:
 *  - `project` — the feed card that was tapped; its developer is analysed (D1).
 *  - `person` — a Talent candidate tapped from Discover/Pipeline/Compare.
 *  - `login` alone — cold start, deep link, or a plain username lookup.
 *
 * `null` everywhere means "the octocat default" (PRD §7.2 AC).
 */
export type AnalysisTarget = {
  login: string | null;
  person?: Candidate | null;
  project?: FeedItem | null;
};

/** Stable cache key — one entry per developer. */
export function analysisKey(target: AnalysisTarget): string {
  return (
    target.person?.login ?? target.project?.developer.login ?? target.login ?? 'octocat'
  );
}

export interface AnalysisAdapter {
  fetchAnalysis(target: AnalysisTarget): Promise<AnalysisVM>;
}
