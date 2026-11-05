import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/errors';
import { useAnalysis } from '@/api/queries';
import { PageContainer } from '@/components/PageContainer';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { StaleBanner } from '@/components/ui/StaleBanner';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { ScoreBreakdown } from '@/features/analysis/ScoreBreakdown';
import { openGithubUrl } from '@/lib/links';
import { useTheme } from '@/theme/useTheme';

/**
 * B1 / AIR-2 — score evidence detail.
 *
 * Every number comes from `AnalysisVM` (via `useAnalysis`); this screen never
 * recomputes a score, it only explains the five components and lists the
 * evidence with a safe external opener.
 */
export default function EvidenceScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ login?: string | string[] }>();
  const login = Array.isArray(params.login) ? params.login[0] : (params.login ?? null);

  const { data: vm, isLoading, error, isStale, staleSince, refetch } = useAnalysis(login);
  const errorCopy = error ? describeError(error) : null;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/explore');
    }
  };

  return (
    <PageContainer paddingTop={27}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kembali"
        hitSlop={hitSlopFor(120, 24)}
        onPress={goBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <View style={styles.backIcon}>
          <Icon name="arrow" size={16} color={theme.colors.muted} />
        </View>
        <T size={8} weight="700" color="muted">
          {vm ? `@${vm.user.login}` : 'Kembali'}
        </T>
      </Pressable>

      <View style={styles.hero}>
        <T size={7} mono ls={1} color="greenText">
          SCORE EVIDENCE
        </T>
        <T variant="h1Hero" style={styles.heroTitle}>
          Rincian skor
        </T>
        <T size={9} color="muted">
          Setiap komponen dan bukti yang membentuk skor ini, tanpa perhitungan ulang di aplikasi.
        </T>
      </View>

      {isLoading ? (
        <View style={styles.skeleton}>
          <Skeleton height={118} radius={17} />
          <Skeleton height={210} radius={15} />
          <Skeleton height={130} radius={15} />
        </View>
      ) : null}

      {!isLoading && vm === null && errorCopy ? (
        <ErrorState
          title={errorCopy.title}
          message={errorCopy.message}
          onRetry={refetch}
          githubUrl={
            errorCopy.showGithub && login ? `https://github.com/${login}` : undefined
          }
        />
      ) : null}

      {!isLoading && vm !== null ? (
        <>
          {isStale ? <StaleBanner since={staleSince} onReload={refetch} /> : null}
          <ScoreBreakdown vm={vm} />

          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Buka profil GitHub ${vm.user.login}`}
            hitSlop={hitSlopFor(200, 44)}
            onPress={() => openGithubUrl(vm.user.htmlUrl)}
            style={({ pressed }) => [styles.profileLink, pressed && styles.pressed]}>
            <T size={8} weight="700" color="greenText">
              Buka profil GitHub
            </T>
            <Icon name="arrow" size={14} color={theme.colors.greenText} />
          </Pressable>
        </>
      ) : null}
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
  backIcon: {
    transform: [{ rotate: '180deg' }],
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
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.85,
  },
});
