import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useSignInWithEmail } from '@/api/queries';
import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthScaffold,
  OAuthButtons,
} from '@/features/auth/AuthScaffold';
import { sanitizeNextPath } from '@/lib/safeRedirect';
import { useAuthStore } from '@/store/useAuthStore';
import { T } from '@/components/ui/T';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** P0 — login email/password untuk recruiter (tanpa akun GitHub). */
export default function LoginScreen() {
  const signInWithEmail = useSignInWithEmail();
  const params = useLocalSearchParams<{ next?: string | string[] }>();
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  // Allowlist internal route saja; mencegah open redirect dari deep link.
  const nextPath = sanitizeNextPath(rawNext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');

  const submit = async () => {
    if (signInWithEmail.isPending) return;

    const nextErrors: { email?: string; password?: string } = {};
    if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = 'Masukkan alamat email yang valid.';
    if (password.length < 8) nextErrors.password = 'Password minimal 8 karakter.';
    setFieldErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;

    const result = await signInWithEmail.mutateAsync({ email: email.trim(), password });
    if (result.error) {
      setFormError(result.error);
      return;
    }

    // Guard root layout mengevaluasi sesi; replace eksplisit mencegah layar
    // login tetap menjadi route aktif setelah sesi terbentuk.
    router.replace(nextPath ? (nextPath as Href) : useAuthStore.getState().onboarded ? '/explore' : '/onboarding');
  };

  const afterOAuth = () => {
    router.replace(nextPath ? (nextPath as Href) : useAuthStore.getState().onboarded ? '/explore' : '/onboarding');
  };

  return (
    <AuthScaffold
      eyebrow="MASUK"
      title="Masuk ke Gitscope."
      description="Pakai email dan password. Recruiter tidak perlu punya akun GitHub untuk mulai mencari talent."
      footer={
        <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <T size={9} color="muted">
            Belum punya akun?
          </T>
          <AuthLink label="Daftar" onPress={() => router.replace('/register')} />
        </View>
      }>
      <AuthField
        label="EMAIL"
        value={email}
        onChangeText={setEmail}
        placeholder="nama@perusahaan.com"
        keyboardType="email-address"
        autoComplete="email"
        error={fieldErrors.email}
      />
      <AuthField
        label="PASSWORD"
        value={password}
        onChangeText={setPassword}
        placeholder="Minimal 8 karakter"
        secureTextEntry
        autoComplete="password"
        error={fieldErrors.password}
      />

      {formError.length > 0 ? (
        <T size={9} color="error" lh={1.6}>
          {formError}
        </T>
      ) : null}

      <AuthButton
        label="Masuk"
        loadingLabel="Memeriksa…"
        loading={signInWithEmail.isPending}
        onPress={() => void submit()}
      />

      <AuthLink
        label="Lupa password?"
        accessibilityLabel="Lupa password"
        onPress={() => router.push('/forgot-password')}
      />

      <OAuthButtons
        onError={setFormError}
        onAuthenticated={afterOAuth}
        disabled={signInWithEmail.isPending}
      />
    </AuthScaffold>
  );
}
