import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageContainer } from '@/components/PageContainer';
import { T } from '@/components/ui/T';
import { feedProjects, type FeedProject } from '@/data/seed';
import { FeedEmpty } from '@/features/feed/FeedEmpty';
import { FeedFilters } from '@/features/feed/FeedFilters';
import { FeedHeading } from '@/features/feed/FeedHeading';
import { FeedIntro } from '@/features/feed/FeedIntro';
import { ProjectCard } from '@/features/feed/ProjectCard';
import { SearchBox } from '@/features/feed/SearchBox';
import { SearchExamples } from '@/features/feed/SearchExamples';
import { filterProjects } from '@/lib/feed';
import {
  ANALYZE_STALE_MESSAGE,
  analyzeDeveloper,
  analyzeErrorMessage,
  vmToGithubRepos,
  vmToGithubUser,
} from '@/lib/analyze';
import { useAppStore } from '@/store/useAppStore';

/**
 * FR-E1…E9 — Project Discovery Feed. Order per design.md §4:
 * Intro → SearchBox → (error) → SearchExamples → Filters → Heading → cards.
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
  const setLoadingId = useAppStore((s) => s.setLoadingId);
  const setError = useAppStore((s) => s.setError);
  const setAnalysisTarget = useAppStore((s) => s.setAnalysisTarget);
  const setAnalysisVm = useAppStore((s) => s.setAnalysisVm);

  const filteredProjects = useMemo(
    () =>
      filterProjects(feedProjects, {
        query,
        role: feedRole,
        location: feedLocation,
        recentOnly,
      }),
    [query, feedRole, feedLocation, recentOnly],
  );

  // FR-E7 — Analyze via BE Edge Function (PRD v2 §8). Tanpa data palsu
  // (POL-5): error upstream ditampilkan di slot FR-E9, Analysis tidak dibuka.
  // Hasil stale tetap dibuka + banner stale di layar Analysis.
  const onAnalyze = useCallback(
    async (project: FeedProject) => {
      // Guard against double taps / taps on other cards while one is running.
      if (useAppStore.getState().loadingId !== null) return;
      setLoadingId(project.id);
      setError('');
      try {
        const result = await analyzeDeveloper(project.developer.login);
        if (result.error) {
          setError(analyzeErrorMessage(result.error));
          return;
        }
        const vm = result.data;
        setAnalysisVm(vm, result.stale ? ANALYZE_STALE_MESSAGE : null);
        setAnalysisTarget(vmToGithubUser(vm), vmToGithubRepos(vm));
        router.push('/explore/analysis');
      } finally {
        setLoadingId(null);
      }
    },
    [router, setLoadingId, setError, setAnalysisTarget, setAnalysisVm],
  );

  return (
    <PageContainer paddingTop={30} keyboardShouldPersistTaps="handled">
      <FeedIntro />
      <SearchBox />
      {/* FR-E9 — error slot under the search box (never set during M2). */}
      {error !== '' ? (
        <T size={12} color="error" style={styles.error}>
          {error}
        </T>
      ) : null}
      <SearchExamples />
      <FeedFilters />
      <FeedHeading count={filteredProjects.length} />

      {filteredProjects.length === 0 ? (
        <FeedEmpty />
      ) : (
        <View style={styles.list}>
          {filteredProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              loading={loadingId === project.id}
              disabled={loadingId !== null && loadingId !== project.id}
              onAnalyze={onAnalyze}
            />
          ))}
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
