// ---------------------------------------------------------------------------
// FE-2 — central TanStack Query keys.
//
// One place defines the cache shape so a mutation (send message, move stage)
// can invalidate exactly the entries it affects without guessing strings.
// ---------------------------------------------------------------------------

import type { FeedFilters } from '@/lib/feed';
import type { TalentFilters } from '@/lib/talent';

export const queryKeys = {
  feed: (filters: FeedFilters) => ['feed', filters] as const,
  feedFacets: (filters: FeedFilters) => ['feed', 'facets', filters] as const,
  analysis: (login: string) => ['analysis', login] as const,
  discover: (filters: TalentFilters) => ['talent', 'discover', filters] as const,
  pipeline: () => ['talent', 'pipeline'] as const,
  conversations: () => ['chat', 'conversations'] as const,
  messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
  session: () => ['auth', 'session'] as const,
} as const;
