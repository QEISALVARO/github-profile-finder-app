import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { PageContainer } from '@/components/PageContainer';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { StaleBanner } from '@/components/ui/StaleBanner';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { useAnalysis, useExportReport } from '@/api/queries';
import { describeError } from '@/api/errors';
import { vmToGithubUser } from '@/lib/analyze';
import { openGithubUrl } from '@/lib/links';
import { MetricGrid } from '@/features/analysis/MetricGrid';
import { Heatmap } from '@/features/analysis/Heatmap';
import { ProfileCard } from '@/features/analysis/ProfileCard';
import { ScoreCard } from '@/features/analysis/ScoreCard';
import { SkillCard } from '@/features/analysis/SkillCard';
import { VerifiedRepoCard } from '@/features/analysis/VerifiedRepoCard';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/useTheme';

/**
 * FR-A1…A8 — Developer Intelligence screen.
 *
 * FE-2: the VM is fetched through `useAnalysis(login)` where `login` comes from
 * the route (`/explore/analysis?login=octocat`), so deep links and refresh both
 * work without any global analysis state. The screen renders a skeleton while
 * loading, `ErrorState` per `ErrorBody.code` on failure, and `StaleBanner`
 * whenever the VM reports cached-but-aged data.
 */
export default function AnalysisScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ login?: string | string[] }>();
  const login = Array.isArray(params.login) ? params.login[0] : (params.login ?? null);

  const saved = useAppStore((s) => s.saved);
  const setSaved = useAppStore((s) => s.setSaved);
  const openChat = useAppStore((s) => s.openChat);
  const showNotice = useAppStore((s) => s.showNotice);

  const { data: vm, isLoading, error, isStale, staleSince, refetch } = useAnalysis(login);
  const exportReport = useExportReport();
  const errorCopy = error ? describeError(error) : null;

  // FR-A1 — view-in: 250 ms ease, translateX 12 → 0 + opacity 0 → 1.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [progress]);

  const animatedStyle = useMemo(
    () => ({
      opacity: progress,
      transform: [
        { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
      ],
    }),
    [progress],
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Deep-link entry: no stack to pop, return to the feed.
      router.replace('/explore');
    }
  };

  const handleExport = () => {
    if (!vm) return;
    exportReport.mutate(
      { login: vm.user.login, score: vm.authenticity },
      {
        onSuccess: () => showNotice('PDF report berhasil dibuat'),
        onError: (exportError) =>
          showNotice(exportError instanceof Error ? exportError.message : 'Export gagal'),
      },
    );
  };

  return (
    <PageContainer paddingTop={27}>
      <Animated.View style={animatedStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to project feed"
          hitSlop={hitSlopFor(160, 24)}
          onPress={goBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <View style={styles.backIcon}>
            <Icon name="arrow" size={16} color={theme.colors.muted} />
          </View>
          <T size={8} weight="700" color="muted">
            Back to project feed
          </T>
        </Pressable>

        <View style={styles.hero}>
          <T size={7} mono ls={1} color="greenText">
            DEVELOPER INTELLIGENCE
          </T>
          <T variant="h1Hero" style={styles.heroTitle}>
            Candidate evidence
          </T>
          <T size={9} color="muted">
            Analisis otomatis dari repository dan aktivitas GitHub publik.
          </T>
        </View>

        {isLoading ? <AnalysisSkeleton /> : null}

        {!isLoading && vm === null && errorCopy ? (
          <ErrorState
            title={errorCopy.title}
            message={errorCopy.message}
            onRetry={refetch}
            githubUrl={errorCopy.showGithub && login ? `https://github.com/${login}` : undefined}
          />
        ) : null}

        {!isLoading && vm !== null ? (
          <>
            {isStale ? <StaleBanner since={staleSince} onReload={refetch} /> : null}

            <ProfileCard
              vm={vm}
              saved={saved}
              onToggleSaved={() => setSaved(!saved)}
              onMessage={() => openChat('', vmToGithubUser(vm))}
              onExport={handleExport}
            />

            <SectionHeading
              eyebrow="ROLE INTELLIGENCE"
              title="Skill fingerprint"
              rightVariant="mono-note"
              note={`${vm.confidence}% CONFIDENCE`}
            />
            <SkillCard vm={vm} />

            <SectionHeading
              eyebrow="PROJECT VALIDATION"
              title="Authenticity analysis"
              rightVariant="verified-label"
              verifiedLabel="VERIFIED"
            />
            <ScoreCard vm={vm} />
            <MetricGrid vm={vm} />

            <Heatmap
              values={vm.heatmap}
              contributions={vm.metrics.contributions12m}
              yoyPct={vm.metrics.yoyPct}
            />

            <SectionHeading
              eyebrow="VERIFIED PROJECTS"
              title="Evidence, not claims"
              rightVariant="view-all"
              viewAllLabel="View all"
              onPressViewAll={() => openGithubUrl(`${vm.user.htmlUrl}?tab=repositories`)}
            />
            {vm.repos.slice(0, 3).map((repo) => (
              <VerifiedRepoCard
                key={repo.id}
                repo={repo}
                onDiscuss={(repoName) => openChat(repoName, vmToGithubUser(vm))}
              />
            ))}
          </>
        ) : null}
      </Animated.View>
    </PageContainer>
  );
}

/** Loading state — mirrors the final layout so nothing jumps when data lands. */
function AnalysisSkeleton() {
  return (
    <View style={styles.skeleton}>
      <Skeleton width="45%" height={10} />
      <Skeleton width="70%" height={24} />
      <Skeleton height={168} radius={20} />
      <Skeleton width="40%" height={12} />
      <Skeleton height={132} radius={17} />
      <Skeleton height={132} radius={17} />
      <Skeleton height={180} radius={17} />
      <Skeleton width="45%" height={12} />
      <Skeleton height={92} radius={15} />
      <Skeleton height={92} radius={15} />
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    marginTop: -5,
    marginBottom: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  backIcon: {
    transform: [{ rotate: '180deg' }],
  },
  pressed: {
    opacity: 0.85,
  },
  hero: {
    marginBottom: 18,
    gap: 0,
  },
  heroTitle: {
    marginTop: 4,
    marginBottom: 4,
  },
  skeleton: {
    gap: 14,
  },
});
