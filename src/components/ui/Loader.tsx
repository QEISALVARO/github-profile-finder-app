import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import type { ColorToken } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const DURATION = 700;

export type LoaderProps = {
  size?: number;
  /** Ring colour; the track is the same colour at 25% opacity. */
  color?: ColorToken;
  thickness?: number;
  accessibilityLabel?: string;
};

/** design.md §3.24 — 700 ms linear rotation, used standalone and in buttons. */
export function Loader({
  size = 17,
  color = 'ink',
  thickness = 2,
  accessibilityLabel = 'Loading',
}: LoaderProps) {
  const theme = useTheme();
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();

    return () => animation.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.loader,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderColor: theme.colors.loaderTrack,
          borderTopColor: theme.colors[color],
          transform: [{ rotate }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  loader: {},
});
