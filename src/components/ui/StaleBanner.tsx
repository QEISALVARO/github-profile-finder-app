import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { useTheme } from '@/theme/useTheme';

export type StaleBannerProps = {
  /** ISO timestamp of the last successful load; omitted → generic copy. */
  since?: string;
  onReload?: () => void;
  reloadLabel?: string;
};

function relativeSince(iso: string | undefined): string | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;

  const minutes = Math.max(1, Math.round((Date.now() - time) / 60_000));
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

/**
 * FE-2 — stale data banner (PRD v2 §15: "Diperbarui X jam lalu · Muat ulang").
 * Rendered above the Analysis content whenever the VM reports `source: stale`.
 */
export function StaleBanner({ since, onReload, reloadLabel = 'Muat ulang' }: StaleBannerProps) {
  const theme = useTheme();
  const relative = relativeSince(since);

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: theme.colors.paper, borderColor: theme.colors.line }]}>
      <Icon name="history" size={14} color={theme.colors.muted} />
      <T size={8} color="muted" style={styles.text}>
        {relative ? `Diperbarui ${relative}` : 'Data mungkin sudah kedaluwarsa'}
      </T>

      {onReload ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={reloadLabel}
          android_ripple={{ color: 'transparent' }}
          hitSlop={hitSlopFor(72, 44)}
          onPress={onReload}
          style={({ pressed }) => [styles.reload, pressed && styles.pressed]}>
          <T size={8} weight="700" color="greenText">
            {reloadLabel}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  text: {
    flex: 1,
  },
  reload: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default StaleBanner;
