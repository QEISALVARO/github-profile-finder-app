import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { hitSlopFor } from './hit-slop';

const TRACK_WIDTH = 36;
const TRACK_HEIGHT = 20;
const KNOB_SIZE = 16;
const TRAVEL = 16;
const DURATION = 200;

export type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/** design.md §3.21 — 36×20 track, 16 dp knob, 200 ms translate. */
export function Switch({ value, onValueChange, disabled = false, accessibilityLabel }: SwitchProps) {
  const theme = useTheme();
  const [progress] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: DURATION,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress, value]);

  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.line, theme.colors.accent],
  });

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRAVEL],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      android_ripple={{ color: 'transparent' }}
      disabled={disabled}
      hitSlop={hitSlopFor(TRACK_WIDTH, TRACK_HEIGHT)}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            styles.knob,
            { backgroundColor: theme.colors.white, transform: [{ translateX }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
