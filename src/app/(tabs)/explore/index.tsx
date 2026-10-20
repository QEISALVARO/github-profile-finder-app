import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageContainer } from '@/components/PageContainer';
import { T } from '@/components/ui/T';
import {
  fallbackRepos,
  feedProjects,
  type FeedProject,
  type GithubUser,
} from '@/data/seed';
import { FeedEmpty } from '@/features/feed/FeedEmpty';
import { FeedFilters } from '@/features/feed/FeedFilters';
import { FeedHeading } from '@/features/feed/FeedHeading';
import { FeedIntro } from '@/features/feed/FeedIntro';
import { ProjectCard } from '@/features/feed/ProjectCard';
import { SearchBox } from '@/features/feed/SearchBox';
import { SearchExamples } from '@/features/feed/SearchExamples';
import { filterProjects } from '@/lib/feed';
import { useAppStore } from '@/store/useAppStore';

/**
 * TODO(M3): replace with the fallback builder from PRD §5.2 (lib/github.ts).
 * Until the real fetch exists this keeps the Analysis screen fed with the
 * project's own developer data.
 */
function fallbackUserFromProject(project: FeedProject): GithubUser {
  return {
    login: project.developer.login,
    name: project.developer.name,
    avatar_url: project.developer.avatar,
    bio: project.description,
    followers: project.stars,
    following: 42,
    public_repos: 18,
    location: project.location,
    html_url: `https://github.com/${project.developer.login}`,
  };
}

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
  const setAnalysisTarget = useAppStore((s) => s.setAnalysisTarget);

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

  // FR-E7 stub — M3 replaces the simulation with the real GitHub flow (§5.2).
  const onAnalyze = useCallback(
    async (project: FeedProject) => {
      // Guard against double taps / taps on other cards while one is running.
      if (useAppStore.getState().loadingId !== null) return;
      setLoadingId(project.id);
      try {
        // TODO(M3): ganti dengan analyzeDeveloper (PRD §5.2).
        await new Promise((resolve) => setTimeout(resolve, 600));
        // TODO(M3): ganti dengan hasil fetch user/repos + fallback (PRD §5.2).
        setAnalysisTarget(fallbackUserFromProject(project), fallbackRepos);
        router.push('/explore/analysis');
      } finally {
        setLoadingId(null);
      }
    },
    [router, setLoadingId, setAnalysisTarget],
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
