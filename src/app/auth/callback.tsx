import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/components/ui/T';
import { completeOAuthFromUrl, isOAuthCallbackUrl } from '@/lib/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/theme/useTheme';

/**
 * Deep link `gitscope://auth/callback` (Supabase redirect allowlist).
 *
 * Normalnya promise `WebBrowser.openAuthSessionAsync` di layar Welcome sudah
 * menukar `code`. Route ini adalah jaring pengaman untuk kasus app di-kill
 * browser saat login: saat app dibuka lagi lewat deep link, Expo Router
 * mendarat di sini dan login tetap diselesaikan (helper + cache yang sama
 * mencegah code ditukar dua kali).
 */
export default function AuthCallbackScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const url = Linking.useURL();
  const setAuthError = useAuthStore((s) => s.setAuthError);
  const handledUrl = useRef<string | null>(null);
  const timedOut = useRef(false);

  /**
   * Tujuan setelah callback: ikuti sesi yang sudah ada di store. GitHub tidak
   * lagi menjadi gerbang onboarding, jadi semua sesi yang valid menuju
   * onboarding (atau tabs bila sudah onboarded).
   */
  const goToNextScreen = () => {
    const { session, onboarded } = useAuthStore.getState();
    if (!session) {
      router.replace('/welcome');
      return;
    }
    if (onboarded) {
      router.replace('/explore');
      return;
    }
    router.replace('/onboarding');
  };

  // Fallback bila URL tidak pernah datang (mis. route dibuka tanpa deep link).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (handledUrl.current === null) {
        timedOut.current = true;
        goToNextScreen();
      }
    }, 5_000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!url || handledUrl.current === url || timedOut.current) return;
    handledUrl.current = url;

    let active = true;

    void (async () => {
      if (!isOAuthCallbackUrl(url)) {
        if (active) goToNextScreen();
        return;
      }

      const result = await completeOAuthFromUrl(url);
      if (!active) return;

      if (result.error) {
        setAuthError(result.error);
        router.replace('/welcome');
        return;
      }

      // Sesi sudah masuk ke store lewat onAuthStateChange; guard root yang
      // menentukan layar berikutnya. replace eksplisit mencegah callback route
      // tetap menjadi layar aktif setelah sesi terbentuk.
      goToNextScreen();
    })();

    return () => {
      active = false;
    };
  }, [setAuthError, url]);

  return (
    <View
      style={[
        styles.flex,
        {
          backgroundColor: theme.colors.paper,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}>
      <ActivityIndicator color={theme.colors.accent} />
      <T size={12} color="muted" style={styles.label}>
        Menyelesaikan login…
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  label: {
    textAlign: 'center',
  },
});
