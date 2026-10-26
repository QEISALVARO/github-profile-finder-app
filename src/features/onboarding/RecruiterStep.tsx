import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CountryPicker } from '@/components/CountryPicker';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { flagEmoji, formatCountrySelection } from '@/data/countries';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/theme/useTheme';
import { MAX_FONT_SCALE, fontFamilyFor, fs } from '@/theme/typography';

/**
 * PRD v2 §6.1 — form profil recruiter: perusahaan (wajib), jabatan, dan
 * negara tujuan `target_countries` (§11A; kosong = semua negara) yang nanti
 * mengisi awal filter Feed & Discover.
 */
export function RecruiterStep() {
  const theme = useTheme();
  const company = useAuthStore((s) => s.company);
  const title = useAuthStore((s) => s.title);
  const targetCountries = useAuthStore((s) => s.targetCountries);
  const setRecruiterProfile = useAuthStore((s) => s.setRecruiterProfile);
  const setTargetCountries = useAuthStore((s) => s.setTargetCountries);

  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <T size={8} mono ls={1.2} color="greenText" style={styles.label}>
          PERUSAHAAN · WAJIB
        </T>
        <TextInput
          value={company}
          onChangeText={(value) => setRecruiterProfile({ company: value })}
          placeholder="mis. PT Talenta Global"
          placeholderTextColor={theme.colors.muted}
          autoCapitalize="words"
          accessibilityLabel="Nama perusahaan"
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
        <T size={7} color="muted" lh={1.6} style={styles.hint}>
          Ditampilkan pada pesan pertama ke kandidat agar konteks jelas (POL-4).
        </T>
      </View>

      <View style={styles.block}>
        <T size={8} mono ls={1.2} color="greenText" style={styles.label}>
          JABATAN
        </T>
        <TextInput
          value={title}
          onChangeText={(value) => setRecruiterProfile({ title: value })}
          placeholder="mis. Engineering Recruiter"
          placeholderTextColor={theme.colors.muted}
          autoCapitalize="words"
          accessibilityLabel="Jabatan"
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

      <View style={styles.block}>
        <T size={8} mono ls={1.2} color="greenText" style={styles.label}>
          NEGARA TUJUAN
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Negara tujuan: ${
            targetCountries.length > 0 ? targetCountries.join(', ') : 'semua negara'
          }`}
          android_ripple={{ color: 'transparent' }}
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [
            styles.field,
            {
              borderColor: targetCountries.length > 0 ? theme.colors.accent : theme.colors.line,
              backgroundColor: theme.colors.paper,
            },
            pressed && styles.pressed,
          ]}>
          <View style={styles.flagRow}>
            {(targetCountries.length > 0 ? targetCountries.slice(0, 4) : []).map((iso2) => (
              <T key={iso2} size={13}>
                {flagEmoji(iso2)}
              </T>
            ))}
            {targetCountries.length === 0 ? (
              <Icon name="location" size={16} color={theme.colors.muted} />
            ) : null}
          </View>
          <T
            size={11}
            color={targetCountries.length > 0 ? 'ink' : 'muted'}
            numberOfLines={1}
            style={styles.fieldLabel}>
            {formatCountrySelection(targetCountries, 2)}
          </T>
          <Icon name="arrow" size={15} color={theme.colors.muted} />
        </Pressable>
        <T size={7} color="muted" lh={1.6} style={styles.hint}>
          Kosong = semua negara. Tersimpan di akun dan mengisi awal filter Feed/Discover —
          dapat diubah per sesi tanpa menimpa default (§11A).
        </T>
      </View>

      <CountryPicker
        visible={pickerOpen}
        mode="multi"
        value={targetCountries}
        title="NEGARA TUJUAN"
        helper="Pilih negara tempat kandidat yang ingin Anda rekrut. Kosongkan untuk semua negara."
        onApply={setTargetCountries}
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
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
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
  flagRow: {
    flexDirection: 'row',
    gap: 2,
  },
  fieldLabel: {
    flex: 1,
  },
  hint: {
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default RecruiterStep;
