import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { useTheme } from '@/theme/useTheme';

/**
 * FR-A — empty state untuk bagian PROJECT EVIDENCE. Data GitHub publik memang
 * bisa kosong sungguhan (akun tanpa repository publik); sebutkan apa adanya,
 * jangan diisi placeholder (POL-5). Bahasa visual mengikuti `FeedEmpty`
 * (dashed shell) agar "kosong" dan "gagal" tetap terbaca berbeda.
 */
export function ReposEmpty() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderColor: theme.colors.line }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.colors.accentSoft }]}>
        <Icon name="repo" size={22} color={theme.colors.greenText} />
      </View>

      <T size={12} weight="700" style={styles.title}>
        No public repositories
      </T>
      <T size={8} color="muted" style={styles.body}>
        Profil GitHub ini tidak memiliki repository publik.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
});

export default ReposEmpty;
