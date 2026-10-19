import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/useTheme';

interface TabDef {
  name: string;
  label: string;
  icon: IconName;
}

/** design.md §7 — tab icons: home, users, message, briefcase. */
const TABS: TabDef[] = [
  { name: 'explore', label: 'Explore', icon: 'home' },
  { name: 'talent', label: 'Talent', icon: 'users' },
  { name: 'inbox', label: 'Inbox', icon: 'message' },
  { name: 'profile', label: 'Profil', icon: 'briefcase' },
];

/**
 * FR-G3 — floating custom tab bar: dark pill, h72, r20, shadowNav, positioned
 * `bottom: max(12, insets.bottom)`. The Inbox item shows a dot when unread.
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
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
          { backgroundColor: theme.colors.nav, ...theme.shadows.nav },
        ]}
      >
        {TABS.map((tab, index) => {
          const focused = state.index === index;
          const color = focused ? theme.colors.accent : theme.colors.navInactive;

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
              android_ripple={null}
              style={styles.item}
            >
              <Icon name={tab.icon} size={20} color={color} />
              {tab.name === 'inbox' && unreadCount > 0 ? (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: theme.colors.accent, borderColor: theme.colors.nav },
                  ]}
                />
              ) : null}
              <T size={8} weight="700" ls={0.2} style={{ color }}>
                {tab.label}
              </T>
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
    paddingHorizontal: 12,
    zIndex: 10,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 430,
    height: 72,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  item: {
    minWidth: 62,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 14,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
});

export default FloatingTabBar;
