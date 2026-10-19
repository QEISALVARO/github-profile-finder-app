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
      {/* Children render only after fonts resolve to avoid font flash;
          keep the splash up in the meantime. */}
      {fontsLoaded || fontError ? (
        <RootNavigatorSlot />
      ) : null}
    </ThemeProvider>
  );
}

function RootNavigatorSlot() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
