import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CountryPicker } from '@/components/CountryPicker';
import { Icon } from '@/components/ui/Icon';
import { SelectField } from '@/components/ui/SelectField';
import { Switch } from '@/components/ui/Switch';
import { T } from '@/components/ui/T';
import { flagEmoji, findCountry } from '@/data/countries';
import {
  AVAILABILITY_LABELS,
  useAuthStore,
  type Availability,
} from '@/store/useAuthStore';
import { useTheme } from '@/theme/useTheme';
import { MAX_FONT_SCALE, fontFamilyFor, fs } from '@/theme/typography';

const AVAILABILITY_OPTIONS = (Object.keys(AVAILABILITY_LABELS) as Availability[]).map(
  (value) => ({ value, label: AVAILABILITY_LABELS[value] }),
);

/**
 * PRD v2 §6.1 — form profil developer: negara domisili (wajib untuk listing,
 * POL-9), kota, visibilitas `listed` (POL-1), `open_to_messages` (POL-4) dan
 * availability.
 */
export function DeveloperStep() {
  const theme = useTheme();
  const countryCode = useAuthStore((s) => s.countryCode);
  const city = useAuthStore((s) => s.city);
  const listed = useAuthStore((s) => s.listed);
  const openToMessages = useAuthStore((s) => s.openToMessages);
  const availability = useAuthStore((s) => s.availability);
  const setResidence = useAuthStore((s) => s.setResidence);
  const setListed = useAuthStore((s) => s.setListed);
  const setOpenToMessages = useAuthStore((s) => s.setOpenToMessages);
  const setAvailability = useAuthStore((s) => s.setAvailability);

  const [pickerOpen, setPickerOpen] = useState(false);
  const country = findCountry(countryCode);

  return (
    <View style={styles.container}>
      {/* Negara domisili (POL-9) */}
      <View style={styles.block}>
        <T size={8} mono ls={1.2} color="greenText" style={styles.label}>
          NEGARA DOMISILI · WAJIB UNTUK LISTING
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Negara domisili: ${country ? country.name : 'belum dipilih'}`}
          android_ripple={{ color: 'transparent' }}
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [
            styles.field,
            {
              borderColor: country ? theme.colors.accent : theme.colors.line,
              backgroundColor: theme.colors.paper,
            },
            pressed && styles.pressed,
          ]}>
          <T size={14}>{country ? flagEmoji(country.iso2) : '🌐'}</T>
          <T size={11} color={country ? 'ink' : 'muted'} style={styles.fieldLabel}>
            {country ? country.name : 'Pilih negara tempat tinggal Anda'}
          </T>
          <Icon name="arrow" size={15} color={theme.colors.muted} />
        </Pressable>
        <T size={7} color="muted" lh={1.6} style={styles.hint}>
          Domisili yang Anda nyatakan sendiri (bukan kewarganegaraan, POL-8). Tanpa negara,
          profil tidak bisa tampil di Feed maupun Discover.
        </T>
      </View>

      {/* Kota */}
      <View style={styles.block}>
        <T size={8} mono ls={1.2} color="greenText" style={styles.label}>
          KOTA (OPSIONAL)
        </T>
        <TextInput
          value={city ?? ''}
          onChangeText={(value) => setResidence({ countryCode, city: value })}
          placeholder="mis. Bandung"
          placeholderTextColor={theme.colors.muted}
          autoCapitalize="words"
          autoCorrect={false}
          accessibilityLabel="Kota domisili"
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[
            styles.input,
            {
              borderColor: theme.colors.line,
              backgroundColor: theme.colors.paper,
              color: theme.colors.ink,
              fontFamily: fontFamilyFor('400'),
              fontSize: fs(11),
            },
          ]}
        />
      </View>

      {/* Visibilitas (POL-1) */}
      <View
        style={[
          styles.switchCard,
          { borderColor: theme.colors.line, backgroundColor: theme.colors.surface },
        ]}>
        <View style={styles.switchCopy}>
          <T size={11} weight="700" style={styles.switchTitle}>
            Tampil di Feed & Discover
          </T>
          <T size={8} color="muted" lh={1.55}>
            {country
              ? 'Opt-in eksplisit (POL-1) — bisa dicabut kapan saja lewat Settings.'
              : 'Pilih negara domisili dulu untuk mengaktifkan ini (POL-9).'}
          </T>
        </View>
        <Switch
          value={listed}
          disabled={!country}
          onValueChange={setListed}
          accessibilityLabel="Tampil di Feed dan Discover"
        />
      </View>

      {/* Pesan (POL-4) */}
      <View
        style={[
          styles.switchCard,
          { borderColor: theme.colors.line, backgroundColor: theme.colors.surface },
        ]}>
        <View style={styles.switchCopy}>
          <T size={11} weight="700" style={styles.switchTitle}>
            Buka untuk pesan recruiter
          </T>
          <T size={8} color="muted" lh={1.55}>
            Hanya recruiter yang bisa mengirim pesan pertama bila ini aktif (POL-4).
          </T>
        </View>
        <Switch
          value={openToMessages}
          onValueChange={setOpenToMessages}
          accessibilityLabel="Buka untuk pesan recruiter"
        />
      </View>

      {/* Availability */}
      <View style={styles.block}>
        <T size={8} mono ls={1.2} color="greenText" style={styles.label}>
          KETERSEDIAAN
        </T>
        <SelectField
          value={availability}
          options={AVAILABILITY_OPTIONS}
          onChange={(value) => setAvailability(value as Availability)}
          icon="briefcase"
          placeholder="Pilih ketersediaan"
          estimatedWidth={240}
          accessibilityLabel="Pilih ketersediaan"
          style={styles.select}
        />
      </View>

      <CountryPicker
        visible={pickerOpen}
        mode="single"
        value={countryCode ? [countryCode] : []}
        title="NEGARA DOMISILI"
        helper="Sumber: pilihan Anda sendiri — otoritatif (confidence 100)."
        onApply={([iso2]) => setResidence({ countryCode: iso2 ?? null })}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  block: {
    gap: 6,
  },
  label: {
    marginBottom: 1,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  fieldLabel: {
    flex: 1,
  },
  hint: {
    marginTop: 2,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 13,
    borderWidth: 1,
  },
  switchCopy: {
    flex: 1,
    gap: 3,
  },
  switchTitle: {
    marginBottom: 1,
  },
  select: {
    height: 44,
    borderRadius: 10,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default DeveloperStep;
