import { useRef } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

/**
 * FR-G5 — standard page scroll container:
 * paddingX 20, paddingBottom 116 + insets.bottom, no scroll indicators,
 * content capped at maxWidth 430 and centered.
 */
export function PageContainer({ children }: { children: ReactNode }) {
  const { colors, maxWidth } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<ScrollView>(null);

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <ScrollView
        ref={ref}
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 116 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        overScrollMode="never"
      >
        <View style={[styles.inner, { maxWidth }]}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
  },
});

export default PageContainer;
