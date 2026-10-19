import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import type { ColorToken, ShadowTokens } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type CardVariantName =
  | 'base'
  | 'project'
  | 'profile'
  | 'filter'
  | 'candidate'
  | 'repo'
  | 'skill'
  | 'score'
  | 'heatmap'
  | 'network'
  | 'settings';

type CardPreset = {
  radius: number;
  padding: number;
  shadow?: keyof ShadowTokens;
  background?: ColorToken;
  bordered?: boolean;
};

/** Radius + elevation per section 6/1.6 of design.md. */
export const CARD_PRESETS: Record<CardVariantName, CardPreset> = {
  base: { radius: 15, padding: 13 },
  project: { radius: 18, padding: 15, shadow: 'card' },
  profile: { radius: 20, padding: 20, shadow: 'profile' },
  filter: { radius: 15, padding: 13 },
  candidate: { radius: 15, padding: 13 },
  repo: { radius: 15, padding: 14 },
  skill: { radius: 17, padding: 16 },
  score: { radius: 17, padding: 17, background: 'accent', bordered: false },
  heatmap: { radius: 17, padding: 16 },
  network: { radius: 15, padding: 15, background: 'ink', bordered: false },
  settings: { radius: 16, padding: 0 },
};

export type CardProps = {
  children: ReactNode;
  variant?: CardVariantName;
  radius?: number;
  padding?: number;
  shadow?: keyof ShadowTokens | 'none';
  background?: ColorToken;
  borderColor?: ColorToken;
  bordered?: boolean;
  borderStyle?: 'solid' | 'dashed';
  style?: StyleProp<ViewStyle>;
};

/** Base surface used by every card in the app. */
export function Card({
  children,
  variant = 'base',
  radius,
  padding,
  shadow,
  background,
  borderColor = 'line',
  bordered,
  borderStyle = 'solid',
  style,
}: CardProps) {
  const theme = useTheme();
  const preset = CARD_PRESETS[variant];
  const resolvedShadow = shadow ?? preset.shadow ?? 'none';
  const resolvedBackground = background ?? preset.background ?? 'surface';
  const resolvedBordered = bordered ?? preset.bordered ?? true;
  const resolvedPadding = padding ?? preset.padding;

  return (
    <View
      style={[
        {
          borderRadius: radius ?? preset.radius,
          padding: resolvedPadding,
          backgroundColor: theme.colors[resolvedBackground],
          borderWidth: resolvedBordered ? 1 : 0,
          borderStyle,
          borderColor: theme.colors[borderColor],
        },
        resolvedShadow !== 'none' && theme.shadows[resolvedShadow],
        style,
      ]}>
      {children}
    </View>
  );
}
