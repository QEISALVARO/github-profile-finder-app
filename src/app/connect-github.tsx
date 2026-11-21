import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { linkGitHubIdentity, signOutRemote } from '@/lib/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/theme/useTheme';

/**
 * Gerbang sebelum onboarding — akun Google wajib menautkan GitHub dulu.
 *
 * Route ini hanya tersedia selama `session !== null && !onboarded && githubId
 * === 0` (lihat src/app/_layout.tsx), jadi user GitHub langsung tidak pernah
 * melihatnya. Penautan memakai Supabase `linkIdentity()` (manual linking);
 * identitas GitHub yang sudah diverifikasi server disalin ke profiles lewat RPC
 * `connect_github_identity`, sehingga login GitHub tidak bisa dipalsukan klien.
 */
export default function ConnectGitHubScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLink = async () => {
    if (linking) return;
    setLinking(true);
    setError(null);
    try {
      const { error: linkError, identity } = await linkGitHubIdentity();
      if (linkError !== null || !identity) {
        setError(linkError ?? 'Penautan GitHub gagal. Coba lagi.');
        return;
      }

      // Perbarui sesi lokal supaya guard root membuka onboarding tanpa menunggu
      // event auth berikutnya (metadata sudah ikut diperbarui di lib/auth).
      // Sengaja tidak `router.replace('/onboarding')`: route itu baru terdaftar
      // setelah guard mengevaluasi ulang sesi, jadi guard yang memindahkan.
      const current = useAuthStore.getState().session;
      if (current) {
        signIn({
          ...current,
          login: identity.login,
          name: identity.name ?? current.name,
          avatarUrl: identity.avatarUrl ?? current.avatarUrl,
          githubId: identity.githubId,
          provider: current.provider ?? 'google',
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Penautan GitHub gagal. Coba lagi.');
    } finally {
      setLinking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutRemote();
    } catch {
      // Env Supabase tidak tersedia / offline: sesi lokal tetap dibersihkan.
    }
    signOut();
    router.replace('/welcome');
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.paper }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <View style={[styles.mark, { backgroundColor: theme.colors.accent }]}>
            <Icon name="github" size={30} color={theme.colors.onAccent} />
          </View>

          <T size={10} mono ls={1.8} color="greenText" style={styles.eyebrow}>
            SATU LANGKAH LAGI
          </T>
          <T size={32} weight="800" ls={-1.6} lh={1.08} style={styles.headline}>
            Hubungkan GitHub Anda.
          </T>
          <T size={13} color="muted" lh={1.6} style={styles.lede}>
            Akun Google Anda sudah masuk{session?.name ? ` sebagai ${session.name}` : ''}, tetapi
            Gitscope membaca karya dan kontribusi dari GitHub. Tautkan akun GitHub dulu sebelum
            mengisi profil.
          </T>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hubungkan GitHub"
            accessibilityState={{ disabled: linking, busy: linking }}
            android_ripple={{ color: 'transparent' }}
            disabled={linking}
            onPress={handleLink}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: theme.colors.accent, borderColor: theme.colors.ink },
              (pressed || linking) && styles.pressed,
            ]}>
            <Icon name="github" size={20} color={theme.colors.onAccent} />
            <T size={13} weight="800" color="onAccent">
              {linking ? 'Menghubungkan…' : 'Hubungkan GitHub'}
            </T>
          </Pressable>

          <T size={8} color="muted" lh={1.6} style={styles.note}>
            Scope <T mono size={8}>read:user</T> saja — tanpa akses email. Login GitHub tetap
            tersedia kapan saja dari layar masuk.
          </T>

          {error !== null && error !== '' ? (
            <T size={9} color="error" lh={1.6} style={styles.note}>
              {error}
            </T>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Keluar dari akun"
            onPress={handleSignOut}
            style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
            <T size={9} weight="600" color="muted" ls={0.4}>
              Keluar dari akun
            </T>
          </Pressable>
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
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    transform: [{ rotate: '-4deg' }],
  },
  eyebrow: {
    marginBottom: 10,
  },
  headline: {
    marginBottom: 14,
  },
  lede: {
    maxWidth: 380,
    marginBottom: 28,
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
  note: {
    marginTop: 12,
    maxWidth: 380,
  },
  signOut: {
    marginTop: 28,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.85,
  },
});
