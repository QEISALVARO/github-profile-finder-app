import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { T } from '@/components/ui/T';
import type { AnalysisVM } from '@/api/analysis';

export type ScoreCardProps = {
  /** FE-2 — the card renders the AnalysisVM, never a raw GitHub payload. */
  vm: AnalysisVM;
};

/** PRD v2 §9.2 — tier copy follows the BE tier, never a static label. */
const TIER_COPY: Record<AnalysisVM['tier'], string> = {
  high: 'Original, active work',
  medium: 'Promising signals, verify evidence',
  low: 'Limited verifiable evidence',
};

/**
 * FR-A5 — green authenticity card (design.md §3.11).
 * Authenticity, confidence and tier all come from the VM.
 */
export function ScoreCard({ vm }: ScoreCardProps) {
  const authenticity = vm.authenticity;
  const copy = TIER_COPY[vm.tier];

  return (
    <Card variant="score" style={styles.card}>
      <ScoreRing value={authenticity} accessibilityLabel={`Skor keaslian ${authenticity} dari 100`} />
      <View style={styles.copy}>
        <T size={7} mono ls={1} color="onAccent">
          {`${vm.confidence}% CONFIDENCE`}
        </T>
        <T size={14} weight="700" color="onAccent" style={styles.title}>
          {copy}
        </T>
        <T size={8} lh={1.5} color="onAccent">
          {vm.tier === 'high'
            ? 'Aktivitas konsisten dan mayoritas repository bukan hasil fork.'
            : 'Periksa evidence di bawah sebelum menghubungi kandidat.'}
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
