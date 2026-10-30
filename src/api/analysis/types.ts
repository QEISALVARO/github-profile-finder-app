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
 *  - `login` — route param, deep link, or the tapped card's developer.
 *  - `project` — the feed card that was tapped (mock adapters reuse it).
 *  - `person` — a Talent candidate tapped from Discover/Pipeline/Compare.
 *
 * `login: null` means "the octocat default" in mock mode (PRD §7.2 AC).
 */
export type AnalysisTarget = {
  login: string | null;
  person?: Candidate | null;
  project?: FeedItem | null;
};

/** Resolve the login the adapter will analyse (octocat when unset). */
export function analysisLogin(target: AnalysisTarget): string {
  return (
    target.project?.developer.login ??
    target.person?.login ??
    target.login ??
    'octocat'
  );
}

/** Stable cache key — one entry per developer. */
export function analysisKey(target: AnalysisTarget): string {
  return analysisLogin(target);
}

export interface AnalysisAdapter {
  fetchAnalysis(target: AnalysisTarget): Promise<AnalysisVM>;
}
