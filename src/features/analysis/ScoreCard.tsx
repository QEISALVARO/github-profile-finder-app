import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import type { AnalysisVM } from '@/api/analysis';
import { TIER_COPY } from '@/lib/score';

export type ScoreCardProps = {
  /** FE-2 — the card renders the AnalysisVM, never a raw GitHub payload. */
  vm: AnalysisVM;
  /** B1 — opens the full component + evidence breakdown. */
  onViewBreakdown?: () => void;
};

/**
 * FR-A5 — green authenticity card (design.md §3.11).
 * Authenticity, confidence and tier all come from the VM.
 */
export function ScoreCard({ vm, onViewBreakdown }: ScoreCardProps) {
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

        {onViewBreakdown ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lihat rincian skor"
            hitSlop={hitSlopFor(140, 22)}
            onPress={onViewBreakdown}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <T size={8} weight="800" color="onAccent">
              Lihat rincian →
            </T>
          </Pressable>
        ) : null}
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
  link: {
    marginTop: 6,
    minHeight: 20,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.85,
  },
});
