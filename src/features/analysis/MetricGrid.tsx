import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { useTheme } from '@/theme/useTheme';
import type { AnalysisVM } from '@/api/analysis';

export type MetricGridProps = {
  /** FE-2 — the grid renders the AnalysisVM, never a raw GitHub payload. */
  vm: AnalysisVM;
};

/**
 * FR-A6 — 2×2 metric grid (design.md §3.12).
 *
 * The denominator never drops below the numerator: PRD §5.4 candidates report
 * 184 original projects while the VM only carries the top 8 repositories, so
 * `max(repos, originalCount)` keeps "184 of 184" honest — and leaves every
 * existing fixture ("2 of 2", "0 of 2") untouched.
 */
export function MetricGrid({ vm }: MetricGridProps) {
  const theme = useTheme();
  const { metrics } = vm;
  const repoCount = Math.max(vm.repos.length, metrics.originalCount);

  const cells: { icon: IconName; label: string; value: string; sub: string }[] = [
    {
      icon: 'check',
      label: 'Original work',
      value: `${metrics.originalRatio}%`,
      sub: `${metrics.originalCount} of ${repoCount} repos`,
    },
    {
      icon: 'history',
      label: 'Commit health',
      value: metrics.commitHealth,
      sub: 'Active this month',
    },
    {
      icon: 'arrow',
      label: 'Live demos',
      value: `${metrics.demoRatio}%`,
      sub: 'Links detected',
    },
    {
      icon: 'users',
      label: 'Contribution',
      value: metrics.contributionDepth,
      sub: 'PRs & issues active',
    },
  ];

  return (
    <View style={styles.grid}>
      {cells.map((metric) => (
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
