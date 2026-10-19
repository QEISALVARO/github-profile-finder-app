import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { T } from './T';
import { hitSlopFor } from './hit-slop';

export type SectionHeadingRight = 'mono-note' | 'verified-label' | 'view-all';

export type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  rightVariant?: SectionHeadingRight;
  note?: string;
  verifiedLabel?: string;
  viewAllLabel?: string;
  onPressViewAll?: () => void;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** design.md §3.9 — label + title on the left, one of three right-hand slots. */
export function SectionHeading({
  eyebrow,
  title,
  rightVariant = 'mono-note',
  note,
  verifiedLabel = 'VERIFIED',
  viewAllLabel = 'View all',
  onPressViewAll,
  right,
  style,
}: SectionHeadingProps) {
  const theme = useTheme();

  let rightSlot: ReactNode = null;

  if (right) {
    rightSlot = right;
  } else if (rightVariant === 'mono-note') {
    rightSlot = note ? (
      <T size={7} mono color="muted">
        {note}
      </T>
    ) : null;
  } else if (rightVariant === 'verified-label') {
    rightSlot = (
      <Badge variant="verified" label={verifiedLabel}>
        {verifiedLabel}
      </Badge>
    );
  } else {
    rightSlot = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={viewAllLabel}
        android_ripple={{ color: 'transparent' }}
        disabled={!onPressViewAll}
        hitSlop={hitSlopFor(80, 15)}
        onPress={onPressViewAll}
        style={({ pressed }) => [styles.viewAll, pressed && styles.pressed]}>
        <T size={10} weight="700" color="muted">
          {viewAllLabel}
        </T>
        <Icon name="arrow" size={15} color={theme.colors.muted} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        <T size={8} mono ls={1.8} color="greenText" style={styles.eyebrow}>
          {eyebrow}
        </T>
        <T size={18} weight="700" ls={-0.6}>
          {title}
        </T>
      </View>
      {rightSlot}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 27,
    marginBottom: 13,
    marginHorizontal: 1,
    gap: 12,
  },
  left: {
    flexShrink: 1,
  },
  eyebrow: {
    marginBottom: 3,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});
