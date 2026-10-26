import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { flagEmoji, searchCountries } from '@/data/countries';
import { useTheme } from '@/theme/useTheme';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { MAX_FONT_SCALE, fontFamilyFor, fs } from '@/theme/typography';

const DURATION = 180;

export type CountryPickerProps = {
  visible: boolean;
  /** 'single' = memilih satu negara (tutup otomatis); 'multi' = Apply/Clear. */
  mode?: 'single' | 'multi';
  /** Selalu array; single = 0..1 elemen (PRD v2 §11A `countries[]`). */
  value: string[];
  onApply: (iso2: string[]) => void;
  onClose: () => void;
  title?: string;
  /** Teks bantu privasi (§11A): "Filter berdasarkan lokasi domisili…". */
  helper?: string;
};

/**
 * PRD v2 §11A — CountryPicker (bottom sheet multi-pilih + pencarian + chip
 * terpilih + Apply/Clear + "All countries"). Menggantikan select lokasi 5 opsi
 * v1. Tanpa facet count di fase ini — angka per negara datang dari RPC
 * `country_facets()` setelah backend R0 tersedia.
 */
export function CountryPicker({
  visible,
  mode = 'multi',
  value,
  onApply,
  onClose,
  title = 'COUNTRY',
  helper = 'Filter berdasarkan lokasi domisili yang dinyatakan developer.',
}: CountryPickerProps) {
  // Sheet hanya di-mount saat terbuka — state reset terjadi di initializer
  // komponen anak (tanpa setState di dalam effect).
  if (!visible) return null;

  return (
    <CountrySheet
      mode={mode}
      value={value}
      onApply={onApply}
      onClose={onClose}
      title={title}
      helper={helper}
    />
  );
}

function CountrySheet({
  mode,
  value,
  onApply,
  onClose,
  title,
  helper,
}: Omit<CountryPickerProps, 'visible'>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(value);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const results = useMemo(() => searchCountries(query), [query]);

  const close = () => {
    Animated.timing(progress, {
      toValue: 0,
      duration: DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      progress.setValue(0);
      onClose();
    });
  };

  const apply = (next: string[]) => {
    Animated.timing(progress, {
      toValue: 0,
      duration: DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      progress.setValue(0);
      onApply(next);
      onClose();
    });
  };

  const toggle = (iso2: string) => {
    if (mode === 'single') {
      apply([iso2]);
      return;
    }
    setSelected((prev) =>
      prev.includes(iso2) ? prev.filter((c) => c !== iso2) : [...prev, iso2],
    );
  };

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <Modal transparent animationType="none" visible onRequestClose={close}>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.backdrop, { backgroundColor: theme.colors.backdrop, opacity: progress }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup pilihan negara"
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.line,
              marginBottom: Math.max(12, insets.bottom),
              opacity: progress,
              transform: [{ translateY }],
            },
          ]}>
          {/* Header */}
          <View style={styles.header}>
            <T size={8} mono ls={1.4} color="greenText">
              {title}
            </T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              hitSlop={hitSlopFor(31, 31)}
              onPress={close}
              style={({ pressed }) => [
                styles.closeButton,
                { borderColor: theme.colors.line, backgroundColor: theme.colors.paper },
                pressed && styles.pressed,
              ]}>
              <Icon name="close" size={15} color={theme.colors.muted} />
            </Pressable>
          </View>

          {/* Search */}
          <View
            style={[
              styles.search,
              { borderColor: theme.colors.line, backgroundColor: theme.colors.paper },
            ]}>
            <Icon name="search" size={15} color={theme.colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cari negara…"
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Cari negara"
              onSubmitEditing={() => Keyboard.dismiss()}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={[
                styles.searchInput,
                {
                  color: theme.colors.ink,
                  fontFamily: fontFamilyFor('400'),
                  fontSize: fs(11),
                },
              ]}
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Hapus pencarian"
                hitSlop={hitSlopFor(44, 44)}
                onPress={() => setQuery('')}>
                <Icon name="close" size={14} color={theme.colors.muted} />
              </Pressable>
            ) : null}
          </View>

          {/* Chip terpilih (multi) */}
          {mode === 'multi' && selected.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}>
              {selected.map((iso2) => (
                <Pressable
                  key={iso2}
                  accessibilityRole="button"
                  accessibilityLabel={`Hapus ${iso2}`}
                  onPress={() => setSelected((prev) => prev.filter((c) => c !== iso2))}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: theme.colors.accentSoft },
                    pressed && styles.pressed,
                  ]}>
                  <T size={8} color="greenStrong">
                    {flagEmoji(iso2)}
                  </T>
                  <T size={8} mono color="greenStrong">
                    {iso2}
                  </T>
                  <Icon name="close" size={11} color={theme.colors.greenStrong} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {/* Daftar negara */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {results.length === 0 ? (
              <View style={styles.empty}>
                <T size={10} color="muted">
                  Tidak ada negara yang cocok dengan “{query}”.
                </T>
              </View>
            ) : (
              results.map((country) => {
                const isSelected = selected.includes(country.iso2);
                return (
                  <Pressable
                    key={country.iso2}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    android_ripple={{ color: 'transparent' }}
                    onPress={() => toggle(country.iso2)}
                    style={({ pressed }) => [
                      styles.row,
                      isSelected && { backgroundColor: theme.colors.accentSoft },
                      pressed && styles.pressed,
                    ]}>
                    <T size={14}>{flagEmoji(country.iso2)}</T>
                    <View style={styles.rowLabel}>
                      <T size={11} numberOfLines={1}>
                        {country.name}
                      </T>
                      <T size={7} mono color="muted">
                        {country.iso2} · {country.region}
                      </T>
                    </View>
                    {isSelected ? (
                      <Icon name="check" size={15} color={theme.colors.greenStrong} />
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Helper (privasi) */}
          <T size={7} color="muted" lh={1.5} style={styles.helper}>
            {helper}
          </T>

          {/* Footer aksi */}
          <View style={[styles.footer, { borderTopColor: theme.colors.line }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Semua negara"
              android_ripple={{ color: 'transparent' }}
              onPress={() => apply([])}
              style={({ pressed }) => [
                styles.footerButton,
                {
                  borderColor: theme.colors.line,
                  backgroundColor: theme.colors.paper,
                },
                pressed && styles.pressed,
              ]}>
              <T size={9} weight="700" color="muted">
                All countries
              </T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hapus semua pilihan"
              android_ripple={{ color: 'transparent' }}
              onPress={() => setSelected([])}
              style={({ pressed }) => [
                styles.footerButton,
                {
                  borderColor: theme.colors.line,
                  backgroundColor: theme.colors.surface,
                },
                pressed && styles.pressed,
              ]}>
              <T size={9} weight="700" color="muted">
                Clear
              </T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Terapkan ${selected.length} negara`}
              android_ripple={{ color: 'transparent' }}
              onPress={() => apply(selected)}
              style={({ pressed }) => [
                styles.footerButton,
                styles.footerPrimary,
                { backgroundColor: theme.colors.accent },
                pressed && styles.pressed,
              ]}>
              <T size={9} weight="800" color="onAccent">
                Apply{selected.length > 0 ? ` (${selected.length})` : ''}
              </T>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 430,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    maxHeight: '78%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  closeButton: {
    width: 31,
    height: 31,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    padding: 0,
  },
  chipRow: {
    gap: 6,
    paddingTop: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 7,
  },
  list: {
    marginTop: 10,
    flexGrow: 0,
  },
  listContent: {
    gap: 2,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  rowLabel: {
    flex: 1,
    gap: 1,
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  helper: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPrimary: {
    borderColor: 'transparent',
    flexGrow: 1.4,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default CountryPicker;
