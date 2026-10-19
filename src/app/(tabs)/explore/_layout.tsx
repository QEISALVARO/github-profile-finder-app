import { Stack } from 'expo-router';

/**
 * Nested stack inside the Explore tab (PRD §3) — Analysis pushes over
 * Explore while the floating tab bar stays visible.
 */
export default function ExploreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="analysis" />
    </Stack>
  );
}
