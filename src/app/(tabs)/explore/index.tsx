import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import type { FeedItem, FeedPage } from '@/api/contracts';

import { PageContainer } from '@/components/PageContainer';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { T } from '@/components/ui/T';
import { useAnalyze, useFeedInfinite } from '@/api/queries';
import { describeError } from '@/api/errors';
import { ReportProjectSheet } from '@/features/feed/ReportProjectSheet';
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
 * FE-10a: the list comes from `useFeedInfinite`, which returns an infinite-query
 * `FeedPage` union. Which adapter produced it (`mock` | `api`) is decided by
 * `EXPO_PUBLIC_DS_FEED` and never by this screen.
 *
 * FlatList handles the infinite scroll via `onEndReached` → `fetchNextPage`.
 * `removeClippedSubviews` improves scroll perf on low-end devices.
 */
export default function ExploreScreen() {
  const router = useRouter();

  // Granular selectors: typing only re-renders what depends on `query`.
  const query = useAppStore((s) => s.query);
  const feedRole = useAppStore((s) => s.feedRole);
  const feedLocation = useAppStore((s) => s.feedLocation);
  const recentOnly = useAppStore((s) => s.recentOnly);
  const error = useAppStore((s) => s.error);

  const feed = useFeedInfinite({ query, role: feedRole, location: feedLocation, recentOnly });
  const pages = feed.data?.pages ?? [];
  const items = pages.flatMap((page: FeedPage) => page.items);
  const totalCount = feed.data?.pageParams.length ? feed.data.pages[0].totalCount : 0;
  const feedError = feed.error ? describeError(feed.error) : null;
  const isFirstPageLoading = feed.isPending && feed.data === undefined;
  const isFetchingMore = feed.isFetchingNextPage;

  const { analyze, loadingId } = useAnalyze();

  // C4 — report project state
  const [reportItem, setReportItem] = useState<FeedItem | null>(null);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{ success: boolean; error?: string } | null>(null);

  const handleReport = useCallback(
    async (item: FeedItem) => {
      setReportItem(item);
      setShowReportSheet(true);
      setReportFeedback(null);
    },
    [],
  );

  const onReportResult = useCallback(
    (success: boolean, error?: string) => {
      setReportFeedback({ success, error });
      if (success) {
        // Reset report state after a short delay
        setTimeout(() => {
          setShowReportSheet(false);
          setReportItem(null);
          setReportFeedback(null);
        }, 1500);
      }
    },
    [],
  );

  // FR-E7 + D1 + D2 — prefetch *this* developer while only this card spins;
  // on success open Analysis with the login in the route (deep-link friendly).
  const onAnalyze = useCallback(
    async (item: FeedItem) => {
      const result = await analyze(item);
      if (!result.ok) return;
      router.push({ pathname: '/explore/analysis', params: { login: item.developer.login } });
    },
    [analyze, router],
  );

  const headingLabel: 'FEATURED THIS WEEK' | 'SEARCH RESULTS' = useMemo(
    () => (query === '' && feedRole === 'All' && recentOnly === false ? 'FEATURED THIS WEEK' : 'SEARCH RESULTS'),
    [query, feedRole, recentOnly],
  );

  const renderHeader = useCallback(
    () => (
      <>
        <FeedIntro />
        <SearchBox />
        {/* FR-E9 — error slot under the search box (validation + Analyze errors). */}
        {error !== '' ? (
          <T size={12} color="error" style={styles.error}>
            {error}
          </T>
        ) : null}
        <SearchExamples />
        <FeedFilters />
        <FeedHeading count={totalCount} label={headingLabel} />
      </>
    ),
    [error, totalCount, headingLabel],
  );

  const renderFooter = useCallback(
    () => (isFetchingMore ? (
      <View style={styles.footerLoader}>
        <Skeleton height={24} radius={8} />
        <T size={10} color="muted" style={styles.footerText}>
          Memuat lanjutan...
        </T>
      </View>
    ) : null),
    [isFetchingMore],
  );

  if (feed.isError && feedError) {
    return (
      <PageContainer paddingTop={30} keyboardShouldPersistTaps="handled">
        {renderHeader()}
        <ErrorState
          title="Feed gagal dimuat"
          message={feedError.message}
          onRetry={() => feed.refetch()}
        />
      </PageContainer>
    );
  }

  if (isFirstPageLoading) {
    return (
      <PageContainer paddingTop={30} keyboardShouldPersistTaps="handled">
        {renderHeader()}
        <View style={styles.loadingList}>
          <Skeleton height={318} radius={18} />
          <Skeleton height={318} radius={18} />
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer paddingTop={30} keyboardShouldPersistTaps="handled">
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const cardId = String(item.id);
          return (
            <ProjectCard
              item={item}
              index={index}
              // D2 — spinner only on the tapped card, others disabled.
              loading={loadingId === cardId}
              disabled={loadingId !== null && loadingId !== cardId}
              onAnalyze={onAnalyze}
              onReport={handleReport}
            />
          );
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={FeedEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={() => {
          if (!isFetchingMore && feed.hasNextPage) {
            void feed.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        maxToRenderPerBatch={5}
        windowSize={10}
      />
      <ReportProjectSheet
        visible={showReportSheet}
        item={reportItem}
        onReport={onReportResult}
        onClose={() => {
          setShowReportSheet(false);
          setReportItem(null);
          setReportFeedback(null);
        }}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: 10,
    marginHorizontal: 2,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 6,
  },
  loadingList: {
    gap: 12,
  },
});
