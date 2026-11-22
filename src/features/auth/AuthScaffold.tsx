import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { signInWithGitHub, signInWithGoogle } from '@/lib/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/theme/useTheme';
import { MAX_FONT_SCALE, fontFamilyFor, fs } from '@/theme/typography';

/**
 * Kerangka layar auth email (Welcome/Login/Register/Forgot password).
 * Copy privasi/terms tetap ada di semua layar dan tidak mengklaim GitHub
 * terhubung untuk akun email.
 */
export function AuthScaffold({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.paper }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <View style={styles.brandRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kembali ke halaman masuk"
              onPress={() => router.replace('/welcome')}
              style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
              <View style={[styles.mark, { backgroundColor: theme.colors.accent }]}>
                <Icon name="github" size={20} color={theme.colors.onAccent} />
              </View>
              <T size={16} weight="800" ls={-0.7}>
                git
                <T size={16} weight="500" color="muted">
                  scope
                </T>
              </T>
            </Pressable>
          </View>

          <T size={9} mono ls={1.6} color="greenText" style={styles.eyebrow}>
            {eyebrow}
          </T>
          <T size={30} weight="800" ls={-1.4} lh={1.08} style={styles.title}>
            {title}
          </T>
          <T size={12} color="muted" lh={1.6} style={styles.description}>
            {description}
          </T>

          <View style={styles.body}>{children}</View>

          {footer}

          <T size={7} mono color="muted" ls={1} style={styles.legal}>
            PRIVACY POLICY & TERMS MENYUSUL SEBELUM RILIS · GITHUB AUP DIPATUHI (POL-7)
          </T>
        </View>
      </ScrollView>
    </View>
  );
}

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoComplete,
  autoCapitalize = 'none',
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoComplete?: 'email' | 'password' | 'new-password';
  autoCapitalize?: 'none' | 'words';
  error?: string | null;
}) {
  const theme = useTheme();

  return (
    <View style={styles.fieldBlock}>
      <T size={8} mono ls={1.2} color="greenText">
        {label}
      </T>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        accessibilityLabel={label}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={[
          styles.input,
          {
            borderColor: error ? theme.colors.error : theme.colors.line,
            backgroundColor: theme.colors.paper,
            color: theme.colors.ink,
            fontFamily: fontFamilyFor('400'),
            fontSize: fs(12),
          },
        ]}
      />
      {error ? (
        <T size={8} color="error" lh={1.5}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

export function AuthButton({
  label,
  loadingLabel,
  loading,
  onPress,
  accessibilityLabel,
  variant = 'primary',
}: {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  variant?: 'primary' | 'secondary';
}) {
  const theme = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: loading, busy: loading }}
      android_ripple={{ color: 'transparent' }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary
          ? { backgroundColor: theme.colors.accent, borderColor: theme.colors.ink }
          : { backgroundColor: theme.colors.surface, borderColor: theme.colors.line },
        (pressed || loading) && styles.pressed,
      ]}>
      <T size={12} weight="800" color={primary ? 'onAccent' : 'ink'}>
        {loading ? (loadingLabel ?? 'Memproses…') : label}
      </T>
    </Pressable>
  );
}

export function AuthLink({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <T size={9} weight="600" color="greenText">
        {label}
      </T>
    </Pressable>
  );
}

/**
 * GitHub/Google tetap tersedia sebagai alternatif login email. Di build tanpa
 * backend, error ditampilkan apa adanya — tidak ada sesi demo diam-diam.
 */
export function OAuthButtons({
  onError,
  onAuthenticated,
  disabled,
}: {
  onError: (message: string) => void;
  onAuthenticated?: () => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState<'github' | 'google' | null>(null);
  const setAuthError = useAuthStore((s) => s.setAuthError);

  const run = async (provider: 'github' | 'google') => {
    if (busy || disabled) return;
    setBusy(provider);
    setAuthError(null);
    try {
      const result = provider === 'github' ? await signInWithGitHub() : await signInWithGoogle();
      if (result.error) {
        onError(result.error);
        return;
      }
      // Guard root layout yang memindahkan layar setelah sesi masuk ke store;
      // callback ini hanya memulihkan return URL yang sudah divalidasi.
      onAuthenticated?.();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Login OAuth gagal. Coba lagi.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.oauth}>
      <AuthButton
        label="Continue with GitHub"
        loadingLabel="Menghubungkan…"
        loading={busy === 'github'}
        onPress={() => void run('github')}
        variant="secondary"
      />
      <AuthButton
        label="Continue with Google"
        loadingLabel="Menghubungkan…"
        loading={busy === 'google'}
        onPress={() => void run('google')}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, flexGrow: 1 },
  inner: { width: '100%', maxWidth: 430, alignSelf: 'center', flexGrow: 1, justifyContent: 'center' },
  brandRow: { flexDirection: 'row', marginBottom: 30 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mark: {
    width: 31,
    height: 31,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  eyebrow: { marginBottom: 7 },
  title: { marginBottom: 9 },
  description: { maxWidth: 380, marginBottom: 22 },
  body: { gap: 14 },
  fieldBlock: { gap: 6 },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  button: {
    height: 46,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  oauth: { gap: 9, marginTop: 18 },
  link: { alignSelf: 'center', paddingVertical: 7, paddingHorizontal: 4 },
  legal: { marginTop: 26, textAlign: 'center' },
  pressed: { opacity: 0.85 },
});
