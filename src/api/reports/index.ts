// ---------------------------------------------------------------------------
// FE-2 — reports adapter barrel (EXPO_PUBLIC_DS_REPORTS).
// ---------------------------------------------------------------------------

import { getDataSource } from '@/config/dataSource';

import * as api from './api';
import * as mock from './mock';
import type { ExportReportInput, ReportsAdapter, ReportSummary } from './types';

export * from './types';

export const reportsAdapter: ReportsAdapter = {
  list: (): Promise<ReportSummary[]> =>
    getDataSource('reports') === 'api' ? api.list() : mock.list(),

  exportReport: (input: ExportReportInput): Promise<ReportSummary> =>
    getDataSource('reports') === 'api' ? api.exportReport(input) : mock.exportReport(input),
};
