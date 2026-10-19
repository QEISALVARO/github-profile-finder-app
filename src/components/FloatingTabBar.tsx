import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/useTheme';

interface TabDef {
  name: string;
  label: string;
  icon: IconName;
  href: string;
}

const TABS: TabDef[] = [
  { name: 'explore', label: 'Explore', icon: 'compass', href: '/explore' },
  { name: 'talent', label: 'Talent', icon: 'user', href: '/talent' },
  { name: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox' },
  { name: 'profile', label: 'Profil', icon: 'profile', href: '/profile' },
];

/**
 * FR-G3 — floating custom tab bar. Sits above the home indicator at
 * bottom = max(12, insets.bottom); active item uses the accent color and
 * the Inbox item shows a notification dot when unreadCount > 0.
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const unreadCount = useAppStore((s) => s.unreadCount);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(12, insets.bottom) }]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {TABS.map((tab, index) => {
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(tab.name);
            }
          };

          return (
            <Pressable
              key={tab.name}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={tab.label}
              onPress={onPress}
              style={styles.item}
            >
              <View>
                <Icon
                  name={tab.icon}
                  size={22}
                  color={focused ? colors.accent : colors.textMuted}
                  strokeWidth={focused ? 2 : 1.7}
                />
                {tab.name === 'inbox' && unreadCount > 0 ? (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: colors.accent, borderColor: colors.surface },
                    ]}
                  />
                ) : null}
              </View>
              <Text                  style={[
                    styles.label,
                    {
                      color: focused ? colors.accent : colors.textMuted,
                      fontFamily: 'Manrope_700Bold',
                    },
                  ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});

export default FloatingTabBar;
