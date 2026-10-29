// ---------------------------------------------------------------------------
// FE-2 — report export mutation (toast-only in v1, PRD §1.2).
// ---------------------------------------------------------------------------

import { useMutation } from '@tanstack/react-query';

import { reportsAdapter, type ExportReportInput, type ReportSummary } from '@/api/reports';

export function useExportReport() {
  return useMutation({
    mutationFn: (input: ExportReportInput): Promise<ReportSummary> =>
      reportsAdapter.exportReport(input),
  });
}
