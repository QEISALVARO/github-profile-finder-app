import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { T } from '@/components/ui/T';
import type { AnalysisVM } from '@/api/analysis';

export type ScoreCardProps = {
  /** FE-2 — the card renders the AnalysisVM, never a raw GitHub payload. */
  vm: AnalysisVM;
};

/**
 * FR-A5 — green authenticity card (design.md §3.11).
 * The copy below it stays verbatim from PRD §5.3 (static in v1).
 */
export function ScoreCard({ vm }: ScoreCardProps) {
  const authenticity = vm.authenticity;
  return (
    <Card variant="score" style={styles.card}>
      <ScoreRing value={authenticity} accessibilityLabel={`Skor keaslian ${authenticity} dari 100`} />
      <View style={styles.copy}>
        <T size={7} mono ls={1} color="onAccent">
          HIGH CONFIDENCE
        </T>
        <T size={14} weight="700" color="onAccent" style={styles.title}>
          Original, active work
        </T>
        <T size={8} lh={1.5} color="onAccent">
          Aktivitas konsisten dan mayoritas repository bukan hasil fork.
        </T>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  copy: {
    flex: 1,
    gap: 0,
  },
  title: {
    marginTop: 4,
    marginBottom: 4,
  },
});
