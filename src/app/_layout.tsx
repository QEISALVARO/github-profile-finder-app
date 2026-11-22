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

import { useAuthStore } from '@/store/useAuthStore';
import { DataProvider } from '@/providers/DataProvider';
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
          every screen shares the same cache. In mock mode the Supabase session
          sync stays inert. */}
      {fontsLoaded || fontError ? (
        <DataProvider>
          <RootNavigatorSlot />
        </DataProvider>
      ) : null}
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

  // P0 gate: tanpa sesi → Welcome/Login/Register; sesi tanpa onboarding →
  // Onboarding untuk SEMUA provider. GitHub/Google tidak lagi menjadi syarat
  // masuk aplikasi — kewajiban GitHub menempel pada fitur developer yang
  // butuh identitas/ownership GitHub (listing/publish), bukan pada onboarding.
  // Stack.Protected menghapus history route yang guard-nya berubah sehingga
  // tombol back tidak keluar jalur.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>

      {/* Deep link balik dari OAuth (gitscope://auth/callback).
          Tidak ikut di-guard: app bisa dibuka dingin lewat link ini sebelum
          sesi sempat direhidrasi. */}
      <Stack.Screen name="auth/callback" />

      {/* Deep link reset password (gitscope://auth/update-password?code=...).
          Route ini memvalidasi token recovery sendiri dan tidak membuka tabs;
          tanpa token valid user hanya melihat pesan minta tautan baru. */}
      <Stack.Screen name="auth/update-password" />

      {/* Opsional: penautan GitHub untuk sesi yang sudah masuk. Tidak lagi
          menjadi gerbang onboarding — akun email/Google boleh mencari talent
          tanpa GitHub dan baru menautkannya saat fitur developer dibutuhkan. */}
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="connect-github" />
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
