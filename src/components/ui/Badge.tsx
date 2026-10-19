import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ColorToken } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { T } from './T';
import { Icon } from './Icon';
import { hitSlopFor } from './hit-slop';

export type BadgeVariant = 'verified' | 'active' | 'mono';

export type BadgeProps = {
  children?: ReactNode;
  label?: string;
  variant?: BadgeVariant;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Small status pill: VERIFIED (check), ACTIVE (dot) and neutral mono. */
export function Badge({
  children,
  label,
  variant = 'verified',
  onPress,
  accessibilityLabel,
  style,
}: BadgeProps) {
  const theme = useTheme();

  const background =
    variant === 'verified'
      ? theme.colors.accentSoft
      : variant === 'active'
        ? theme.colors.connectedPillBg
        : 'transparent';
  const border = variant === 'mono' ? theme.colors.line : 'transparent';
  const textToken: ColorToken =
    variant === 'verified' ? 'greenStrong' : variant === 'active' ? 'accent' : 'muted';
  const textColor = theme.colors[textToken];

  const content = (
    <>
      {variant === 'verified' ? <Icon name="check" size={11} color={textColor} /> : null}
      {variant === 'active' ? (
        <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
      ) : null}
      <T size={6} weight="700" mono ls={variant === 'mono' ? 0.8 : 0.4} color={textToken}>
        {children ?? label}
      </T>
    </>
  );

  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: background,
      borderColor: border,
      borderRadius: variant === 'active' ? 6 : 5,
    },
    style,
  ];

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
      android_ripple={{ color: 'transparent' }}
      hitSlop={hitSlopFor(72, 18)}
      onPress={onPress}
      style={({ pressed }) => [containerStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 9999,
  },
  pressed: {
    opacity: 0.85,
  },
});
