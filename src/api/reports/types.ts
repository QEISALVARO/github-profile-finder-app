// ---------------------------------------------------------------------------
// FE-2 — reports domain types (PRD v2 §13).
//
// Exporting a report is a *mock toast* in v1 (PRD §1.2); the adapter exists so
// the real `expo-print` + `reports` table flow can land without touching UI.
// ---------------------------------------------------------------------------

export type ReportSummary = {
  id: string;
  login: string;
  score: number;
  createdAt: string;
};

export type ExportReportInput = {
  login: string;
  score: number;
};

export interface ReportsAdapter {
  exportReport(input: ExportReportInput): Promise<ReportSummary>;
}
