import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

/**
 * FR-G5 — standard page scroll container (design.md §1.4):
 * paddingX 20, paddingBottom 116 + insets.bottom, no scroll indicators,
 * content capped at maxWidth 430 and centered.
 */
export function PageContainer({
  children,
  /** design.md §1.4 — Explore uses 30, other pages sit directly under TopBar. */
  paddingTop = 0,
  keyboardShouldPersistTaps = 'never',
}: {
  children: ReactNode;
  paddingTop?: number;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.paper }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop, paddingBottom: 116 + insets.bottom },
        ]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
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
