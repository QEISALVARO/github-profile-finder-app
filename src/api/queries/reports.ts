// ---------------------------------------------------------------------------
// FE-2 — report hooks (toast-only in v1, PRD §1.2).
// ---------------------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { shouldRetry } from '@/api/errors';
import {
  reportsAdapter,
  type ExportReportInput,
  type ReportSummary,
} from '@/api/reports';

const REPORTS_QUERY_KEY = ['reports', 'list'] as const;

export function useReports() {
  return useQuery({
    queryKey: REPORTS_QUERY_KEY,
    queryFn: (): Promise<ReportSummary[]> => reportsAdapter.list(),
    retry: shouldRetry,
  });
}

export function useExportReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ExportReportInput): Promise<ReportSummary> =>
      reportsAdapter.exportReport(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEY });
    },
  });
}
