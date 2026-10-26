import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PageContainer } from '@/components/PageContainer';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { DeveloperStep } from '@/features/onboarding/DeveloperStep';
import { RecruiterStep } from '@/features/onboarding/RecruiterStep';
import { RoleStep } from '@/features/onboarding/RoleStep';
import { useAuthStore, type UserRole } from '@/store/useAuthStore';
import { useTheme } from '@/theme/useTheme';

/**
 * PRD v2 §6.1 langkah 3 — onboarding peran (layar baru §15.1).
 * Wizard: Role → Developer → Recruiter (form mengikuti peran yang dipilih).
 */

type StepKey = 'role' | UserRole;

const STEP_META: Record<
  StepKey,
  { eyebrow: string; title: string; description: string }
> = {
  role: {
    eyebrow: 'PERAN',
    title: 'Siapa Anda?',
    description: 'Pilih satu peran, atau keduanya bila Anda sekaligus developer dan recruiter.',
  },
  developer: {
    eyebrow: 'PROFIL DEVELOPER',
    title: 'Di mana Anda berbasis?',
    description:
      'Negara domisili menentukan apakah Anda bisa tampil di Feed & Discover (wajib untuk listing).',
  },
  recruiter: {
    eyebrow: 'PROFIL RECRUITER',
    title: 'Perusahaan & target Anda',
    description:
      'Data ini dibawa di pesan pertama ke kandidat, dan negara tujuan mengisi awal filter Anda.',
  },
};

export default function OnboardingScreen() {
  const theme = useTheme();
  const roles = useAuthStore((s) => s.roles);
  const setRoles = useAuthStore((s) => s.setRoles);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const company = useAuthStore((s) => s.company);

  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(roles);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');

  const steps: StepKey[] = ['role', ...selectedRoles];
  const clampedIndex = Math.min(stepIndex, steps.length - 1);
  const currentKey = steps[clampedIndex];
  const meta = STEP_META[currentKey];
  const isFirst = clampedIndex === 0;
  const isLast = clampedIndex === steps.length - 1;
  // Langkah peran selalu "Lanjut" — "Selesai" hanya di akhir form terakhir
  // (steps bisa berjumlah 1 saat belum ada peran dipilih).
  const isFinalStep = isLast && currentKey !== 'role';

  const toggleRole = (role: UserRole) => {
    setError('');
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleBack = () => {
    if (isFirst) return;
    setError('');
    setStepIndex(clampedIndex - 1);
  };

  const handleNext = () => {
    setError('');

    if (currentKey === 'role') {
      if (selectedRoles.length === 0) {
        setError('Pilih minimal satu peran untuk melanjutkan.');
        return;
      }
      setRoles(selectedRoles);
      setStepIndex(1);
      return;
    }

    if (currentKey === 'recruiter' && company.trim().length === 0) {
      setError('Nama perusahaan wajib diisi sebelum melanjutkan.');
      return;
    }

    if (isFinalStep) {
      completeOnboarding();
      router.replace('/explore');
      return;
    }

    setStepIndex(clampedIndex + 1);
  };

  return (
    <PageContainer keyboardShouldPersistTaps="handled">
      {/* Header: back + step counter */}
      <View style={styles.header}>
        {isFirst ? (
          <View style={styles.backPlaceholder} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            hitSlop={hitSlopFor(44, 44)}
            onPress={handleBack}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <View style={styles.backIcon}>
              <Icon name="arrow" size={16} color={theme.colors.muted} />
            </View>
            <T size={9} weight="700" color="muted">
              Kembali
            </T>
          </Pressable>
        )}
        <T size={7} mono color="muted" ls={1}>
          STEP {clampedIndex + 1} / {steps.length}
        </T>
      </View>

      <ProgressBar
        value={((clampedIndex + 1) / steps.length) * 100}
        accessibilityLabel="Progres onboarding"
        style={styles.progress}
      />

      {/* Intro langkah */}
      <View style={styles.intro}>
        <T size={8} mono ls={1.8} color="greenText" style={styles.eyebrow}>
          {meta.eyebrow}
        </T>
        <T size={26} weight="800" ls={-1.2} lh={1.1} style={styles.title}>
          {meta.title}
        </T>
        <T size={11} color="muted" lh={1.6}>
          {meta.description}
        </T>
      </View>

      {/* Isi langkah */}
      <View style={styles.body}>
        {currentKey === 'role' ? (
          <RoleStep selected={selectedRoles} onToggle={toggleRole} />
        ) : currentKey === 'developer' ? (
          <DeveloperStep />
        ) : (
          <RecruiterStep />
        )}
      </View>

      {error.length > 0 ? (
        <T size={9} color="error" lh={1.5} style={styles.error}>
          {error}
        </T>
      ) : null}

      {/* CTA */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isFinalStep ? 'Selesaikan onboarding' : 'Lanjut'}
        android_ripple={{ color: 'transparent' }}
        onPress={handleNext}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.colors.accent, borderColor: theme.colors.ink },
          pressed && styles.pressed,
        ]}>
        <T size={11} weight="800" color="onAccent">
          {isFinalStep ? 'Selesai' : 'Lanjut'}
        </T>
        <Icon name="arrow" size={16} color={theme.colors.onAccent} />
      </Pressable>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    minHeight: 32,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backIcon: {
    transform: [{ rotate: '180deg' }],
  },
  backPlaceholder: {
    width: 1,
    height: 1,
  },
  progress: {
    marginTop: 14,
  },
  intro: {
    marginTop: 26,
    gap: 6,
  },
  eyebrow: {
    marginBottom: 2,
  },
  title: {
    marginBottom: 4,
  },
  body: {
    marginTop: 24,
  },
  error: {
    marginTop: 14,
  },
  cta: {
    marginTop: 28,
    height: 48,
    borderRadius: 11,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  pressed: {
    opacity: 0.85,
  },
});
