import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSignOut, useUpdatePassword } from '@/api/queries';
import { T } from '@/components/ui/T';
import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthScaffold,
} from '@/features/auth/AuthScaffold';
import {
  completePasswordRecoveryFromUrl,
  isPasswordRecoveryUrl,
} from '@/lib/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/theme/useTheme';

type Status = 'checking' | 'ready' | 'invalid' | 'success';

const RECOVERY_PARAMS = [
  'code',
  'access_token',
  'refresh_token',
  'error',
  'error_description',
  'error_code',
  'type',
] as const;

type RecoveryParams = Partial<Record<(typeof RECOVERY_PARAMS)[number], string | string[]>>;

/** Bangun URL recovery dari deep link native atau query/hash web. */
export function recoveryUrlFrom(
  linkingUrl: string | null,
  params: RecoveryParams,
  webHref?: string | null,
): string | null {
  if (webHref) return webHref;

  const query = new URLSearchParams();
  for (const key of RECOVERY_PARAMS) {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) query.set(key, first);
  }

  const search = query.toString();
  if (search.length > 0) {
    if (linkingUrl) {
      const separator = linkingUrl.includes('?') ? '&' : '?';
      return `${linkingUrl}${separator}${search}`;
    }
    return `gitscope://auth/update-password?${search}`;
  }

  return linkingUrl;
}

/**
 * Route publik khusus tautan reset password. URL recovery ditukar menjadi sesi
 * Supabase di sini; route ini tidak pernah menampilkan form bila tidak ada
 * token recovery yang valid, meskipun user kebetulan sudah login.
 */
export default function UpdatePasswordScreen() {
  const theme = useTheme();
  const linkingUrl = Linking.useURL();
  const params = useLocalSearchParams<RecoveryParams>();
  const updatePassword = useUpdatePassword();
  const signOut = useSignOut();

  const [status, setStatus] = useState<Status>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmation?: string }>({});
  const [formError, setFormError] = useState('');
  const handledUrl = useRef<string | null>(null);

  const webHref =
    typeof window !== 'undefined' &&
    typeof window.location !== 'undefined' &&
    window.location.pathname.includes('auth/update-password')
      ? window.location.href
      : null;
  const recoveryUrl = recoveryUrlFrom(linkingUrl, params, webHref);
  // URL yang jelas bukan recovery tidak perlu exchange; status diturunkan saat
  // render agar effect tidak memanggil setState secara sinkron.
  const unsupportedLink = recoveryUrl !== null && !isPasswordRecoveryUrl(recoveryUrl);
  const viewStatus: Status = unsupportedLink ? 'invalid' : status;
  const viewError = unsupportedLink
    ? 'Tautan reset tidak valid. Buka tautan terbaru dari email, atau minta tautan baru.'
    : errorMessage;

  useEffect(() => {
    if (!recoveryUrl || handledUrl.current === recoveryUrl) return;
    handledUrl.current = recoveryUrl;

    if (!isPasswordRecoveryUrl(recoveryUrl)) return;

    let active = true;

    void (async () => {
      const result = await completePasswordRecoveryFromUrl(recoveryUrl);
      if (!active) return;

      if (result.error) {
        setStatus('invalid');
        setErrorMessage(result.error);
        return;
      }

      // Jangan biarkan code/token recovery tertinggal di address bar web.
      if (typeof window !== 'undefined' && typeof window.history?.replaceState === 'function') {
        window.history.replaceState(null, '', `${window.location.origin}/auth/update-password`);
      }

      setStatus('ready');
    })();

    return () => {
      active = false;
    };
  }, [recoveryUrl]);

  const submit = async () => {
    if (updatePassword.isPending) return;

    const nextErrors: { password?: string; confirmation?: string } = {};
    if (password.length < 8) nextErrors.password = 'Password minimal 8 karakter.';
    if (confirmation !== password) {
      nextErrors.confirmation = 'Konfirmasi password tidak sama.';
    }
    setFieldErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;

    const result = await updatePassword.mutateAsync(password);
    if (result.error) {
      setFormError(result.error);
      return;
    }

    // Password berhasil disimpan. Akhiri sesi recovery agar user masuk kembali
    // dengan password baru dan tidak mendarat diam-diam di tabs.
    try {
      await signOut.mutateAsync();
    } catch {
      // Kegagalan logout remote tidak boleh menyembunyikan keberhasilan update.
    } finally {
      // Pastikan guard tidak membuka tabs dengan sesi recovery lama.
      useAuthStore.getState().signOut();
    }
    setPassword('');
    setConfirmation('');
    setStatus('success');
  };

  const goToLogin = () => router.replace('/login');

  const requestNewLink = async () => {
    try {
      await signOut.mutateAsync();
    } catch {
      // Tetap lanjut ke form permintaan tautan setelah sesi lokal dibersihkan.
    } finally {
      useAuthStore.getState().signOut();
    }
    router.replace('/forgot-password');
  };

  if (viewStatus === 'checking') {
    return (
      <AuthScaffold
        eyebrow="RESET PASSWORD"
        title="Memeriksa tautan."
        description="Tunggu sebentar, kami memvalidasi tautan reset password Anda.">
        <View style={{ alignItems: 'center', paddingVertical: 18 }}>
          <ActivityIndicator color={theme.colors.accent} />
          <T size={9} color="muted" style={{ marginTop: 10 }}>
            Memvalidasi tautan reset…
          </T>
        </View>
      </AuthScaffold>
    );
  }

  if (viewStatus === 'invalid') {
    return (
      <AuthScaffold
        eyebrow="RESET PASSWORD"
        title="Tautan tidak dapat dipakai."
        description="Tautan reset password hanya berlaku sekali dan memiliki masa berlaku terbatas.">
        <T size={9} color="error" lh={1.6}>
          {viewError}
        </T>
        <AuthButton label="Minta tautan baru" onPress={() => void requestNewLink()} />
        <AuthLink label="Kembali ke halaman masuk" onPress={goToLogin} />
      </AuthScaffold>
    );
  }

  if (viewStatus === 'success') {
    return (
      <AuthScaffold
        eyebrow="PASSWORD DIPERBARUI"
        title="Password berhasil disimpan."
        description="Gunakan password baru untuk masuk kembali ke Gitscope.">
        <T size={10} weight="700" lh={1.6}>
          Password akun Anda sudah diperbarui.
        </T>
        <AuthButton label="Masuk dengan password baru" onPress={goToLogin} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      eyebrow="PASSWORD BARU"
      title="Buat password baru."
      description="Password minimal 8 karakter. Jangan gunakan password yang sama dengan akun lain.">
      <AuthField
        label="PASSWORD BARU"
        value={password}
        onChangeText={setPassword}
        placeholder="Minimal 8 karakter"
        secureTextEntry
        autoComplete="new-password"
        error={fieldErrors.password}
      />
      <AuthField
        label="ULANGI PASSWORD BARU"
        value={confirmation}
        onChangeText={setConfirmation}
        placeholder="Ketik ulang password"
        secureTextEntry
        autoComplete="new-password"
        error={fieldErrors.confirmation}
      />

      {formError.length > 0 ? (
        <T size={9} color="error" lh={1.6}>
          {formError}
        </T>
      ) : null}

      <AuthButton
        label="Simpan password baru"
        loadingLabel="Menyimpan…"
        loading={updatePassword.isPending}
        onPress={() => void submit()}
      />
      <AuthLink label="Batal dan kembali ke masuk" onPress={goToLogin} />
    </AuthScaffold>
  );
}
