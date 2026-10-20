import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HEATMAP_FULL_WIDTH } from '@/config/flags';
import { Card } from '@/components/ui/Card';
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

/** FR-A7 + D8 — 12×7 contribution heatmap (design.md §3.13). */
export function Heatmap() {
  const theme = useTheme();
  const [innerWidth, setInnerWidth] = useState(0);

  // D8: default keeps the prototype's 7×7 cells; the flag stretches them to
  // fill the card: cell = (innerWidth − 11*3) / 12.
  const cell = HEATMAP_FULL_WIDTH && innerWidth > 0 ? (innerWidth - 11 * GAP) / COLUMNS : CELL;

  const columns = Array.from({ length: COLUMNS }, (_, col) => col);

  return (
    <Card variant="heatmap">
      <View style={styles.gridWrap} onLayout={(e) => setInnerWidth(e.nativeEvent.layout.width)}>
        <View style={styles.grid}>
          {columns.map((col) => (
            <View key={col} style={styles.column}>
              {Array.from({ length: ROWS }, (_, row) => {
                const index = col * ROWS + row;
                const level = levelFor(index);
                return (
                  <View
                    key={row}
                    style={[
                      styles.cell,
                      {
                        width: cell,
                        height: cell,
                        backgroundColor: theme.colors[HEAT_TOKENS[level]],
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
