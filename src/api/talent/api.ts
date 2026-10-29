// ---------------------------------------------------------------------------
// FE-2 — talent `api` adapter (stub). Wired to Supabase in R4.
// ---------------------------------------------------------------------------

import type { DiscoverPage, PipelineEntry } from '@/api/contracts';

import { NotImplementedError } from '@/api/errors';

import type { DiscoverFilters, PipelineSnapshot } from './types';

export async function discover(_filters: DiscoverFilters): Promise<DiscoverPage> {
  throw new NotImplementedError('talent', 'GET /developers');
}

export async function pipeline(): Promise<PipelineSnapshot> {
  throw new NotImplementedError('talent', 'GET /pipeline_entries');
}

export async function setStage(
  _id: string,
  _stage: PipelineEntry['stage'],
): Promise<PipelineSnapshot> {
  throw new NotImplementedError('talent', 'PATCH /pipeline_entries/:id');
}
