import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  /** Number of stacked lines for a text block (last line is shortened). */
  lines?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * FE-2 — loading placeholder (PRD v2 §15 "state data nyata").
 *
 * One shared pulse per instance: opacity 0.45 → 0.9 over 900 ms, matching the
 * rhythm of design.md's `spin` without a shimmer gradient (cheaper on low-end
 * devices, identical contrast in light and dark).
 */
export function Skeleton({
  width = '100%',
  height = 12,
  radius = 6,
  lines = 1,
  gap = 8,
  style,
}: SkeletonProps) {
  const theme = useTheme();
  const [pulse] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const blocks = Array.from({ length: lines }, (_, index) => index);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Memuat"
      style={[styles.column, { gap }, style, { opacity: pulse }]}>
      {blocks.map((index) => {
        const isLast = index === blocks.length - 1 && lines > 1;
        return (
          <View
            key={index}
            style={[
              styles.block,
              { width: isLast ? '62%' : width, height, borderRadius: radius, backgroundColor: theme.colors.line },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: '100%',
  },
  block: {
    overflow: 'hidden',
  },
});
