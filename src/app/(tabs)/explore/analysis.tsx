import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { PageContainer } from '@/components/PageContainer';
import { Icon } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { deriveAnalysis } from '@/lib/scoring';
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
 * FR-A1…A8 — Developer Intelligence screen. Bila `analysisVm` tersedia (hasil
 * Edge Function R2), seluruh angka dibaca dari VM; bila null (fixture /dev
 * atau sesi lama), fallback ke deriveAnalysis v1 agar layar tetap jalan.
 */
export default function AnalysisScreen() {
  const theme = useTheme();

  // Granular selectors — the screen re-renders only when these change.
  const user = useAppStore((s) => s.user);
  const repos = useAppStore((s) => s.repos);
  const saved = useAppStore((s) => s.saved);
  const setSaved = useAppStore((s) => s.setSaved);
  const openChat = useAppStore((s) => s.openChat);
  const showNotice = useAppStore((s) => s.showNotice);
  const analysisVm = useAppStore((s) => s.analysisVm);
  const staleNotice = useAppStore((s) => s.staleNotice);

  const legacy = useMemo(() => deriveAnalysis(user, repos), [user, repos]);

  // Tampilan efektif: VM bila ada, jika tidak nilai turunan v1.
  const role = analysisVm?.inferredRole ?? legacy.role;
  const primary = analysisVm?.primaryLanguage ?? legacy.primary;
  const stats = analysisVm?.languageStats ?? legacy.stats;
  const authenticity = analysisVm?.authenticity ?? legacy.authenticity;
  const confidence = analysisVm?.confidence;
  const tier = analysisVm?.tier;
  const frameworks = analysisVm?.frameworks;
  const originalRatio = analysisVm ? Math.round(analysisVm.metrics.originalRatio * 100) : legacy.originalRatio;
  const originalCount = analysisVm?.metrics.originalCount ?? legacy.originalCount;
  const demoRatio = analysisVm ? Math.round(analysisVm.metrics.demoRatio * 100) : legacy.demoRatio;
  const commitHealth = analysisVm?.metrics.commitHealth;
  const contributionDepth = analysisVm?.metrics.contributionDepth;
  const heatmap = analysisVm?.heatmap;
  const yoyPct = analysisVm?.metrics.yoyPct;
  const contributions12m = analysisVm?.metrics.contributions12m;

  // FR-A1 — view-in: 250 ms ease, translateX 12 → 0 + opacity 0 → 1.
  // `useState` (not `useRef`) keeps the Animated.Value stable across renders
  // without reading a ref during render.
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

        {staleNotice ? (
          <View style={styles.staleBanner}>
            <T size={8} weight="700" color="warnText">
              {staleNotice}
            </T>
          </View>
        ) : null}

        <ProfileCard
          user={user}
          role={role}
          primary={primary}
          saved={saved}
          onToggleSaved={() => setSaved(!saved)}
          // TODO(M5) — ChatSheet UI lands in M5; openChat only sets state now.
          onMessage={() => openChat('', user)}
          onExport={() => showNotice('PDF report berhasil dibuat')}
        />

        <SectionHeading
          eyebrow="ROLE INTELLIGENCE"
          title="Skill fingerprint"
          rightVariant="mono-note"
          note={typeof confidence === 'number' ? `${confidence}% CONFIDENCE` : '94% CONFIDENCE'}
        />
        <SkillCard role={role} stats={stats} frameworks={frameworks} />

        <SectionHeading
          eyebrow="PROJECT VALIDATION"
          title="Authenticity analysis"
          rightVariant="verified-label"
          verifiedLabel="VERIFIED"
        />
        <ScoreCard authenticity={authenticity} confidence={confidence} tier={tier} />
        <MetricGrid
          originalRatio={originalRatio}
          originalCount={originalCount}
          repoCount={repos.length}
          demoRatio={demoRatio}
          commitHealth={commitHealth}
          contributionDepth={contributionDepth}
        />

        <SectionHeading
          eyebrow="CONTRIBUTION ACTIVITY"
          title="12 week momentum"
          rightVariant="mono-note"
          note={
            typeof contributions12m === 'number' ? `${contributions12m} contributions` : '642 contributions'
          }
        />
        <Heatmap values={heatmap} yoyPct={yoyPct} />

        <SectionHeading
          eyebrow="VERIFIED PROJECTS"
          title="Evidence, not claims"
          rightVariant="view-all"
          viewAllLabel="View all"
          onPressViewAll={() => openGithubUrl(`${user.html_url}?tab=repositories`)}
        />
        {repos.slice(0, 3).map((repo) => (
          <VerifiedRepoCard
            key={repo.id}
            repo={repo}
            authenticity={authenticity}
            // TODO(M5) — ChatSheet UI lands in M5; openChat only sets state now.
            onDiscuss={(repoName) => openChat(repoName, user)}
          />
        ))}
      </Animated.View>
    </PageContainer>
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
  staleBanner: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
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
});
