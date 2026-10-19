import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ColorToken } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Icon } from './Icon';
import { T } from './T';

const DURATION = 180;

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectSheetProps = {
  visible: boolean;
  options: SelectOption[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  title?: string;
  textColor?: ColorToken;
  style?: StyleProp<ViewStyle>;
};

/** design.md §3.26 — small bottom sheet with a check on the selected row. */
export function SelectSheet({
  visible,
  options,
  value,
  onSelect,
  onClose,
  title,
  textColor = 'ink',
  style,
}: SelectSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }

    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  if (!visible) return null;

  const close = () => {
    Animated.timing(progress, {
      toValue: 0,
      duration: DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      progress.setValue(0);
      onClose();
    });
  };

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={close}>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.backdrop, { backgroundColor: theme.colors.backdrop, opacity: progress }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup pilihan"
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.line,
              marginBottom: Math.max(12, insets.bottom),
              opacity: progress,
              transform: [{ translateY }],
            },
            style,
          ]}>
          {title ? (
            <T size={8} mono ls={1.4} color="muted" style={styles.title}>
              {title}
            </T>
          ) : null}
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                android_ripple={{ color: 'transparent' }}
                onPress={() => {
                  onSelect(option.value);
                  close();
                }}
                style={({ pressed }) => [
                  styles.row,
                  selected && { backgroundColor: theme.colors.accentSoft },
                  pressed && styles.pressed,
                ]}>
                <T size={11} color={textColor}>
                  {option.label}
                </T>
                {selected ? <Icon name="check" size={14} color={theme.colors.greenStrong} /> : null}
              </Pressable>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 430,
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
  },
  title: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.85,
  },
});
