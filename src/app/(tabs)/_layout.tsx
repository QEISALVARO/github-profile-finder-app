import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/FloatingTabBar';
import { TopBar } from '@/components/TopBar';

/**
 * 4-tab shell (PRD §3): Explore, Talent, Inbox, Profile with a custom
 * floating tab bar (FR-G3) and the global TopBar (FR-G1) on every screen.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        header: () => <TopBar />,
        headerShadowVisible: false,
        sceneStyle: { flex: 1 },
      }}
    >
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="talent" options={{ title: 'Talent' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
