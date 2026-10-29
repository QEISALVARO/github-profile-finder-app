// ---------------------------------------------------------------------------
// FE-2 — analysis `api` adapter (stub). Implemented in R2 via the
// `analyze-developer` Edge Function (PRD v2 §8.1).
// ---------------------------------------------------------------------------

import type { AnalysisVM } from '@/api/contracts';

import { NotImplementedError } from '@/api/errors';

import type { AnalysisTarget } from './types';

export async function fetchAnalysis(_target: AnalysisTarget): Promise<AnalysisVM> {
  throw new NotImplementedError('analysis', 'POST /analyze-developer');
}
