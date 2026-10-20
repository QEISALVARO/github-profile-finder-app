import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput } from 'react-native';

import { HardShadowBox } from '@/components/ui/HardShadowBox';
import { Icon } from '@/components/ui/Icon';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/useTheme';
import { MAX_FONT_SCALE, fontFamilyFor, fs } from '@/theme/typography';

const BUTTON_SIZE = 42;

/**
 * FR-E2 — live search box with a hard shadow (design.md §3.3, §1.6).
 * No debounce: the feed is 4 items and filtering is synchronous (PRD §5.1).
 */
export function SearchBox() {
  const theme = useTheme();
  const query = useAppStore((s) => s.query);
  const setQuery = useAppStore((s) => s.setQuery);
  const [focused, setFocused] = useState(false);

  const hasQuery = query.length > 0;

  return (
    <HardShadowBox
      focused={focused}
      contentStyle={styles.content}>
      <Icon name="search" size={21} color={theme.colors.ink} />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Flutter, Python ML, Golang..."
        placeholderTextColor={theme.colors.muted}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Cari proyek atau teknologi"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={() => Keyboard.dismiss()}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={[
          styles.input,
          {
            color: theme.colors.ink,
            fontFamily: fontFamilyFor('400'),
            fontSize: fs(13),
          },
        ]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasQuery ? 'Hapus pencarian' : 'Cari proyek'}
        android_ripple={{ color: 'transparent' }}
        hitSlop={hitSlopFor(BUTTON_SIZE, BUTTON_SIZE)}
        onPress={hasQuery ? () => setQuery('') : () => Keyboard.dismiss()}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.colors.accent },
          pressed && styles.pressed,
        ]}>
        <Icon
          name={hasQuery ? 'close' : 'filter'}
          size={hasQuery ? 18 : 19}
          color={theme.colors.onAccent}
        />
      </Pressable>
    </HardShadowBox>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 7,
    paddingRight: 7,
    paddingLeft: 15,
  },
  input: {
    flex: 1,
    padding: 0,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});

export default SearchBox;
