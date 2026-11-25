import { StyleSheet, View } from 'react-native';

import { T } from '@/components/ui/T';

/** FR-E5 — heading + live project counter (design.md §3.5).
 * `label` defaults to "FEATURED THIS WEEK" (default view without filters);
 * other views show "SEARCH RESULTS". */
export function FeedHeading({ count, label }: { count: number; label?: 'FEATURED THIS WEEK' | 'SEARCH RESULTS' }) {
  const headingLabel = label ?? 'FEATURED THIS WEEK';
  const subtitle = label === 'SEARCH RESULTS' ? 'Hasil pencarian' : 'Verified project feed';
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <T size={7} mono ls={0.7} color="greenText">
          {headingLabel}
        </T>
        <T variant="h3Feed" style={styles.title}>
          {subtitle}
        </T>
      </View>
      <T size={7} mono color="muted">
        {count} PROJECTS
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 11,
    gap: 12,
  },
  left: {
    flexShrink: 1,
  },
  title: {
    marginTop: 3,
  },
});

export default FeedHeading;
