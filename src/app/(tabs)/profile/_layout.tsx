import { Stack } from 'expo-router';

/**
 * Nested stack inside the Profile tab (PRD v2 §13) — Settings pushes over the
 * profile summary while the floating tab bar stays visible.
 */
export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
