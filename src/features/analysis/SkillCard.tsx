import { StyleSheet, View } from 'react-native';

import { languageColors, type ColorToken } from '@/theme/tokens';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { T } from '@/components/ui/T';
import { useTheme } from '@/theme/useTheme';
import type { LanguageStat } from '@/lib/scoring';

export type SkillCardProps = {
  role: string;
  stats: LanguageStat[];
};

/** FR-A4 — skill fingerprint (design.md §3.10). */
export function SkillCard({ role, stats }: SkillCardProps) {
  const theme = useTheme();

  return (
    <Card variant="skill">
      <View style={[styles.roleSummary, { borderBottomColor: theme.colors.line }]}>
        <View style={[styles.iconBox, { backgroundColor: theme.colors.accentSoft }]}>
          <Icon name="chart" size={20} color={theme.colors.greenStrong} />
        </View>
        <View style={styles.roleColumn}>
          <T size={6} mono ls={0.8} color="greenText">
            PRIMARY SPECIALIZATION
          </T>
          <T size={13} weight="700" style={styles.role}>
            {role}
          </T>
          <T size={7} color="muted">
            Detected from languages, topics & dependencies
          </T>
        </View>
      </View>

      <View style={styles.breakdown}>
        {stats.map((stat) => {
          const colorToken: ColorToken | undefined = languageColors[stat.name];
          return (
            <View key={stat.name} style={styles.langRow}>
              <View style={styles.langHeader}>
                <View style={styles.langLabel}>
                  <View
                    style={[
                      styles.langDot,
                      { backgroundColor: theme.colors[colorToken ?? 'langDefault'] },
                    ]}
                  />
                  <T size={8} color="muted">
                    {stat.name}
                  </T>
                </View>
                <T size={7} mono color="ink">
                  {stat.value}%
                </T>
              </View>
              <ProgressBar
                value={stat.value}
                accessibilityLabel={`${stat.name} ${stat.value} persen`}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.frameworks}>
        <Chip variant="default" mono size={7}>
          React
        </Chip>
        <Chip variant="default" mono size={7}>
          Vite
        </Chip>
        <Chip variant="default" mono size={7}>
          Node.js
        </Chip>
        <Chip variant="dashed" mono size={7}>
          +3 tools
        </Chip>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  roleSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 39,
    height: 39,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleColumn: {
    flex: 1,
    gap: 0,
  },
  role: {
    marginTop: 2,
    marginBottom: 2,
  },
  breakdown: {
    marginTop: 14,
    gap: 10,
  },
  langRow: {
    gap: 5,
  },
  langHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
    gap: 8,
  },
  langLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  langDot: {
    width: 6,
    height: 6,
    borderRadius: 9999,
  },
  frameworks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 14,
  },
});
