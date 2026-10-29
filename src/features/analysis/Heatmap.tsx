import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HEATMAP_FULL_WIDTH } from '@/config/flags';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { T } from '@/components/ui/T';
import { useTheme } from '@/theme/useTheme';

const COLUMNS = 12;
const ROWS = 7;
const CELL = 7;
const GAP = 3;
const LEVELS = 5;

/** heat0…heat4 in level order — avoids a computed index into the token map. */
const HEAT_TOKENS = ['heat0', 'heat1', 'heat2', 'heat3', 'heat4'] as const;

/** Deterministic cell level from design.md §3.13: `(i*7 + (i%5)) % 5`. */
function levelFor(index: number): number {
  return (index * 7 + (index % 5)) % LEVELS;
}

export type HeatmapProps = {
  /** Section title — design.md §3.13 default is "12 month momentum". */
  label?: string;
  /** 84 cells (12 columns × 7 rows) from `AnalysisVM.heatmap`. */
  values?: number[];
  /** Note beside the heading: PRD §5.3 keeps 642 static in v1. */
  contributions?: number;
};

/**
 * FR-A7 + D8 — 12×7 contribution heatmap (design.md §3.13).
 *
 * FE-2: the section heading moved inside the component so its title is a real
 * prop with the documented default.
 */
export function Heatmap({
  label = '12 month momentum',
  values,
  contributions = 642,
}: HeatmapProps) {
  const theme = useTheme();
  const [innerWidth, setInnerWidth] = useState(0);

  // D8: default keeps the prototype's 7×7 cells; the flag stretches them to
  // fill the card: cell = (innerWidth − 11*3) / 12.
  const cell = HEATMAP_FULL_WIDTH && innerWidth > 0 ? (innerWidth - 11 * GAP) / COLUMNS : CELL;

  const columns = Array.from({ length: COLUMNS }, (_, col) => col);

  return (
    <>
      <SectionHeading
        eyebrow="CONTRIBUTION ACTIVITY"
        title={label}
        rightVariant="mono-note"
        note={`${contributions} contributions`}
      />

      <Card variant="heatmap">
        <View style={styles.gridWrap} onLayout={(e) => setInnerWidth(e.nativeEvent.layout.width)}>
          <View style={styles.grid}>
            {columns.map((col) => (
              <View key={col} style={styles.column}>
                {Array.from({ length: ROWS }, (_, row) => {
                  const index = col * ROWS + row;
                  const level = levelFor(index);
                  const value = values?.[index] ?? level;
                  return (
                    <View
                      key={row}
                      style={[
                        styles.cell,
                        {
                          width: cell,
                          height: cell,
                          backgroundColor:
                            theme.colors[HEAT_TOKENS[Math.max(0, Math.min(LEVELS - 1, value))]],
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.legend}>
            <T size={7} color="muted">
              Less
            </T>
            {[0, 2, 4].map((level) => (
              <View
                key={level}
                style={[styles.cell, styles.legendCell, { backgroundColor: theme.colors[HEAT_TOKENS[level]] }]}
              />
            ))}
            <T size={7} color="muted">
              More
            </T>
          </View>
          <T size={7} weight="700" color="greenText">
            +18% vs last year
          </T>
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  gridWrap: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    gap: GAP,
  },
  column: {
    gap: GAP,
  },
  cell: {
    borderRadius: 2,
  },
  legendCell: {
    width: CELL,
    height: CELL,
  },
  footer: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
  },
});
