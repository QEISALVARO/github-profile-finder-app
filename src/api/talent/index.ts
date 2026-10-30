// ---------------------------------------------------------------------------
// FE-2 — talent adapter barrel (EXPO_PUBLIC_DS_TALENT).
// ---------------------------------------------------------------------------

import type { DiscoverPage, PipelineEntry } from '@/api/contracts';

import { getDataSource } from '@/config/dataSource';

import * as api from './api';
import * as mock from './mock';
import type { DiscoverFilters, PipelineSnapshot, TalentAdapter } from './types';

export * from './types';

export const talentAdapter: TalentAdapter = {
  discover: (filters: DiscoverFilters): Promise<DiscoverPage> =>
    getDataSource('talent') === 'api' ? api.discover(filters) : mock.discover(filters),

  pipeline: (): Promise<PipelineSnapshot> =>
    getDataSource('talent') === 'api' ? api.pipeline() : mock.pipeline(),

  setStage: (id: string, stage: PipelineEntry['stage']): Promise<PipelineSnapshot> =>
    getDataSource('talent') === 'api' ? api.setStage(id, stage) : mock.setStage(id, stage),
};
