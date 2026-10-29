import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { useTheme } from '@/theme/useTheme';

export type MetricGridProps = {
  originalRatio: number;
  originalCount: number;
  repoCount: number;
  demoRatio: number;
  /** Nilai BE (opsional — default = label v1 agar fixture lama tetap jalan). */
  commitHealth?: 'Consistent' | 'Irregular' | 'Sporadic';
  contributionDepth?: 'Deep' | 'Moderate' | 'Light';
};

/** FR-A6 — 2×2 metric grid (design.md §3.12). Nilai BE bila VM tersedia (PRD v2 §9.2). */
export function MetricGrid({
  originalRatio,
  originalCount,
  repoCount,
  demoRatio,
  commitHealth = 'Consistent',
  contributionDepth = 'Deep',
}: MetricGridProps) {
  const theme = useTheme();

  const metrics: { icon: IconName; label: string; value: string; sub: string }[] = [
    { icon: 'check', label: 'Original work', value: `${originalRatio}%`, sub: `${originalCount} of ${repoCount} repos` },
    { icon: 'history', label: 'Commit health', value: commitHealth, sub: 'Active this month' },
    { icon: 'arrow', label: 'Live demos', value: `${demoRatio}%`, sub: 'Links verified' },
    { icon: 'users', label: 'Contribution', value: contributionDepth, sub: 'PRs & issues active' },
  ];

  return (
    <View style={styles.grid}>
      {metrics.map((metric) => (
        <Card key={metric.label} variant="base" padding={13} style={styles.cell}>
          <View style={styles.labelRow}>
            <Icon name={metric.icon} size={13} color={theme.colors.greenText} />
            <T size={7} weight="700" color="greenText">
              {metric.label}
            </T>
          </View>
          <T size={13} weight="700" style={styles.value}>
            {metric.value}
          </T>
          <T size={7} color="muted">
            {metric.sub}
          </T>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  cell: {
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: 13,
    gap: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    marginTop: 6,
    marginBottom: 1,
  },
});
