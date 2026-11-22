import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getDataSource, isProductionBuild } from '@/config/dataSource';
import { signInWithGitHub, signInWithGoogle } from '@/lib/auth';
import { useTheme } from '@/theme/useTheme';

/**
 * PRD v2 §6.1 — Welcome / Login GitHub (layar baru §15.1).
 *
 * R2: tombol memakai GitHub OAuth via Supabase (K2, scope read:user tanpa
 * email). Bila backend belum hidup (env kosong / offline), fallback ke sesi
 * demo lokal yang ditandai eksplisit agar tidak dianggap data nyata.
 */

/** Identitas demo — ditandai eksplisit di UI supaya tidak dianggap data nyata. */
const DEMO_LOGIN = 'octocat';

/**
 * Sesi demo hanya untuk dev/test mode `mock`. Build production (atau mode api
 * yang kehilangan env) wajib menampilkan error konfigurasi, bukan octocat.
 */
function canUseDemoFallback(): boolean {
  return !isProductionBuild() && getDataSource('auth') === 'mock';
}

export default function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const signIn = useAuthStore((s) => s.signIn);
  const setAuthError = useAuthStore((s) => s.setAuthError);
  const authError = useAuthStore((s) => s.authError);
  const onboarded = useAuthStore((s) => s.onboarded);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const [signingIn, setSigningIn] = useState(false);

  /** Sesi demo lokal — dipakai bila OAuth tidak bisa dijalankan di build ini. */
  const startDemoSession = () => {
    signIn({
      login: DEMO_LOGIN,
      name: 'Octo Cat',
      avatarUrl: 'https://github.com/octocat.png?size=128',
      githubId: 583231,
      bio: 'Akun demo Gitscope — OAuth GitHub aktif setelah backend R0 terpasang.',
      locationText: 'San Francisco',
    });
    router.replace(onboarded ? '/explore' : '/onboarding');
  };

  /**
   * Login Google. Akun Google belum punya identitas GitHub, jadi onboarding
   * tetap terkunci sampai user menautkan GitHub di /connect-github.
   */
  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    setAuthError(null);
    try {
      const { error, cancelled, reason } = await signInWithGoogle();
      if (error) {
        setAuthError(error);
        if (cancelled) return;
        if (reason === 'not_configured' && canUseDemoFallback()) startDemoSession();
        return;
      }
      const current = useAuthStore.getState().session;
      // Sesi Google-only ditangani guard root (→ /connect-github).
      if (current && current.githubId > 0) {
        router.replace(onboarded ? '/explore' : '/onboarding');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login Google gagal. Coba lagi.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    setAuthError(null);
    try {
      const { error, cancelled, reason } = await signInWithGitHub();
      if (error) {
        setAuthError(error);
        // User menutup browser sendiri → jangan paksa sesi demo, cukup
        // tampilkan pesan agar tombol tetap bisa dicoba lagi.
        if (cancelled) return;
        // Build tanpa env Supabase / flag `api` → sesi demo lokal agar alur
        // onboarding tetap bisa dicoba.
        if (reason === 'not_configured') {
          if (canUseDemoFallback()) startDemoSession();
          return;
        }
        // OAuth benar-benar gagal (redirect belum diizinkan, provider mati,
        // jaringan) → tampilkan penyebabnya, jangan sembunyikan di balik demo.
        return;
      }
      // Sukses OAuth: sesi Supabase → useAuthStore via onAuthStateChange di
      // DataProvider; guard root layout menentukan tujuan akhir.
      router.replace(onboarded ? '/explore' : '/onboarding');
    } catch (error) {
      // Jaring pengaman terakhir: apa pun yang melempar (mis. env Supabase
      // tidak ikut ter-bundle di APK release) tidak boleh membuat tombol diam.
      setAuthError(error instanceof Error ? error.message : 'Login GitHub gagal. Coba lagi.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.paper }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {/* Brand bar (mirip TopBar, versi full-screen) */}
          <View style={styles.brandRow}>
            <View style={styles.brand}>
              <View style={[styles.mark, { backgroundColor: theme.colors.accent }]}>
                <Icon name="github" size={25} color={theme.colors.onAccent} />
              </View>
              <T size={18} weight="800" ls={-0.8}>
                git
                <T size={18} weight="500" color="muted">
                  scope
                </T>
              </T>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ganti tema"
              hitSlop={hitSlopFor(39, 39)}
              onPress={toggleTheme}
              style={({ pressed }) => [
                styles.themeButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.line,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Icon name="moon" size={20} color={theme.colors.ink} />
            </Pressable>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <T size={10} mono ls={1.8} color="greenText" style={styles.eyebrow}>
              GITHUB-NATIVE TALENT SEARCH
            </T>
            <T size={38} weight="800" ls={-2.1} lh={1.04} style={styles.headline}>
              Discover talent through work.
            </T>
            <T size={13} color="muted" lh={1.6} style={styles.lede}>
              Analisis keaslian proyek, aktivitas kontribusi, dan bukti kerja nyata dari GitHub —
              untuk recruiter yang memilih kandidat berdasarkan karya, bukan klaim.
            </T>
          </View>

          {/* CTA */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with GitHub"
            accessibilityState={{ disabled: signingIn, busy: signingIn }}
            android_ripple={{ color: 'transparent' }}
            disabled={signingIn}
            onPress={handleSignIn}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: theme.colors.accent, borderColor: theme.colors.ink },
              (pressed || signingIn) && styles.pressed,
            ]}>
            <Icon name="github" size={20} color={theme.colors.onAccent} />
            <T size={13} weight="800" color="onAccent">
              {signingIn ? 'Menghubungkan…' : 'Continue with GitHub'}
            </T>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            accessibilityState={{ disabled: signingIn, busy: signingIn }}
            android_ripple={{ color: 'transparent' }}
            disabled={signingIn}
            onPress={handleGoogleSignIn}
            style={({ pressed }) => [
              styles.cta,
              styles.ctaSecondary,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.line },
              (pressed || signingIn) && styles.pressed,
            ]}>
            <T size={13} weight="800">
              {signingIn ? 'Menghubungkan…' : 'Continue with Google'}
            </T>
          </Pressable>

          <View style={styles.emailRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Masuk dengan email"
              android_ripple={{ color: 'transparent' }}
              onPress={() => router.push('/login')}
              style={({ pressed }) => [
                styles.emailButton,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.line },
                pressed && styles.pressed,
              ]}>
              <T size={11} weight="700">
                Masuk dengan email
              </T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Daftar akun recruiter"
              android_ripple={{ color: 'transparent' }}
              onPress={() => router.push('/register')}
              style={({ pressed }) => [
                styles.emailButton,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.line },
                pressed && styles.pressed,
              ]}>
              <T size={11} weight="700">
                Daftar akun recruiter
              </T>
            </Pressable>
          </View>

          <T size={8} color="muted" lh={1.6} style={styles.ctaNote}>
            Login email/password tidak membutuhkan GitHub. OAuth GitHub (Supabase, scope{' '}
            <T mono size={8}>read:user</T> — tanpa akses email) dan Google tetap tersedia sebagai
            alternatif. Akun email/Google baru perlu menghubungkan GitHub saat memakai fitur
            developer. Sesi demo lokal hanya bisa muncul di build dev dengan mode data `mock`.
          </T>
          {authError !== null && authError !== '' ? (
            <T size={8} color="error" lh={1.6} style={styles.ctaNote}>
              {authError}
            </T>
          ) : null}

          {/* Info ringkas */}
          <View style={[styles.infoCard, { borderColor: theme.colors.line, backgroundColor: theme.colors.surface }]}>
            <View style={styles.infoRow}>
              <Icon name="check" size={14} color={theme.colors.greenStrong} />
              <T size={9} lh={1.5} style={styles.infoText}>
                <T size={9} weight="700">18+ only</T> — konteks ketenagakerjaan (§3.2).
              </T>
            </View>
            <View style={[styles.infoRow, { borderTopColor: theme.colors.line }]}>
              <Icon name="check" size={14} color={theme.colors.greenStrong} />
              <T size={9} lh={1.5} style={styles.infoText}>
                Hanya data publik GitHub; komunikasi lewat chat dalam aplikasi (POL-2).
              </T>
            </View>
            <View style={[styles.infoRow, { borderTopColor: theme.colors.line }]}>
              <Icon name="check" size={14} color={theme.colors.greenStrong} />
              <T size={9} lh={1.5} style={styles.infoText}>
                Developer tampil di Feed/Discover hanya bila memilih <T mono size={9}>listed</T> (POL-1).
              </T>
            </View>
          </View>

          <T size={7} mono color="muted" ls={1} style={styles.legal}>
            PRIVACY POLICY & TERMS MENYUSUL SEBELUM RILIS · GITHUB AUP DIPATUHI (POL-7)
          </T>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  inner: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    gap: 0,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 37,
    height: 37,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  themeButton: {
    width: 39,
    height: 39,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginBottom: 32,
  },
  eyebrow: {
    marginBottom: 8,
  },
  headline: {
    marginBottom: 14,
  },
  lede: {
    maxWidth: 360,
  },
  cta: {
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1.5,
  },
  ctaSecondary: {
    marginTop: 10,
    height: 46,
  },
  ctaNote: {
    marginTop: 12,
    maxWidth: 380,
  },
  emailRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  emailButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  infoCard: {
    marginTop: 28,
    borderRadius: 15,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
  },
  infoText: {
    flex: 1,
  },
  legal: {
    marginTop: 24,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
