import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/useTheme';

/**
 * FR-G1 — Global TopBar: brand mark rotated −4°, "git"+"scope" wordmark,
 * "LIVE DATA" pill, and the theme toggle (FR-G2).
 */
export function TopBar() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const themeMode = useAppStore((s) => s.themeMode);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  const themeIcon =
    themeMode === 'dark' ? 'sun' : themeMode === 'light' ? 'moon' : 'refresh';

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.two,
          paddingHorizontal: spacing.five,
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.brandRow}>
        <View
          style={[
            styles.mark,
            { backgroundColor: colors.accent, transform: [{ rotate: '-4deg' }] },
          ]}
        >
          <Icon name="branch" size={16} color={colors.onAccent} strokeWidth={2.2} />
        </View>
        <Text style={[styles.wordmark, { color: colors.text }]}>
          <Text style={{ fontFamily: 'Manrope_800ExtraBold' }}>git</Text>
          <Text style={{ fontFamily: 'Manrope_400Regular', color: colors.textSecondary }}>
            scope
          </Text>
        </Text>
      </View>

      <View style={styles.actions}>
        <View
          style={[
            styles.livePill,
            { backgroundColor: colors.accentSoft, borderColor: colors.accent },
          ]}
        >
          <View style={[styles.liveDot, { backgroundColor: colors.live }]} />
          <Text
            style={[
              styles.liveText,
              { color: colors.accent, fontFamily: 'Manrope_800ExtraBold' },
            ]}
          >
            LIVE DATA
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle tema"
          onPress={toggleTheme}
          hitSlop={8}
          style={({ pressed }) => [
            styles.themeButton,
            {
              backgroundColor: colors.surfaceElement,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Icon name={themeIcon} size={18} color={colors.text} />
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 20,
    letterSpacing: -0.4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  themeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TopBar;
