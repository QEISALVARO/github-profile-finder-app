import { Pressable, StyleSheet, View } from 'react-native';

import type { AnalysisVM } from '@/api/contracts';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { openHttpsUrl } from '@/lib/links';
import {
  SCORE_COMPONENTS,
  SCORE_DISCLAIMER,
  TIER_COPY,
  componentPercent,
  componentRatioLabel,
} from '@/lib/score';
import { useTheme } from '@/theme/useTheme';

export type ScoreBreakdownProps = {
  /** FE-2/B1 — every number is read from the VM, never recalculated. */
  vm: AnalysisVM;
  /** B2 — hide the "candidate" wording when viewing your own score. */
  own?: boolean;
};

/**
 * AIR-1/AIR-2 — score summary, the five weighted components and the evidence
 * that produced them. Shared by `/explore/evidence` (candidate) and
 * `/profile/my-score` (own score) so both screens say exactly the same thing.
 */
export function ScoreBreakdown({ vm, own = false }: ScoreBreakdownProps) {
  const theme = useTheme();
  const evidence = vm.breakdown.evidence;

  return (
    <>
      <Card variant="score" style={styles.summary}>
        <View style={styles.scoreRow}>
          <T size={26} weight="800" color="onAccent">
            {`${vm.authenticity}/100`}
          </T>
          <Badge variant="verified" accessibilityLabel={`Tier ${vm.tier}`}>
            {vm.tier.toUpperCase()}
          </Badge>
        </View>
        <T size={12} weight="700" color="onAccent" style={styles.tierCopy}>
          {TIER_COPY[vm.tier]}
        </T>
        <T size={8} color="onAccent" lh={1.5}>
          {`${vm.confidence}% confidence · score v${vm.scoreVersion}`}
        </T>
      </Card>

      <Card variant="base" style={styles.components}>
        <T size={8} mono ls={1.4} color="greenText" style={styles.eyebrow}>
          SCORE COMPONENTS
        </T>
        {SCORE_COMPONENTS.map((component) => {
          const value = vm.breakdown[component.key];
          return (
            <View key={component.key} style={styles.componentRow}>
              <View style={styles.componentHead}>
                <T size={9} weight="700">
                  {component.label}
                </T>
                <T size={8} mono color="muted">
                  {componentRatioLabel(value, component.max)}
                </T>
              </View>
              <ProgressBar
                value={componentPercent(value, component.max)}
                accessibilityLabel={`${component.label} ${value} dari ${component.max}`}
              />
            </View>
          );
        })}
      </Card>

      <Card variant="base" style={styles.evidenceCard}>
        <T size={8} mono ls={1.4} color="greenText" style={styles.eyebrow}>
          EVIDENCE
        </T>

        {evidence.length === 0 ? (
          <T size={8} color="muted" lh={1.5}>
            Belum ada bukti yang dapat ditampilkan untuk profil ini.
          </T>
        ) : (
          evidence.map((item, index) => {
            const hasLink = typeof item.url === 'string' && item.url.length > 0;
            const content = (
              <>
                <View style={styles.evidenceHead}>
                  <T size={9} weight="700" style={styles.evidenceLabel}>
                    {item.label}
                  </T>
                  {hasLink ? (
                    <Icon name="arrow" size={14} color={theme.colors.greenText} />
                  ) : null}
                </View>
                <T size={8} color="muted" lh={1.5}>
                  {item.reason}
                </T>
              </>
            );

            if (!hasLink) {
              return (
                <View key={`${item.label}-${index}`} style={styles.evidenceItem}>
                  {content}
                </View>
              );
            }

            return (
              <Pressable
                key={`${item.label}-${index}`}
                accessibilityRole="link"
                accessibilityLabel={`Buka bukti ${item.label}`}
                android_ripple={{ color: 'transparent' }}
                hitSlop={hitSlopFor(280, 44)}
                onPress={() => openHttpsUrl(item.url as string)}
                style={({ pressed }) => [styles.evidenceItem, pressed && styles.pressed]}>
                {content}
              </Pressable>
            );
          })
        )}
      </Card>

      <View style={[styles.disclaimer, { borderColor: theme.colors.line }]}>
        <Icon name="check" size={15} color={theme.colors.greenText} />
        <T size={8} color="muted" lh={1.5} style={styles.disclaimerText}>
          {SCORE_DISCLAIMER}
          {own ? ' Skor ini milik akun Anda dan tidak dipakai untuk keputusan otomatis.' : ''}
        </T>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginBottom: 13,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tierCopy: {
    marginTop: 7,
    marginBottom: 3,
  },
  components: {
    gap: 11,
    marginBottom: 13,
  },
  eyebrow: {
    marginBottom: 2,
  },
  componentRow: {
    gap: 5,
  },
  componentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  evidenceCard: {
    gap: 10,
    marginBottom: 13,
  },
  evidenceItem: {
    gap: 3,
    minHeight: 44,
    justifyContent: 'center',
  },
  evidenceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evidenceLabel: {
    flex: 1,
  },
  disclaimer: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default ScoreBreakdown;
