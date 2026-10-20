import { StyleSheet, View } from 'react-native';

import { T } from '@/components/ui/T';

/** FR-E5 — "FEATURED THIS WEEK" heading + live project counter (design.md §3.5). */
export function FeedHeading({ count }: { count: number }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <T size={7} mono ls={0.7} color="greenText">
          FEATURED THIS WEEK
        </T>
        <T variant="h3Feed" style={styles.title}>
          Verified project feed
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
