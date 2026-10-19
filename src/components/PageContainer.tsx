import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

/**
 * FR-G5 — standard page scroll container (design.md §1.4):
 * paddingX 20, paddingBottom 116 + insets.bottom, no scroll indicators,
 * content capped at maxWidth 430 and centered.
 */
export function PageContainer({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.paper }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: 116 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        overScrollMode="never"
      >
        <View style={[styles.inner, { maxWidth: theme.maxWidth }]}>{children}</View>
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
