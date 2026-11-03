import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/errors';
import { useAnalysis } from '@/api/queries';
import { PageContainer } from '@/components/PageContainer';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { StaleBanner } from '@/components/ui/StaleBanner';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { ScoreBreakdown } from '@/features/analysis/ScoreBreakdown';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/theme/useTheme';

/**
 * B2 / AIR-3 — "Skor saya".
 *
 * Only reachable for accounts with the developer role (the Profile entry is
 * hidden otherwise). The score is read with `useAnalysis(session.login)`;
 * there is deliberately no "Request review" button because the backend flow
 * does not exist yet — only honest future-facing copy.
 */
export default function MyScoreScreen() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const roles = useAuthStore((s) => s.roles);
  const listed = useAuthStore((s) => s.listed);

  const isDeveloper = roles.includes('developer');
  const { data: vm, isLoading, error, isStale, staleSince, refetch } = useAnalysis(
    session?.login ?? null,
  );
  const errorCopy = error ? describeError(error) : null;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/profile');
    }
  };

  if (!session) return null;

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
          Profil
        </T>
      </Pressable>

      {!isDeveloper ? (
        <ErrorState
          title="Khusus akun developer"
          message="Halaman skor pribadi hanya tersedia untuk akun dengan peran developer."
          onRetry={goBack}
          retryLabel="Kembali"
        />
      ) : (
        <>
          <View style={styles.hero}>
            <T size={7} mono ls={1} color="greenText">
              MY SCORE
            </T>
            <T variant="h1Hero" style={styles.heroTitle}>
              Skor saya
            </T>
            <T size={9} color="muted">
              Ringkasan sinyal dan bukti dari profil GitHub publik @{session.login}.
            </T>
          </View>

          {isLoading ? (
            <View style={styles.skeleton}>
              <Skeleton height={118} radius={17} />
              <Skeleton height={210} radius={15} />
            </View>
          ) : null}

          {!isLoading && vm === null ? (
            <Card variant="base" style={styles.notice}>
              <T size={11} weight="700">
                Belum ada analisis untuk akun ini
              </T>
              <T size={8} color="muted" lh={1.55} style={styles.noticeBody}>
                {errorCopy
                  ? errorCopy.message
                  : 'Jalankan analisis untuk menghitung skor dari repository publik Anda.'}
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Analisis profil saya"
                android_ripple={{ color: 'transparent' }}
                hitSlop={hitSlopFor(160, 44)}
                onPress={refetch}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.colors.accent },
                  pressed && styles.pressed,
                ]}>
                <T size={8} weight="800" color="onAccent">
                  Analisis profil saya
                </T>
              </Pressable>
            </Card>
          ) : null}

          {!isLoading && vm !== null ? (
            <>
              {isStale ? <StaleBanner since={staleSince} onReload={refetch} /> : null}

              {!listed ? (
                <Card variant="base" style={styles.notice}>
                  <T size={10} weight="700">
                    Profil Anda belum tampil di feed
                  </T>
                  <T size={8} color="muted" lh={1.55} style={styles.noticeBody}>
                    Listing membutuhkan negara domisili dan persetujuan eksplisit (POL-1/POL-9).
                    Aktifkan di Pengaturan agar recruiter dapat menemukan proyek Anda.
                  </T>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Analisis profil saya"
                    android_ripple={{ color: 'transparent' }}
                    hitSlop={hitSlopFor(160, 44)}
                    onPress={refetch}
                    style={({ pressed }) => [
                      styles.secondaryAction,
                      { borderColor: theme.colors.line, backgroundColor: theme.colors.paper },
                      pressed && styles.pressed,
                    ]}>
                    <T size={8} weight="700" color="greenText">
                      Analisis profil saya
                    </T>
                  </Pressable>
                </Card>
              ) : null}

              <ScoreBreakdown vm={vm} own />

              <T size={8} color="muted" lh={1.5} style={styles.reviewNote}>
                Pengajuan tinjauan ulang tersedia pada rilis berikutnya.
              </T>
            </>
          ) : null}
        </>
      )}
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
  notice: {
    gap: 7,
    marginBottom: 13,
  },
  noticeBody: {
    marginBottom: 4,
  },
  action: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  secondaryAction: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  reviewNote: {
    textAlign: 'center',
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
