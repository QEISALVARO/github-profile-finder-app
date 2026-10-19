import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ColorToken } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Icon, type IconName } from './Icon';
import { SelectSheet, type SelectOption } from './SelectSheet';
import { T } from './T';
import { hitSlopFor } from './hit-slop';

export type SelectFieldProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: IconName | null;
  iconColor?: ColorToken;
  textColor?: ColorToken;
  /** Estimated width, used to expand the touch target to 44 dp (D6). */
  estimatedWidth?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** design.md §3.4 — `<select>` replacement rendered as a Pressable + SelectSheet. */
export function SelectField({
  value,
  options,
  onChange,
  placeholder = 'Select',
  icon = 'location',
  iconColor = 'muted',
  textColor = 'ink',
  estimatedWidth = 160,
  accessibilityLabel,
  style,
}: SelectFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? selected?.label ?? placeholder}
        accessibilityState={{ expanded: open }}
        android_ripple={{ color: 'transparent' }}
        hitSlop={hitSlopFor(estimatedWidth, 34)}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          {
            borderColor: theme.colors.line,
            backgroundColor: theme.colors.paper,
          },
          style,
          pressed && styles.pressed,
        ]}>
        {icon ? <Icon name={icon} size={14} color={theme.colors[iconColor]} /> : null}
        <View style={styles.label}>
          <T size={8} color={textColor} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </T>
        </View>
      </Pressable>

      <SelectSheet
        visible={open}
        options={options}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 34,
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  label: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
