// ---------------------------------------------------------------------------
// FE-2 — talent `api` adapter. Wired to Supabase in BE-4.
// ---------------------------------------------------------------------------

import type { DiscoverPage, PipelineEntry } from '@/api/contracts';

import { apiNotReady } from '@/api/errors';

import type { DiscoverFilters, PipelineSnapshot } from './types';

export async function discover(_filters: DiscoverFilters): Promise<DiscoverPage> {
  throw apiNotReady('talent', 'GET /developers (menunggu BE-4)');
}

export async function pipeline(): Promise<PipelineSnapshot> {
  throw apiNotReady('talent', 'GET /pipeline_entries (menunggu BE-4)');
}

export async function setStage(
  _id: string,
  _stage: PipelineEntry['stage'],
): Promise<PipelineSnapshot> {
  throw apiNotReady('talent', 'PATCH /pipeline_entries/:id (menunggu BE-4)');
}
