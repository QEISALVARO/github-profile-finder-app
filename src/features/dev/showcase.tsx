import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AnalysisFixtures } from '@/features/dev/AnalysisFixtures';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CARD_PRESETS, type CardVariantName } from '@/components/ui/Card';
import { Chip, type ChipVariant } from '@/components/ui/Chip';
import { HardShadowBox } from '@/components/ui/HardShadowBox';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Loader } from '@/components/ui/Loader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScoreCircle, ScoreRing } from '@/components/ui/ScoreRing';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { SelectField } from '@/components/ui/SelectField';
import { Switch } from '@/components/ui/Switch';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import { ThemeScope } from '@/theme/ThemeScope';
import type { ColorToken, ThemeMode } from '@/theme/tokens';
import { fontFamilies, FONT_MODE, fs, type TextVariantName } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';

const TYPE_SAMPLES: TextVariantName[] = [
  'h1Hero',
  'h3Section',
  'titleCard',
  'body',
  'eyebrow',
  'eyebrowSm',
  'mono7',
];

const FS_SAMPLES = [4, 5, 6, 7, 8, 9, 10];

const SWATCHES: ColorToken[] = [
  'ink',
  'muted',
  'paper',
  'surface',
  'line',
  'accent',
  'accentSoft',
  'onAccent',
  'greenText',
  'greenStrong',
  'error',
  'warnBg',
  'heat2',
  'tabsTrack',
  'scoreCircleBorder',
  'coverDot',
  'ringTrack',
  'backdrop',
];

const ICONS: IconName[] = [
  'search',
  'moon',
  'location',
  'star',
  'repo',
  'home',
  'users',
  'history',
  'arrow',
  'github',
  'message',
  'briefcase',
  'download',
  'filter',
  'check',
  'send',
  'bookmark',
  'chart',
  'plus',
  'close',
];

const CHIP_VARIANTS: { variant: ChipVariant; label: string }[] = [
  { variant: 'default', label: 'Front-End' },
  { variant: 'active', label: 'Mobile' },
  { variant: 'soft', label: 'Verified' },
  { variant: 'dashed', label: '+3 tools' },
  { variant: 'role-tag', label: 'Back-End' },
];

const CARD_VARIANTS: CardVariantName[] = [
  'base',
  'project',
  'profile',
  'filter',
  'candidate',
  'repo',
  'skill',
  'score',
  'heatmap',
  'network',
  'settings',
];

const LOCATIONS = [
  { value: 'all', label: 'All locations' },
  { value: 'indonesia', label: 'Indonesia' },
  { value: 'jakarta', label: 'Jakarta' },
];

const STATUSES = [
  { value: 'open', label: 'Open for hiring' },
  { value: 'freelance', label: 'Open for freelance' },
  { value: 'none', label: 'Not available' },
];

/**
 * Gate M1 — every design-system component rendered in both palettes so the
 * design.md §11 checklist can be verified on one screen.
 */
export function DevShowcase() {
  const theme = useTheme();
  const themeMode = useAppStore((s) => s.themeMode);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.colors.paper }]}
      contentContainerStyle={styles.screenContent}>
      <View style={styles.header}>
        <T size={10} mono ls={1.8} color="greenText">
          INTERNAL · MILESTONE M1
        </T>
        <T variant="h1Hero" style={styles.title}>
          Design system
        </T>
        <T variant="bodyPage">
          Semua komponen dasar Gitscope. Setiap blok dirender dua kali — light dan dark — untuk
          checklist visual design.md §11.
        </T>

        <View style={styles.themeToggle}>
          <T size={10} weight="700">
            Theme aplikasi: {themeMode}
          </T>
          <Switch
            value={themeMode !== 'light'}
            onValueChange={toggleTheme}
            accessibilityLabel="Ubah tema"
          />
        </View>
      </View>

      <AnalysisFixtures />

      <ThemeScope mode="light">
        <Showcase mode="light" />
      </ThemeScope>

      <ThemeScope mode="dark">
        <Showcase mode="dark" />
      </ThemeScope>
    </ScrollView>
  );
}

function Showcase({ mode }: { mode: ThemeMode }) {
  const theme = useTheme();
  const [darkSwitch, setDarkSwitch] = useState(mode === 'dark');
  const [tab, setTab] = useState('discover');
  const [location, setLocation] = useState('all');
  const [status, setStatus] = useState('open');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.showcase, { backgroundColor: theme.colors.paper }]}>
      <View style={styles.modeHeader}>
        <T size={8} mono ls={1.8} color="greenText">
          {mode === 'light' ? 'LIGHT MODE' : 'DARK MODE'}
        </T>
        <View style={[styles.modeLine, { backgroundColor: theme.colors.line }]} />
      </View>

      <Section label="TYPOGRAPHY · MANROPE + DM MONO">
        {TYPE_SAMPLES.map((name) => (
          <View key={name} style={styles.typeRow}>
            <T size={6} mono color="muted" style={styles.typeName}>
              {name}
            </T>
            <T variant={name}>Aa — Candidate evidence 0123</T>
          </View>
        ))}
        <View style={styles.wrapRow}>
          {FS_SAMPLES.map((px) => (
            <View
              key={px}
              style={[
                styles.fsCell,
                { borderColor: theme.colors.line, backgroundColor: theme.colors.surface },
              ]}>
              <T size={6} mono color="muted">
                {px}→{fs(px)}
              </T>
            </View>
          ))}
        </View>
        <T size={7} mono color="muted">
          FONT_MODE = {FONT_MODE} · maxFontSizeMultiplier 1.2
        </T>
      </Section>

      <Section label="CHIP — DEFAULT · ACCENT · SOFT · DASHED · ROLE-TAG">
        <View style={styles.wrapRow}>
          {CHIP_VARIANTS.map((item) => (
            <Chip key={item.variant} variant={item.variant}>
              {item.label}
            </Chip>
          ))}
          <Chip variant="default" onPress={() => setQuery('')} accessibilityLabel="Contoh chip">
            Pressable
          </Chip>
        </View>
      </Section>

      <Section label="BADGE — VERIFIED · ACTIVE · MONO">
        <View style={styles.wrapRow}>
          <Badge variant="verified" label="VERIFIED" />
          <Badge variant="active" label="ACTIVE" />
          <Badge variant="mono" label="DM MONO" />
        </View>
      </Section>

      <Section label="SECTION HEADING — MONO NOTE · VERIFIED · VIEW ALL">
        <Card variant="base" padding={13}>
          <SectionHeading eyebrow="ROLE INTELLIGENCE" title="Skill fingerprint" note="94% CONFIDENCE" style={styles.headingReset} />
          <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />
          <SectionHeading
            eyebrow="PROJECT VALIDATION"
            title="Authenticity analysis"
            rightVariant="verified-label"
            style={styles.headingReset}
          />
          <View style={[styles.divider, { backgroundColor: theme.colors.line }]} />
          <SectionHeading
            eyebrow="VERIFIED PROJECTS"
            title="Evidence, not claims"
            rightVariant="view-all"
            onPressViewAll={() => undefined}
            style={styles.headingReset}
          />
        </Card>
      </Section>

      <Section label="PROGRESS BAR + LOADER + SWITCH">
        <View style={styles.progressRow}>
          <T size={8} mono color="muted">
            TypeScript
          </T>
          <T size={7} mono color="ink">
            72%
          </T>
        </View>
        <ProgressBar value={72} accessibilityLabel="TypeScript 72 persen" />
        <View style={styles.progressRow}>
          <T size={8} mono color="muted">
            Go
          </T>
          <T size={7} mono color="ink">
            28%
          </T>
        </View>
        <ProgressBar value={28} accessibilityLabel="Go 28 persen" />

        <View style={styles.loaderRow}>
          <Loader />
          <Loader size={13} color="onAccent" />
          <View style={[styles.accentBox, { backgroundColor: theme.colors.accent }]}>
            <Loader size={13} color="onAccent" />
          </View>
          <View style={styles.switchRow}>
            <T size={9} weight="700">
              Dark mode aktif
            </T>
            <Switch value={darkSwitch} onValueChange={setDarkSwitch} accessibilityLabel="Dark mode" />
          </View>
        </View>
      </Section>

      <Section label="HARD SHADOW BOX — FOCUS → ACCENT (R4)">
        <HardShadowBox focused={focused} contentStyle={styles.searchContent}>
          <Icon name="search" size={21} color={theme.colors.ink} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Flutter, Python ML, Golang..."
            placeholderTextColor={theme.colors.muted}
            selectionColor={theme.colors.accent}
            accessibilityLabel="Cari proyek atau teknologi"
            style={[
              styles.searchInput,
              { color: theme.colors.ink, fontFamily: fontFamilies.regular },
            ]}
          />
          <View
            style={[
              styles.searchButton,
              { backgroundColor: query ? theme.colors.ink : theme.colors.accent },
            ]}>
            <Icon
              name={query ? 'close' : 'filter'}
              size={18}
              color={query ? theme.colors.surface : theme.colors.onAccent}
            />
          </View>
        </HardShadowBox>
      </Section>

      <Section label="SCORE RING — 73 / 90 / 96">
        <Card variant="score" style={styles.scoreRow}>
          {[73, 90, 96].map((value) => (
            <ScoreRing key={value} value={value} />
          ))}
        </Card>
        <View style={styles.wrapRow}>
          <ScoreCircle value={73} size={35} />
          <ScoreCircle value={90} size={43} />
          <ScoreCircle value={96} size={30} />
          <ScoreCircle value={27} size={27} />
        </View>
      </Section>

      <Section label="AVATAR — ONLINE DOT · INITIALS FALLBACK · EXPO IMAGE">
        <View style={styles.wrapRow}>
          <Avatar
            uri="https://github.com/octocat.png?size=128"
            name="The Octocat"
            login="octocat"
            size={36}
            radius={10}
            dot
          />
          <Avatar
            uri="https://github.com/yyx990803.png?size=128"
            name="Evan You"
            login="yyx990803"
            size={61}
            radius={17}
            dot
          />
          <Avatar uri="https://invalid.example.test/none.png" name="Cassidy Williams" size={46} radius={12} />
          <Avatar name="Angga Risky" size={43} radius={12} />
        </View>
      </Section>

      <Section label="SELECT FIELD + SELECT SHEET · SEGMENTED TABS">
        <View style={styles.selectRow}>
          <SelectField
            value={location}
            options={LOCATIONS}
            onChange={setLocation}
            accessibilityLabel="Pilih lokasi"
            estimatedWidth={150}
          />
          <SelectField
            value={status}
            options={STATUSES}
            onChange={setStatus}
            icon="briefcase"
            accessibilityLabel="Status ketersediaan"
            estimatedWidth={160}
          />
        </View>
        <View style={styles.tabsReset}>
          <SegmentedTabs
            items={[
              { key: 'discover', label: 'Discover' },
              { key: 'pipeline', label: 'Pipeline' },
              { key: 'compare', label: 'Compare (2)' },
            ]}
            value={tab}
            onChange={setTab}
            accessibilityLabel="Navigasi talent"
          />
        </View>
      </Section>

      <Section label="CARD — RADIUS & SHADOW PER design.md §1.6 / §6">
        <View style={styles.cardGrid}>
          {CARD_VARIANTS.map((variant) => {
            const preset = CARD_PRESETS[variant];
            return (
              <Card key={variant} variant={variant} style={styles.cardSample}>
                <T
                  size={8}
                  weight="700"
                  color={variant === 'network' ? 'surface' : variant === 'score' ? 'onAccent' : 'ink'}>
                  {variant}
                </T>
                <T
                  size={6}
                  mono
                  color={variant === 'network' ? 'networkCardMuted' : variant === 'score' ? 'onAccent' : 'muted'}>
                  r{preset.radius} · p{preset.padding}
                </T>
              </Card>
            );
          })}
        </View>
      </Section>

      <Section label="ICONS — REACT-NATIVE-SVG">
        <View style={styles.iconGrid}>
          {ICONS.map((name) => (
            <View key={name} style={styles.iconCell}>
              <Icon name={name} size={20} color={theme.colors.ink} />
              <T size={6} mono color="muted">
                {name}
              </T>
            </View>
          ))}
        </View>
      </Section>

      <Section label="COLOR TOKENS">
        <View style={styles.swatchGrid}>
          {SWATCHES.map((name) => (
            <View key={name} style={styles.swatchRow}>
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: name === 'backdrop' ? theme.colors.backdrop : theme.colors[name],
                    borderColor: theme.colors.line,
                  },
                ]}
              />
              <T size={6} mono color="muted" style={styles.swatchName}>
                {name}
              </T>
              <T size={6} mono color="ink" numberOfLines={1} style={styles.swatchValue}>
                {theme.colors[name]}
              </T>
            </View>
          ))}
        </View>
      </Section>
    </View>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <T size={7} mono ls={1.8} color="greenText" style={styles.sectionLabel}>
        {label}
      </T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
    maxWidth: 430,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: 6,
  },
  title: {
    marginTop: 4,
  },
  themeToggle: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  showcase: {
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 6,
  },
  modeLine: {
    flex: 1,
    height: 1,
  },
  section: {
    marginTop: 22,
    gap: 8,
  },
  sectionLabel: {
    letterSpacing: 1.8,
  },
  typeRow: {
    gap: 2,
  },
  typeName: {
    opacity: 0.8,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  fsCell: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  headingReset: {
    marginTop: 4,
    marginBottom: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  loaderRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  accentBox: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 7,
    paddingRight: 7,
    paddingLeft: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 8,
  },
  searchButton: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tabsReset: {
    marginTop: 6,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardSample: {
    minWidth: 96,
    gap: 2,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconCell: {
    width: 56,
    alignItems: 'center',
    gap: 4,
  },
  swatchGrid: {
    gap: 4,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
  },
  swatchName: {
    width: 120,
  },
  swatchValue: {
    flex: 1,
  },
});
