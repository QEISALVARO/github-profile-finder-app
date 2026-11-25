// ---------------------------------------------------------------------------
// FE-10a — Quick filters card (design.md §3.4): "Active 30d" toggle, role
// chips, dan chip negara multi-pilih yang membuka CountryPicker.
// 
// `countries` dan `city` adalah sumber kebenaran (PRD v2 §11A). Field `location`
// v1 tetap ada di store untuk kompatibilitas tapi tidak dipakai oleh UI feed.
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { CountryPicker } from '@/components/CountryPicker';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/useTheme';

import { useFeedCountryFacets } from '@/api/queries';
import { useFeedFilters } from './useFeedFilters';
import { flagEmoji, formatCountrySelection } from '@/data/countries';

const ROLES = ['All', 'Front-End', 'Back-End', 'Mobile', 'Data'] as const;

/**
 * FR-E4 — Quick filters card (design.md §3.4): "Active 30d" toggle, role
 * chips, dan chip negara multi-pilih yang membuka CountryPicker.
 */
export function FeedFilters() {
  const theme = useTheme();
  const feedRole = useAppStore((s) => s.feedRole);
  const setFeedRole = useAppStore((s) => s.setFeedRole);
  const recentOnly = useAppStore((s) => s.recentOnly);
  const toggleRecentOnly = useAppStore((s) => s.toggleRecentOnly);
  const setCountries = useAppStore((s) => s.setCountries);
  const setCity = useAppStore((s) => s.setCity);

  const filters = useFeedFilters();
  // Facets follow the effective query/role/recentOnly but intentionally omit the
  // effective countries (same rule as the backend `country_facets` RPC).
  const facets = useFeedCountryFacets({
    ...filters,
    countries: [],
    city: '',
  });
  // City facets only matter when exactly one country is selected; pass the
  // full effective filters so the hook can decide `enabled` + key correctly.
  const [pickerOpen, setPickerOpen] = useState(false);

  // Effective label + picker value are derived from the same effective
  // `filters.countries` the screen uses, so there is a single source of truth.
  const selectedLabel = formatCountrySelection(filters.countries);
  const hasCity = filters.city.trim().length > 0;
  const cityLabel =
    hasCity && filters.countries.length === 1
      ? `${filters.city} - ${filters.countries[0]}`
      : null;

  const openPicker = useCallback(() => {
    setPickerOpen(true);
  }, []);
  const closePicker = useCallback(() => {
    setPickerOpen(false);
  }, []);
  const applyCountries = useCallback(
    (next: string[]) => {
      setCountries(next);
      if (next.length !== 1) {
        setCity('');
      }
    },
    [setCountries, setCity],
  );

  return (
    <>
      <Card variant="filter" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="filter" size={14} color={theme.colors.ink} />
            <T size={9} weight="800">
              Quick filters
            </T>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Active 30d"
            accessibilityState={{ checked: recentOnly }}
            android_ripple={{ color: 'transparent' }}
            hitSlop={hitSlopFor(72, 26)}
            onPress={toggleRecentOnly}
            style={({ pressed }) => [
              styles.toggle,
              {
                borderColor: recentOnly ? theme.colors.accent : theme.colors.line,
                backgroundColor: recentOnly ? theme.colors.accentSoft : theme.colors.paper,
              },
              pressed && styles.pressed,
            ]}>
            {recentOnly ? (
              <View style={[styles.dotRing, { backgroundColor: theme.colors.recentDotRing }]} />
            ) : null}
            <View style={[styles.dot, { backgroundColor: recentOnly ? theme.colors.accent : theme.colors.muted }]} />
            <T size={7} color={recentOnly ? 'greenStrong' : 'muted'}>
              Active 30d
            </T>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rolesRow}>
          {ROLES.map((role) => {
            const active = feedRole === role;
            return (
              <Chip
                key={role}
                variant={active ? 'active' : 'default'}
                size={7}
                weight={active ? '800' : '500'}
                onPress={() => setFeedRole(role)}
                accessibilityLabel={`Filter role ${role}`}
                style={[styles.roleChip, active ? styles.roleChipActive : styles.roleChipIdle]}>
                {role}
              </Chip>
            );
          })}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pilih negara, ${selectedLabel}`}
          hitSlop={hitSlopFor(60, 32)}
          onPress={openPicker}
          style={({ pressed }) => [
            styles.countryChip,
            { borderColor: theme.colors.line },
            filters.countries.length > 0 && { backgroundColor: theme.colors.accentSoft },
            pressed && styles.pressed,
          ]}>
          <T size={14}>{flagEmoji(filters.countries[0] ?? 'GLOBAL')}</T>
          <View style={styles.countryText}>
            <T size={10} weight={filters.countries.length > 0 ? '700' : '400'} numberOfLines={1}>
              {filters.countries.length === 0 ? 'All countries' : filters.countries.length === 1 ? flagEmoji(filters.countries[0]) + ' ' + filters.countries[0] : `${filters.countries.length} countries`}
            </T>
            {cityLabel ? <T size={8} color="muted">{cityLabel}</T> : null}
          </View>
          <Icon name="chevron-down" size={12} color={theme.colors.muted} />
        </Pressable>
      </Card>
      <CountryPicker
        visible={pickerOpen}
        mode="multi"
        value={filters.countries ?? []}
        onApply={applyCountries}
        onClose={closePicker}
        title="COUNTRY"
        helper="Filter berdasarkan lokasi domisili yang dinyatakan developer."
        facets={facets.data}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderRadius: 7,
  },
  dotRing: {
    position: 'absolute',
    left: 5,
    width: 9,
    height: 9,
    borderRadius: 9999,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 9999,
  },
  rolesRow: {
    gap: 5,
  },
  roleChip: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  roleChipIdle: {
    backgroundColor: 'transparent',
  },
  roleChipActive: {
    // Keeps the accent chip look while matching the larger role-chip padding.
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 9,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  countryText: {
    flex: 1,
    gap: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default FeedFilters;
