import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import type { ColorToken } from '@/theme/tokens';
import type { FontWeight } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';
import { T } from './T';
import { hitSlopFor } from './hit-slop';

export type ChipVariant = 'default' | 'active' | 'accent' | 'soft' | 'dashed' | 'role-tag';

type VariantStyle = {
  background: ColorToken | 'transparent';
  border: ColorToken | 'transparent';
  borderStyle: 'solid' | 'dashed';
  text: ColorToken;
  weight: FontWeight;
  mono: boolean;
  size: number;
  radius: number;
};

const VARIANTS: Record<ChipVariant, VariantStyle> = {
  default: {
    background: 'paper',
    border: 'line',
    borderStyle: 'solid',
    text: 'muted',
    weight: '500',
    mono: true,
    size: 6,
    radius: 6,
  },
  active: {
    background: 'accent',
    border: 'accent',
    borderStyle: 'solid',
    text: 'onAccent',
    weight: '700',
    mono: true,
    size: 6,
    radius: 6,
  },
  accent: {
    background: 'accent',
    border: 'accent',
    borderStyle: 'solid',
    text: 'onAccent',
    weight: '700',
    mono: true,
    size: 6,
    radius: 6,
  },
  soft: {
    background: 'accentSoft',
    border: 'transparent',
    borderStyle: 'solid',
    text: 'greenText',
    weight: '700',
    mono: true,
    size: 6,
    radius: 6,
  },
  dashed: {
    background: 'transparent',
    border: 'line',
    borderStyle: 'dashed',
    text: 'muted',
    weight: '500',
    mono: true,
    size: 6,
    radius: 7,
  },
  'role-tag': {
    background: 'accent',
    border: 'accent',
    borderStyle: 'solid',
    text: 'onAccent',
    weight: '700',
    mono: false,
    size: 8,
    radius: 8,
  },
};

export type ChipProps = {
  children: ReactNode;
  variant?: ChipVariant;
  onPress?: () => void;
  mono?: boolean;
  weight?: FontWeight;
  size?: number;
  radius?: number;
  selected?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/** Compact label used for roles, stacks, tags and filters. */
export function Chip({
  children,
  variant = 'default',
  onPress,
  mono,
  weight,
  size,
  radius,
  selected,
  accessibilityLabel,
  style,
  textStyle,
}: ChipProps) {
  const theme = useTheme();
  const preset = VARIANTS[variant];
  const resolvedRadius = radius ?? preset.radius;

  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      borderRadius: resolvedRadius,
      backgroundColor:
        preset.background === 'transparent' ? 'transparent' : theme.colors[preset.background],
      borderColor: preset.border === 'transparent' ? 'transparent' : theme.colors[preset.border],
      borderStyle: preset.borderStyle,
    },
    style,
  ];

  const content = (
    <T
      size={size ?? preset.size}
      weight={weight ?? preset.weight}
      mono={mono ?? preset.mono}
      color={preset.text}
      style={textStyle}>
      {children}
    </T>
  );

  if (!onPress) {
    return (
      <View style={containerStyle} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: selected ?? variant === 'active' }}
      android_ripple={{ color: 'transparent' }}
      hitSlop={hitSlopFor(64, 18)}
      onPress={onPress}
      style={({ pressed }) => [containerStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
