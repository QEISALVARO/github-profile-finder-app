// ---------------------------------------------------------------------------
// FE-2 — reports `api` adapter (stub). Implemented with the `reports` table
// and Edge Function export in R6.
// ---------------------------------------------------------------------------

import { NotImplementedError } from '@/api/errors';

import type { ExportReportInput, ReportSummary } from './types';

export async function exportReport(_input: ExportReportInput): Promise<ReportSummary> {
  throw new NotImplementedError('reports', 'POST /reports');
}
