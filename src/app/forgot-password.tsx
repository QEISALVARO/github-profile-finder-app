import { router } from 'expo-router';
import { useState } from 'react';

import { useResetPassword } from '@/api/queries';
import { T } from '@/components/ui/T';
import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthScaffold,
} from '@/features/auth/AuthScaffold';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** P0 — kirim tautan reset password ke email terdaftar. */
export default function ForgotPasswordScreen() {
  const resetPassword = useResetPassword();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (resetPassword.isPending) return;

    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError('Masukkan alamat email yang valid.');
      return;
    }
    setEmailError('');
    setFormError('');

    const result = await resetPassword.mutateAsync(email.trim());
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setSent(true);
  };

  return (
    <AuthScaffold
      eyebrow="LUPA PASSWORD"
      title="Kirim tautan reset."
      description="Masukkan email akun Anda. Tautan reset berlaku terbatas dan dikirim lewat Supabase Auth.">
      {sent ? (
        <>
          <T size={10} weight="700" lh={1.6}>
            Tautan reset dikirim.
          </T>
          <T size={9} color="muted" lh={1.6}>
            Cek kotak masuk {email.trim()} (termasuk folder spam). Bila email tidak terdaftar, tidak
            ada tautan yang dibuat dan pesan ini tetap sama — ini disengaja agar akun tidak bisa
            ditebak.
          </T>
          <AuthButton
            label="Kirim ulang tautan"
            loadingLabel="Mengirim…"
            loading={resetPassword.isPending}
            onPress={() => void submit()}
          />
          <AuthLink label="Masuk" onPress={() => router.replace('/login')} />
        </>
      ) : (
        <>
          <AuthField
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            placeholder="nama@perusahaan.com"
            keyboardType="email-address"
            autoComplete="email"
            error={emailError}
          />
          {formError.length > 0 ? (
            <T size={9} color="error" lh={1.6}>
              {formError}
            </T>
          ) : null}
          <AuthButton
            label="Kirim tautan reset"
            loadingLabel="Mengirim…"
            loading={resetPassword.isPending}
            onPress={() => void submit()}
          />
          <AuthLink label="Kembali ke halaman masuk" onPress={() => router.replace('/login')} />
        </>
      )}
    </AuthScaffold>
  );
}
