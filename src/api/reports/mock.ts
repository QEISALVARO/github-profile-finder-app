// ---------------------------------------------------------------------------
// FE-2 — mock reports adapter: records an export locally and returns a
// deterministic summary. No PDF is produced (v1 = toast mock, PRD §1.2).
// ---------------------------------------------------------------------------

import type { ExportReportInput, ReportSummary } from './types';

let reports: ReportSummary[] = [];

/** Test seam. */
export function resetReports(): void {
  reports = [];
}

export async function list(): Promise<ReportSummary[]> {
  return reports.map((report) => ({ ...report }));
}

export async function exportReport(input: ExportReportInput): Promise<ReportSummary> {
  const summary: ReportSummary = {
    id: `report-${String(reports.length + 1).padStart(4, '0')}`,
    login: input.login,
    score: input.score,
    createdAt: new Date().toISOString(),
  };
  reports = [summary, ...reports];
  return { ...summary };
}
