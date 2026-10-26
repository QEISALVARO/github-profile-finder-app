import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import type { UserRole } from '@/store/useAuthStore';
import { useTheme } from '@/theme/useTheme';

export type RoleStepProps = {
  selected: UserRole[];
  onToggle: (role: UserRole) => void;
};

const OPTIONS: { role: UserRole; icon: IconName; title: string; description: string }[] = [
  {
    role: 'developer',
    icon: 'repo',
    title: 'Saya Developer',
    description: 'Publikasikan proyek, atur visibilitas, dan ditemukan recruiter lewat hasil kerja nyata.',
  },
  {
    role: 'recruiter',
    icon: 'briefcase',
    title: 'Saya Recruiter',
    description: 'Cari kandidat opt-in, simpan ke pipeline, dan mulai percakapan dengan konteks perusahaan.',
  },
];

/** PRD v2 §6.1 langkah 3 — pilih peran Developer dan/atau Recruiter (K3). */
export function RoleStep({ selected, onToggle }: RoleStepProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const active = selected.includes(option.role);
        return (
          <Pressable
            key={option.role}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            android_ripple={{ color: 'transparent' }}
            onPress={() => onToggle(option.role)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: active ? theme.colors.accentSoft : theme.colors.surface,
                borderColor: active ? theme.colors.accent : theme.colors.line,
              },
              pressed && styles.pressed,
            ]}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.surface }]}>
              <Icon
                name={option.icon}
                size={20}
                color={active ? theme.colors.greenStrong : theme.colors.muted}
              />
            </View>
            <View style={styles.copy}>
              <T size={13} weight="700" style={styles.title}>
                {option.title}
              </T>
              <T size={9} color="muted" lh={1.55}>
                {option.description}
              </T>
            </View>
            <View
              style={[
                styles.check,
                {
                  borderColor: active ? theme.colors.accent : theme.colors.line,
                  backgroundColor: active ? theme.colors.accent : 'transparent',
                },
              ]}>
              {active ? <Icon name="check" size={13} color={theme.colors.onAccent} /> : null}
            </View>
          </Pressable>
        );
      })}

      <T size={8} color="muted" lh={1.6} style={styles.note}>
        Bisa memilih keduanya — peran dapat ditambahkan lagi kapan saja lewat Settings.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1.5,
  },
  iconBox: {
    width: 39,
    height: 39,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    marginBottom: 1,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    marginTop: 4,
  },
  pressed: {
    opacity: 0.9,
  },
});

export default RoleStep;
