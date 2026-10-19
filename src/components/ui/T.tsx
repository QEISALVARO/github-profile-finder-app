import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import type { ColorToken } from '@/theme/tokens';
import {
  MAX_FONT_SCALE,
  fontFamilyFor,
  fs,
  textVariants,
  type FontWeight,
  type TextVariantName,
} from '@/theme/typography';

export type TProps = TextProps & {
  /** Named style from design.md §2.3. */
  variant?: TextVariantName;
  /** Prototype px size — always converted through `fs()`. */
  size?: number;
  weight?: FontWeight;
  mono?: boolean;
  color?: ColorToken;
  /** Letter-spacing override in dp. */
  ls?: number;
  /** Line-height multiplier applied to the resolved font size. */
  lh?: number;
};

/**
 * All text goes through `<T>` so font sizes respect D5 (`fs()`), weights map to
 * a real Manrope family, and Dynamic Type stops at 1.2×.
 */
export function T({
  variant,
  size,
  weight,
  mono,
  color,
  ls,
  lh,
  style,
  maxFontSizeMultiplier,
  ...rest
}: TProps) {
  const theme = useTheme();
  const preset = variant ? textVariants[variant] : undefined;

  const resolvedSize = size ?? preset?.size ?? 12;
  const resolvedWeight: FontWeight = weight ?? preset?.weight ?? '400';
  const resolvedMono = mono ?? preset?.mono ?? false;
  const resolvedColor = color ?? preset?.color ?? 'ink';

  const textStyle: TextStyle = {
    color: theme.colors[resolvedColor],
    fontFamily: fontFamilyFor(resolvedWeight, resolvedMono),
    fontSize: fs(resolvedSize),
    letterSpacing: ls ?? preset?.letterSpacing,
  };

  if (lh ?? preset?.lineHeight) {
    textStyle.lineHeight = fs(resolvedSize) * (lh ?? preset?.lineHeight ?? 1);
  }

  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_FONT_SCALE}
      style={[textStyle, style]}
    />
  );
}
