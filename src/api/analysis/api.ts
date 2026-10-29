// ---------------------------------------------------------------------------
// FE-2 — analysis `api` adapter.
//
// Thin wrapper over `lib/analyze.ts`, which calls the `analyze-developer` Edge
// Function (PRD v2 §8.1). Failures are mapped to `AppError` — never replaced
// with invented data (POL-5).
// ---------------------------------------------------------------------------

import type { AnalysisVM } from '@/api/contracts';

import { toAppError } from '@/api/errors';
import { analyzeDeveloper } from '@/lib/analyze';

import { analysisLogin, type AnalysisTarget } from './types';

export async function fetchAnalysis(target: AnalysisTarget): Promise<AnalysisVM> {
  const login = analysisLogin(target);
  const result = await analyzeDeveloper(login);

  if (result.error) throw toAppError(result.error);
  if (!result.data) throw toAppError({ code: 'UPSTREAM_ERROR', message: '', status: 502 });

  return result.data;
}
