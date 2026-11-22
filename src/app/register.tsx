import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useResendSignupConfirmation, useSignUpWithEmail } from '@/api/queries';
import { T } from '@/components/ui/T';
import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthScaffold,
  OAuthButtons,
} from '@/features/auth/AuthScaffold';
import { useAuthStore } from '@/store/useAuthStore';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * P0 — register email/password. Akun email tidak diberi identitas GitHub;
 * recruiter bisa menyelesaikan onboarding tanpa menghubungkan GitHub.
 */
export default function RegisterScreen() {
  const signUp = useSignUpWithEmail();
  const resend = useResendSignupConfirmation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [formError, setFormError] = useState('');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const submit = async () => {
    if (signUp.isPending) return;

    const nextErrors: { email?: string; password?: string; confirmPassword?: string } = {};
    if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = 'Masukkan alamat email yang valid.';
    if (password.length < 8) nextErrors.password = 'Password minimal 8 karakter.';
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Konfirmasi password tidak sama.';
    }
    setFieldErrors(nextErrors);
    setFormError('');
    setResendMessage('');
    if (Object.keys(nextErrors).length > 0) return;

    const result = await signUp.mutateAsync({ email: email.trim(), password });
    if (result.error) {
      setFormError(result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      // Konfirmasi email aktif di Supabase: belum ada sesi sampai tautan dibuka.
      setAwaitingConfirmation(true);
      setPassword('');
      setConfirmPassword('');
      return;
    }

    router.replace(useAuthStore.getState().onboarded ? '/explore' : '/onboarding');
  };

  const resendConfirmation = async () => {
    setResendMessage('');
    setFormError('');
    const result = await resend.mutateAsync(email.trim());
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setResendMessage('Email konfirmasi dikirim ulang. Cek kotak masuk dan folder spam.');
  };

  if (awaitingConfirmation) {
    return (
      <AuthScaffold
        eyebrow="CEK EMAIL"
        title="Konfirmasi email Anda."
        description={`Kami mengirim tautan konfirmasi ke ${email.trim()}. Buka tautan itu sebelum masuk — akun email tidak membutuhkan GitHub.`}
        footer={
          <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <T size={9} color="muted">
              Sudah konfirmasi?
            </T>
            <AuthLink label="Masuk" onPress={() => router.replace('/login')} />
          </View>
        }>
        {resendMessage.length > 0 ? (
          <T size={9} color="greenText" lh={1.6}>
            {resendMessage}
          </T>
        ) : null}
        {formError.length > 0 ? (
          <T size={9} color="error" lh={1.6}>
            {formError}
          </T>
        ) : null}
        <AuthButton
          label="Kirim ulang email konfirmasi"
          loadingLabel="Mengirim…"
          loading={resend.isPending}
          onPress={() => void resendConfirmation()}
        />
        <AuthLink label="Kembali ke halaman masuk" onPress={() => router.replace('/login')} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      eyebrow="DAFTAR"
      title="Buat akun recruiter."
      description="Cukup email dan password. GitHub hanya diperlukan untuk fitur developer, bukan untuk mencari talent."
      footer={
        <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <T size={9} color="muted">
            Sudah punya akun?
          </T>
          <AuthLink label="Masuk" onPress={() => router.replace('/login')} />
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
        autoComplete="new-password"
        error={fieldErrors.password}
      />
      <AuthField
        label="ULANGI PASSWORD"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Ketik ulang password"
        secureTextEntry
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
      />

      {formError.length > 0 ? (
        <T size={9} color="error" lh={1.6}>
          {formError}
        </T>
      ) : null}

      <AuthButton
        label="Daftar"
        loadingLabel="Mendaftarkan…"
        loading={signUp.isPending}
        onPress={() => void submit()}
      />

      <OAuthButtons onError={setFormError} disabled={signUp.isPending} />
    </AuthScaffold>
  );
}
