// ---------------------------------------------------------------------------
// FE-2 — analysis adapter barrel (EXPO_PUBLIC_DS_ANALYSIS).
// ---------------------------------------------------------------------------

import type { AnalysisVM } from '@/api/contracts';

import { getDataSource } from '@/config/dataSource';

import * as api from './api';
import * as mock from './mock';
import type { AnalysisAdapter, AnalysisTarget } from './types';

export * from './types';
export { buildAnalysisVM, vmToGithubUser } from './mock';

export const analysisAdapter: AnalysisAdapter = {
  fetchAnalysis: (target: AnalysisTarget): Promise<AnalysisVM> =>
    getDataSource('analysis') === 'api'
      ? api.fetchAnalysis(target)
      : mock.fetchAnalysis(target),
};
