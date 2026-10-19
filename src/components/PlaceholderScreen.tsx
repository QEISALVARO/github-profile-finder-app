import { StyleSheet, Text, View } from 'react-native';

import { PageContainer } from '@/components/PageContainer';
import { useTheme } from '@/theme/useTheme';

/**
 * Placeholder screen used by M0 for all four tabs (Gate M0: "4 tab kosong
 * dengan judul placeholder"). Feature milestones replace these bodies.
 */
export function PlaceholderScreen({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const { colors } = useTheme();

  return (
    <PageContainer>
      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.text, fontFamily: 'Manrope_800ExtraBold' }]}>
          {title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.textSecondary, fontFamily: 'Manrope_500Medium' },
          ]}
        >
          {subtitle}
        </Text>
        <View
          style={[
            styles.chip,
            { borderColor: colors.accent, backgroundColor: colors.accentSoft },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              { color: colors.accent, fontFamily: 'Manrope_700Bold' },
            ]}
          >
            M0 · PLACEHOLDER
          </Text>
        </View>
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
    fontSize: 28,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 21,
  },
  chip: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 10,
    letterSpacing: 1,
  },
});

export default PlaceholderScreen;
