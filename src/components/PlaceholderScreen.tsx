import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { PageContainer } from '@/components/PageContainer';
import { Chip } from '@/components/ui/Chip';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { useTheme } from '@/theme/useTheme';

/**
 * Placeholder screen used by M0 for all four tabs (Gate M0: "4 tab kosong
 * dengan judul placeholder"). Feature milestones replace these bodies.
 * In development it also links to the internal /dev design-system showcase.
 */
export function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useTheme();

  return (
    <PageContainer>
      <View style={styles.center}>
        <T size={28} weight="800" ls={-0.6} style={styles.title}>
          {title}
        </T>
        <T size={13} color="muted" lh={1.6} style={styles.subtitle}>
          {subtitle}
        </T>
        <Chip variant="soft" style={styles.chip}>
          M0 · PLACEHOLDER
        </Chip>

        {__DEV__ ? (
          <Link href="/dev" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Buka design system showcase"
              hitSlop={hitSlopFor(120, 20)}
              style={({ pressed }) => [
                styles.devLink,
                { borderColor: theme.colors.line, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <T size={7} mono color="greenText" ls={1}>
                OPEN /dev SHOWCASE
              </T>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
  chip: {
    marginTop: 12,
  },
  devLink: {
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});

export default PlaceholderScreen;
