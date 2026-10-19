import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/useTheme';

/** design.md §3.1 — content height + status bar inset. */
const BAR_HEIGHT = 72;
const THEME_BUTTON = 39;

/**
 * FR-G1 — Global TopBar: brand mark rotated −4°, "git"+"scope" wordmark,
 * "LIVE DATA" indicator and the theme toggle (FR-G2).
 */
export function TopBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  return (
    <View
      style={[
        styles.container,
        {
          height: BAR_HEIGHT + insets.top,
          paddingTop: insets.top,
          backgroundColor: theme.colors.topbarBg,
          borderBottomColor: theme.colors.line,
        },
      ]}
    >
      <View style={styles.brand}>
        <View style={[styles.mark, { backgroundColor: theme.colors.accent }]}>
          <Icon name="github" size={25} color={theme.colors.onAccent} />
        </View>
        <T size={18} weight="800" ls={-0.8} color="ink">
          git
          <T size={18} weight="500" color="muted">
            scope
          </T>
        </T>
      </View>

      <View style={styles.actions}>
        <View style={styles.live}>
          <View
            style={[
              styles.liveDot,
              { backgroundColor: theme.colors.accent, borderColor: theme.colors.accentSoft },
            ]}
          />
          <T size={7} mono color="muted" ls={0.7}>
            LIVE DATA
          </T>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle tema"
          onPress={toggleTheme}
          hitSlop={hitSlopFor(THEME_BUTTON, THEME_BUTTON)}
          style={({ pressed }) => [
            styles.themeButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.line,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Icon name="moon" size={20} color={theme.colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    zIndex: 5,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 37,
    height: 37,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 3,
  },
  themeButton: {
    width: THEME_BUTTON,
    height: THEME_BUTTON,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TopBar;
