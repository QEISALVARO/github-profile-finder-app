// ---------------------------------------------------------------------------
// FE-2 — talent domain contract + adapter interface (Discover / Pipeline).
// ---------------------------------------------------------------------------

import type { DiscoverItem, DiscoverPage, DiscoverQuery, PipelineEntry } from '@/api/contracts';
import type { TalentFilters } from '@/lib/talent';

export type { DiscoverItem, DiscoverPage, DiscoverQuery, PipelineEntry };

export type { TalentFilters as DiscoverFilters } from '@/lib/talent';

export type PipelineSnapshot = {
  entries: PipelineEntry[];
};

export interface TalentAdapter {
  discover(filters: TalentFilters): Promise<DiscoverPage>;
  pipeline(): Promise<PipelineSnapshot>;
  /** Move a candidate between Saved / Interviewing / Hired. */
  setStage(id: string, stage: PipelineEntry['stage']): Promise<PipelineSnapshot>;
}
