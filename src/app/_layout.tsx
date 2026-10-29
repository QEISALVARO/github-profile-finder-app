import { DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';

import { QueryProvider } from '@/api/queries/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/theme/useTheme';

// Keep the splash visible until fonts are loaded and the app is ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { mode, colors } = useTheme();

  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    DMMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
  const themedNav = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      background: colors.paper,
      card: colors.surface,
      text: colors.ink,
      border: colors.line,
      primary: colors.accent,
    },
  };

  return (
    <ThemeProvider value={themedNav}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {/* FE-2 — one QueryClient for the whole app; sits above the router so
          every screen shares the same cache. */}
      <QueryProvider>
        {/* Children render only after fonts resolve to avoid font flash;
            keep the splash up in the meantime. */}
        {fontsLoaded || fontError ? <RootNavigatorSlot /> : null}
      </QueryProvider>
    </ThemeProvider>
  );
}

function RootNavigatorSlot() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const session = useAuthStore((s) => s.session);
  const onboarded = useAuthStore((s) => s.onboarded);

  // Tunggu persist auth selesai direhydrate (cold start) supaya guard tidak
  // sempat melempar user ke halaman yang salah.
  if (!hydrated) return null;

  // R1 gate (PRD v2 §6.1): tanpa sesi → Welcome; sesi tanpa onboarding →
  // Onboarding; sesi + onboarding → tabs. Stack.Protected menghapus history
  // route yang guard-nya berubah sehingga tombol back tidak keluar jalur.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>

      <Stack.Protected guard={session !== null && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={session !== null && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="dev" />
      </Stack.Protected>
    </Stack>
  );
}
