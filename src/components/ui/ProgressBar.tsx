import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ColorToken } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type ProgressBarProps = {
  /** 0–100. */
  value: number;
  height?: number;
  radius?: number;
  trackColor?: ColorToken;
  fillColor?: ColorToken;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** design.md §3.10 — 5 dp track with an accent fill. */
export function ProgressBar({
  value,
  height = 5,
  radius = 5,
  trackColor = 'paper',
  fillColor = 'accent',
  accessibilityLabel,
  style,
}: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[
        styles.track,
        {
          height,
          borderRadius: radius,
          backgroundColor: theme.colors[trackColor],
        },
        style,
      ]}>
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          borderRadius: radius,
          backgroundColor: theme.colors[fillColor],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
});
