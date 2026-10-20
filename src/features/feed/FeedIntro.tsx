import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { T } from '@/components/ui/T';
import { useTheme } from '@/theme/useTheme';
import { introHeadingSize } from '@/theme/typography';

/**
 * FR-E1 — Explore intro (design.md §2.3): eyebrow, two-line H1 with the
 * green highlight bar behind "work.", and the body copy.
 */
export function FeedIntro() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  // clamp(37, 10vw, 45) — cap the measured width at the 430 phone width so
  // tablets/web do not scale the heading past the prototype.
  const headingSize = introHeadingSize(Math.min(width, 430));

  return (
    <View style={styles.container}>
      <T variant="eyebrow" style={styles.eyebrow}>
        PROJECT DISCOVERY FEED
      </T>

      <T size={headingSize} weight="800" lh={1.02} ls={-2.5}>
        Discover talent
      </T>

      <View style={styles.headingRow}>
        <T size={headingSize} weight="800" lh={1.02} ls={-2.5}>
          through{' '}
        </T>
        <View style={styles.highlightWrap}>
          <View
            pointerEvents="none"
            style={[
              styles.highlightBar,
              { backgroundColor: theme.colors.accent },
            ]}
          />
          <T size={headingSize} weight="800" lh={1.02} ls={-2.5}>
            work.
          </T>
        </View>
      </View>

      <T variant="bodyIntro" style={styles.copy}>
        Cari kandidat berdasarkan proyek, teknologi, dan bukti kontribusi yang nyata.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  eyebrow: {
    marginBottom: 9,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  highlightWrap: {
    // The bar overshoots the text by 2dp right (like the prototype's -2px).
    position: 'relative',
    justifyContent: 'flex-start',
  },
  highlightBar: {
    position: 'absolute',
    left: 2,
    right: -2,
    bottom: 1,
    height: 7,
    opacity: 0.3,
  },
  copy: {
    maxWidth: 330,
    marginTop: 13,
  },
});

export default FeedIntro;
