import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export type HardShadowBoxProps = {
  children: ReactNode;
  /** R4 — the offset shadow switches to `accent` while the field is focused. */
  focused?: boolean;
  radius?: number;
  offset?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Hard shadow (4px 4px 0) for the search box. Android's `elevation` cannot
 * produce an offset shadow, so the shadow is a sibling view — identical on
 * iOS and Android.
 */
export function HardShadowBox({
  children,
  focused = false,
  radius = 15,
  offset = 4,
  style,
  contentStyle,
}: HardShadowBoxProps) {
  const theme = useTheme();

  return (
    <View style={[styles.wrapper, { marginRight: offset, marginBottom: offset }, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            left: offset,
            top: offset,
            right: -offset,
            bottom: -offset,
            borderRadius: radius,
            backgroundColor: focused ? theme.colors.accent : theme.colors.ink,
          },
        ]}
      />
      <View
        style={[
          styles.content,
          {
            borderColor: theme.colors.ink,
            borderRadius: radius,
            backgroundColor: theme.colors.surface,
          },
          contentStyle,
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
  },
  content: {
    borderWidth: 1.5,
    overflow: 'hidden',
  },
});
