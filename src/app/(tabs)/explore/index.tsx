import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import type { FeedItem } from '@/api/contracts';

import { PageContainer } from '@/components/PageContainer';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { T } from '@/components/ui/T';
import { useAnalyze, useFeed } from '@/api/queries';
import { FeedEmpty } from '@/features/feed/FeedEmpty';
import { FeedFilters } from '@/features/feed/FeedFilters';
import { FeedHeading } from '@/features/feed/FeedHeading';
import { FeedIntro } from '@/features/feed/FeedIntro';
import { ProjectCard } from '@/features/feed/ProjectCard';
import { SearchBox } from '@/features/feed/SearchBox';
import { SearchExamples } from '@/features/feed/SearchExamples';
import { useAppStore } from '@/store/useAppStore';

/**
 * FR-E1…E9 — Project Discovery Feed (design.md §4 order: Intro → SearchBox →
 * (error) → SearchExamples → Filters → Heading → cards).
 *
 * FE-2: the list comes from `useFeed`, which returns a contract `FeedPage`.
 * Which adapter produced it (`mock` | `api`) is decided by
 * `EXPO_PUBLIC_DS_FEED` and never by this screen.
 */
export default function ExploreScreen() {
  const router = useRouter();

  // Granular selectors: typing only re-renders what depends on `query`.
  const query = useAppStore((s) => s.query);
  const feedRole = useAppStore((s) => s.feedRole);
  const feedLocation = useAppStore((s) => s.feedLocation);
  const recentOnly = useAppStore((s) => s.recentOnly);
  const error = useAppStore((s) => s.error);
  const loadingId = useAppStore((s) => s.loadingId);

  const feed = useFeed({ query, role: feedRole, location: feedLocation, recentOnly });
  const items = feed.data?.items ?? [];

  const analyze = useAnalyze();

  // FR-E7 + D1 — the Analysis screen shows *the tapped developer's* data.
  // `useAnalyze` warms the cache while the card shows its spinner (D2).
  const onAnalyze = useCallback(
    async (item: FeedItem) => {
      await analyze(
        { login: item.developer.login, person: null, project: item },
        item.id,
      );
      router.push('/explore/analysis');
    },
    [analyze, router],
  );

  return (
    <PageContainer paddingTop={30} keyboardShouldPersistTaps="handled">
      <FeedIntro />
      <SearchBox />
      {/* FR-E9 — error slot under the search box (store-level validation). */}
      {error !== '' ? (
        <T size={12} color="error" style={styles.error}>
          {error}
        </T>
      ) : null}
      <SearchExamples />
      <FeedFilters />
      <FeedHeading count={items.length} />

      {feed.isError ? (
        <ErrorState
          title="Feed gagal dimuat"
          message={feed.error instanceof Error ? feed.error.message : undefined}
          onRetry={() => feed.refetch()}
        />
      ) : feed.isPending ? (
        <View style={styles.list}>
          <Skeleton height={318} radius={18} />
          <Skeleton height={318} radius={18} />
        </View>
      ) : items.length === 0 ? (
        <FeedEmpty />
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => {
            const cardId = String(item.id);
            return (
              <ProjectCard
                key={item.id}
                item={item}
                index={index}
                loading={loadingId === cardId}
                disabled={loadingId !== null && loadingId !== cardId}
                onAnalyze={onAnalyze}
              />
            );
          })}
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: 10,
    marginHorizontal: 2,
  },
  list: {
    gap: 12,
  },
});
