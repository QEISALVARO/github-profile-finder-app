// ---------------------------------------------------------------------------
// FE-2 — mock reports adapter: records an export locally and returns a
// deterministic summary. No PDF is produced (v1 = toast mock, PRD §1.2).
// ---------------------------------------------------------------------------

import type { ExportReportInput, ReportSummary } from './types';

let exportCount = 0;

/** Test seam. */
export function resetReports(): void {
  exportCount = 0;
}

export async function exportReport(input: ExportReportInput): Promise<ReportSummary> {
  exportCount += 1;
  return {
    id: `report-${String(exportCount).padStart(4, '0')}`,
    login: input.login,
    score: input.score,
    createdAt: new Date().toISOString(),
  };
}
