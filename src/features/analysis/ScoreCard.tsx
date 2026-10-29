import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { T } from '@/components/ui/T';

export type ScoreCardProps = {
  authenticity: number;
  /** Confidence BE (0–100). Default 94 = label v1 sebelum R2. */
  confidence?: number;
  /** Tier BE — menentukan copy, bukan angka statis. */
  tier?: 'high' | 'medium' | 'low';
};

/** FR-A5 — green authenticity card (design.md §3.11). Copy mengikuti tier BE (PRD v2 §9.2). */
export function ScoreCard({ authenticity, confidence = 94, tier = 'high' }: ScoreCardProps) {
  const copy =
    tier === 'high'
      ? 'Original, active work'
      : tier === 'medium'
        ? 'Promising signals, verify evidence'
        : 'Limited verifiable evidence';
  return (
    <Card variant="score" style={styles.card}>
      <ScoreRing value={authenticity} accessibilityLabel={`Skor keaslian ${authenticity} dari 100`} />
      <View style={styles.copy}>
        <T size={7} mono ls={1} color="onAccent">
          {`${confidence}% CONFIDENCE`}
        </T>
        <T size={14} weight="700" color="onAccent" style={styles.title}>
          {copy}
        </T>
        <T size={8} lh={1.5} color="onAccent">
          {tier === 'high'
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
