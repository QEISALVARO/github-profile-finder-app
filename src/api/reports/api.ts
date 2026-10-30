// ---------------------------------------------------------------------------
// FE-2 — reports `api` adapter. The `reports` table + export Edge Function
// land with BE-6.
// ---------------------------------------------------------------------------

import { apiNotReady } from '@/api/errors';

import type { ExportReportInput, ReportSummary } from './types';

export async function list(): Promise<ReportSummary[]> {
  throw apiNotReady('reports', 'GET /reports (menunggu BE-6)');
}

export async function exportReport(_input: ExportReportInput): Promise<ReportSummary> {
  throw apiNotReady('reports', 'POST /reports (menunggu BE-6)');
}
