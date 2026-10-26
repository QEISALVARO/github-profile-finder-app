import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { PageContainer } from '@/components/PageContainer';
import { CountryPicker } from '@/components/CountryPicker';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { SelectField } from '@/components/ui/SelectField';
import { Switch } from '@/components/ui/Switch';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { countryLabel, flagEmoji, findCountry, formatCountrySelection } from '@/data/countries';
import { useAppStore } from '@/store/useAppStore';
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

const THEME_OPTIONS = [
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
  { value: 'system', label: 'Ikuti sistem' },
];

/**
 * PRD v2 §13 + §15.3 — Settings dasar: visibilitas (POL-1), pesan (POL-4),
 * ketersediaan, negara domisili (POL-9), profil & negara tujuan recruiter
 * (§11A), tema, keluar, dan hapus akun.
 */
export default function SettingsScreen() {
  const theme = useTheme();

  const roles = useAuthStore((s) => s.roles);
  const countryCode = useAuthStore((s) => s.countryCode);
  const city = useAuthStore((s) => s.city);
  const listed = useAuthStore((s) => s.listed);
  const openToMessages = useAuthStore((s) => s.openToMessages);
  const availability = useAuthStore((s) => s.availability);
  const company = useAuthStore((s) => s.company);
  const title = useAuthStore((s) => s.title);
  const targetCountries = useAuthStore((s) => s.targetCountries);
  const setResidence = useAuthStore((s) => s.setResidence);
  const setListed = useAuthStore((s) => s.setListed);
  const setOpenToMessages = useAuthStore((s) => s.setOpenToMessages);
  const setAvailability = useAuthStore((s) => s.setAvailability);
  const setRecruiterProfile = useAuthStore((s) => s.setRecruiterProfile);
  const setTargetCountries = useAuthStore((s) => s.setTargetCountries);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);

  const [residenceOpen, setResidenceOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);

  const isDeveloper = roles.includes('developer');
  const isRecruiter = roles.includes('recruiter');
  const country = findCountry(countryCode);

  const handleSignOut = () => {
    Alert.alert('Keluar dari akun?', 'Sesi lokal dihapus; pengaturan tetap tersimpan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        onPress: () => {
          signOut();
          router.replace('/welcome');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hapus akun?',
      'Profil, proyek, pesan, pipeline, dan laporan terhapus permanen (cascade ≤ 30 hari termasuk backup). Tindakan ini tidak bisa dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            deleteAccount();
            router.replace('/welcome');
          },
        },
      ],
    );
  };

  return (
    <PageContainer paddingTop={8} keyboardShouldPersistTaps="handled">
      {/* Back */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kembali ke profil"
        hitSlop={hitSlopFor(160, 24)}
        onPress={() => router.back()}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <View style={styles.backIcon}>
          <Icon name="arrow" size={16} color={theme.colors.muted} />
        </View>
        <T size={8} weight="700" color="muted">
          Profil
        </T>
      </Pressable>

      <View style={styles.hero}>
        <T size={7} mono ls={1} color="greenText">
          ACCOUNT SETTINGS
        </T>
        <T variant="h1Hero" style={styles.heroTitle}>
          Settings
        </T>
        <T size={9} color="muted">
          Kelola visibilitas, pesan, lokasi domisili, dan akun Anda.
        </T>
      </View>

      {/* --- Developer: visibilitas & pesan -------------------------------- */}
      {isDeveloper ? (
        <>
          <T size={8} mono ls={1.4} color="greenText" style={styles.sectionLabel}>
            VISIBILITAS & PESAN
          </T>
          <Card variant="settings" style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.accentSoft }]}>
                <Icon name="users" size={17} color={theme.colors.greenText} />
              </View>
              <View style={styles.rowCopy}>
                <T size={10} weight="700">
                  Tampil di Feed & Discover
                </T>
                <T size={8} color="muted" style={styles.rowSub}>
                  {country
                    ? 'Opt-in eksplisit — bisa dicabut kapan saja (POL-1).'
                    : 'Pilih negara domisili dulu (POL-9).'}
                </T>
              </View>
              <Switch
                value={listed}
                disabled={!country}
                onValueChange={setListed}
                accessibilityLabel="Tampil di Feed dan Discover"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />

            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.accentSoft }]}>
                <Icon name="message" size={17} color={theme.colors.greenText} />
              </View>
              <View style={styles.rowCopy}>
                <T size={10} weight="700">
                  Terima pesan recruiter
                </T>
                <T size={8} color="muted" style={styles.rowSub}>
                  Pesan pertama hanya bila sakelar ini aktif (POL-4).
                </T>
              </View>
              <Switch
                value={openToMessages}
                onValueChange={setOpenToMessages}
                accessibilityLabel="Terima pesan recruiter"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />

            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.accentSoft }]}>
                <Icon name="briefcase" size={17} color={theme.colors.greenText} />
              </View>
              <View style={styles.rowCopy}>
                <T size={10} weight="700">
                  Ketersediaan
                </T>
                <T size={8} color="muted" style={styles.rowSub}>
                  Ditampilkan ke kandidat & recruiter.
                </T>
              </View>
              <SelectField
                value={availability}
                options={AVAILABILITY_OPTIONS}
                onChange={(value) => setAvailability(value as Availability)}
                icon={null}
                estimatedWidth={140}
                accessibilityLabel="Ketersediaan"
              />
            </View>
          </Card>

          {/* --- Lokasi domisili ------------------------------------------- */}
          <T size={8} mono ls={1.4} color="greenText" style={styles.sectionLabel}>
            LOKASI DOMISILI
          </T>
          <Card variant="settings" style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Negara: ${country ? country.name : 'belum dipilih'}`}
              android_ripple={{ color: 'transparent' }}
              onPress={() => setResidenceOpen(true)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <T size={16}>{country ? flagEmoji(country.iso2) : '🌐'}</T>
              <View style={styles.rowCopy}>
                <T size={10} weight="700">
                  {country ? country.name : 'Belum memilih negara'}
                </T>
                <T size={8} color="muted" style={styles.rowSub}>
                  {country
                    ? `Sumber: dinyatakan sendiri · ${countryLabel(country.iso2)}`
                    : 'Wajib sebelum bisa tampil di Feed/Discover (POL-9).'}
                </T>
              </View>
              <Icon name="arrow" size={17} color={theme.colors.muted} />
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />

            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.accentSoft }]}>
                <Icon name="location" size={17} color={theme.colors.greenText} />
              </View>
              <TextInput
                value={city ?? ''}
                onChangeText={(value) => setResidence({ countryCode, city: value })}
                placeholder="Kota (opsional)"
                placeholderTextColor={theme.colors.muted}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Kota domisili"
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={[
                  styles.textInput,
                  styles.rowInput,
                  {
                    color: theme.colors.ink,
                    fontFamily: fontFamilyFor('400'),
                    fontSize: fs(11),
                  },
                ]}
              />
            </View>
          </Card>
        </>
      ) : null}

      {/* --- Recruiter ------------------------------------------------------ */}
      {isRecruiter ? (
        <>
          <T size={8} mono ls={1.4} color="greenText" style={styles.sectionLabel}>
            PROFIL RECRUITER
          </T>
          <Card variant="settings" style={styles.card}>
            <View style={styles.fieldBlock}>
              <T size={7} mono color="muted" ls={1}>
                PERUSAHAAN
              </T>
              <TextInput
                value={company}
                onChangeText={(value) => setRecruiterProfile({ company: value })}
                placeholder="Nama perusahaan"
                placeholderTextColor={theme.colors.muted}
                autoCapitalize="words"
                accessibilityLabel="Nama perusahaan"
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={[
                  styles.textInput,
                  styles.blockInput,
                  {
                    color: theme.colors.ink,
                    borderColor: theme.colors.line,
                    backgroundColor: theme.colors.paper,
                    fontFamily: fontFamilyFor('400'),
                    fontSize: fs(11),
                  },
                ]}
              />
            </View>

            <View style={styles.fieldBlock}>
              <T size={7} mono color="muted" ls={1}>
                JABATAN
              </T>
              <TextInput
                value={title}
                onChangeText={(value) => setRecruiterProfile({ title: value })}
                placeholder="Jabatan"
                placeholderTextColor={theme.colors.muted}
                autoCapitalize="words"
                accessibilityLabel="Jabatan"
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={[
                  styles.textInput,
                  styles.blockInput,
                  {
                    color: theme.colors.ink,
                    borderColor: theme.colors.line,
                    backgroundColor: theme.colors.paper,
                    fontFamily: fontFamilyFor('400'),
                    fontSize: fs(11),
                  },
                ]}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ubah negara tujuan"
              android_ripple={{ color: 'transparent' }}
              onPress={() => setTargetOpen(true)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.flagStack}>
                {(targetCountries.length > 0 ? targetCountries.slice(0, 3) : []).map((iso2) => (
                  <T key={iso2} size={13}>
                    {flagEmoji(iso2)}
                  </T>
                ))}
                {targetCountries.length === 0 ? (
                  <Icon name="location" size={16} color={theme.colors.muted} />
                ) : null}
              </View>
              <View style={styles.rowCopy}>
                <T size={10} weight="700">
                  {formatCountrySelection(targetCountries, 2)}
                </T>
                <T size={8} color="muted" style={styles.rowSub}>
                  Negara tujuan mengisi awal filter Feed & Discover (§11A).
                </T>
              </View>
              <Icon name="arrow" size={17} color={theme.colors.muted} />
            </Pressable>
          </Card>
        </>
      ) : null}

      {/* --- Tampilan ------------------------------------------------------- */}
      <T size={8} mono ls={1.4} color="greenText" style={styles.sectionLabel}>
        TAMPILAN
      </T>
      <Card variant="settings" style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: theme.colors.accentSoft }]}>
            <Icon name="moon" size={17} color={theme.colors.greenText} />
          </View>
          <View style={styles.rowCopy}>
            <T size={10} weight="700">
              Tema
            </T>
            <T size={8} color="muted" style={styles.rowSub}>
              Terang, gelap, atau ikuti pengaturan sistem.
            </T>
          </View>
          <SelectField
            value={themeMode}
            options={THEME_OPTIONS}
            onChange={(value) => setThemeMode(value as 'light' | 'dark' | 'system')}
            icon={null}
            estimatedWidth={130}
            accessibilityLabel="Pilih tema"
          />
        </View>
      </Card>

      {/* --- Akun ----------------------------------------------------------- */}
      <T size={8} mono ls={1.4} color="greenText" style={styles.sectionLabel}>
        AKUN
      </T>
      <Card variant="settings" style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Keluar dari akun"
          android_ripple={{ color: 'transparent' }}
          onPress={handleSignOut}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={[styles.rowIcon, { backgroundColor: theme.colors.accentSoft }]}>
            <Icon name="history" size={17} color={theme.colors.greenText} />
          </View>
          <View style={styles.rowCopy}>
            <T size={10} weight="700">
              Keluar dari akun
            </T>
            <T size={8} color="muted" style={styles.rowSub}>
              Sesi lokal dihapus; pengaturan tetap tersimpan.
            </T>
          </View>
          <Icon name="arrow" size={17} color={theme.colors.muted} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hapus akun"
          android_ripple={{ color: 'transparent' }}
          onPress={handleDeleteAccount}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={[styles.rowIcon, { backgroundColor: theme.colors.surface }]}>
            <Icon name="close" size={17} color={theme.colors.error} />
          </View>
          <View style={styles.rowCopy}>
            <T size={10} weight="700" color="error">
              Hapus akun
            </T>
            <T size={8} color="muted" style={styles.rowSub}>
              Hapus profil, proyek, pesan, dan laporan secara permanen (§13).
            </T>
          </View>
        </Pressable>
      </Card>

      <T size={7} mono color="muted" ls={1} style={styles.legal}>
        PRIVACY POLICY & TERMS MENYUSUL SEBELUM RILIS
      </T>

      <CountryPicker
        visible={residenceOpen}
        mode="single"
        value={countryCode ? [countryCode] : []}
        title="NEGARA DOMISILI"
        helper="Domisili yang Anda nyatakan sendiri — bukan kewarganegaraan (POL-8)."
        onApply={([iso2]) => setResidence({ countryCode: iso2 ?? null })}
        onClose={() => setResidenceOpen(false)}
      />

      <CountryPicker
        visible={targetOpen}
        mode="multi"
        value={targetCountries}
        title="NEGARA TUJUAN"
        helper="Kosongkan (All countries) untuk menargetkan semua negara."
        onApply={setTargetCountries}
        onClose={() => setTargetOpen(false)}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  back: {
    marginTop: -5,
    marginBottom: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  backIcon: {
    transform: [{ rotate: '180deg' }],
  },
  hero: {
    marginBottom: 18,
  },
  heroTitle: {
    marginTop: 4,
    marginBottom: 4,
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 9,
    marginHorizontal: 1,
  },
  card: {
    marginBottom: 4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
  },
  rowSub: {
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  fieldBlock: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 6,
  },
  blockInput: {
    minHeight: 42,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  textInput: {
    padding: 0,
    minHeight: 24,
  },
  rowInput: {
    flex: 1,
  },
  flagStack: {
    flexDirection: 'row',
    gap: 2,
    minWidth: 34,
    alignItems: 'center',
  },
  legal: {
    marginTop: 24,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
