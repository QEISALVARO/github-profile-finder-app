import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/useTheme';

/**
 * FR-E8 — empty state (design.md §3.7). "Reset filters" restores query,
 * role, location and the Active 30d toggle (never error/loadingId).
 */
export function FeedEmpty() {
  const theme = useTheme();
  const resetFeedFilters = useAppStore((s) => s.resetFeedFilters);

  return (
    <View style={[styles.container, { borderColor: theme.colors.line }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.colors.accentSoft }]}>
        <Icon name="search" size={24} color={theme.colors.greenText} />
      </View>

      <T size={12} weight="700" style={styles.title}>
        Tidak ada proyek yang cocok
      </T>
      <T size={8} color="muted" style={styles.body}>
        Coba keyword atau filter yang lebih luas.
      </T>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset filters"
        android_ripple={{ color: 'transparent' }}
        hitSlop={hitSlopFor(90, 30)}
        onPress={resetFeedFilters}
        style={({ pressed }) => [
          styles.resetButton,
          { backgroundColor: theme.colors.accent },
          pressed && styles.pressed,
        ]}>
        <T size={7} weight="800" color="onAccent">
          Reset filters
        </T>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  resetButton: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default FeedEmpty;
