import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { T } from './T';
import { hitSlopFor } from './hit-slop';

export type SegmentedTabItem = {
  key: string;
  label: string;
};

export type SegmentedTabsProps = {
  items: SegmentedTabItem[];
  value: string;
  onChange: (key: string) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** design.md §3.15 — three equal segments with a raised active surface. */
export function SegmentedTabs({
  items,
  value,
  onChange,
  accessibilityLabel,
  style,
}: SegmentedTabsProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, { backgroundColor: theme.colors.tabsTrack }, style]}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            android_ripple={{ color: 'transparent' }}
            hitSlop={hitSlopFor(110, 37)}
            onPress={() => onChange(item.key)}
            style={({ pressed }) => [
              styles.segment,
              active && [{ backgroundColor: theme.colors.surface }, theme.shadows.tab],
              pressed && styles.pressed,
            ]}>
            <T size={9} weight="700" color={active ? 'ink' : 'muted'}>
              {item.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 13,
    marginBottom: 15,
  },
  segment: {
    flex: 1,
    height: 37,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
