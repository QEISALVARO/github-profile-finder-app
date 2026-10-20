import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';

const EXAMPLES = ['Flutter E-Commerce', 'Python ML', 'Golang'] as const;

/**
 * FR-E3 — "Try:" row of example queries (design.md §3.3). Tapping a chip
 * sets the feed query; "Python ML"/"Golang" intentionally lead to the empty
 * state (PRD O4).
 */
export function SearchExamples() {
  const setQuery = useAppStore((s) => s.setQuery);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        <T size={8} color="muted" style={styles.label}>
          Try:
        </T>
        {EXAMPLES.map((term) => (
          <Chip
            key={term}
            variant="soft"
            size={7}
            onPress={() => setQuery(term)}
            accessibilityLabel={`Cari ${term}`}>
            {term}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 11,
    marginBottom: 16,
    marginHorizontal: 1,
  },
  row: {
    gap: 5,
    alignItems: 'center',
    paddingRight: 4,
  },
  label: {
    marginRight: 2,
  },
});

export default SearchExamples;
