import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { PageContainer } from '@/components/PageContainer';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/useTheme';

/**
 * Placeholder for the Developer Intelligence screen (FR-A1…A8, milestone M3).
 * M2 only needs: back navigation + the selected developer's name/@login so
 * the stubbed Analyze flow (FR-E7) can round-trip.
 */
export default function AnalysisScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useAppStore((s) => s.user);

  return (
    <PageContainer paddingTop={30}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to project feed"
        android_ripple={{ color: 'transparent' }}
        hitSlop={hitSlopFor(140, 24)}
        onPress={() => router.back()}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <View style={styles.backIcon}>
          <Icon name="arrow" size={16} color={theme.colors.muted} />
        </View>
        <T size={8} weight="700" color="muted">
          Back to project feed
        </T>
      </Pressable>

      <T variant="h1Hero" style={styles.name}>
        {user.name ?? user.login}
      </T>
      <T size={11} color="muted">
        {`@${user.login}`}
      </T>

      <Chip variant="soft" style={styles.chip}>
        PLACEHOLDER · M3
      </Chip>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -5,
    marginBottom: 17,
  },
  backIcon: {
    transform: [{ rotate: '180deg' }],
  },
  name: {
    marginTop: 4,
    marginBottom: 2,
  },
  chip: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.85,
  },
});
