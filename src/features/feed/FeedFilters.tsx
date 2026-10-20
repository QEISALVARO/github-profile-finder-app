import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { SelectField } from '@/components/ui/SelectField';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import type { SelectOption } from '@/components/ui/SelectSheet';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/useTheme';

const ROLES = ['All', 'Front-End', 'Back-End', 'Mobile', 'Data'] as const;

const LOCATION_OPTIONS: SelectOption[] = [
  { value: 'All locations', label: 'All locations' },
  { value: 'Indonesia', label: 'Indonesia' },
  { value: 'Jakarta', label: 'Jakarta' },
  { value: 'Bandung', label: 'Bandung' },
  { value: 'Surabaya', label: 'Surabaya' },
];

/**
 * FR-E4 — Quick filters card (design.md §3.4): "Active 30d" toggle, role
 * chips and the location select (SelectField + SelectSheet from M1).
 */
export function FeedFilters() {
  const theme = useTheme();
  const feedRole = useAppStore((s) => s.feedRole);
  const setFeedRole = useAppStore((s) => s.setFeedRole);
  const feedLocation = useAppStore((s) => s.feedLocation);
  const setFeedLocation = useAppStore((s) => s.setFeedLocation);
  const recentOnly = useAppStore((s) => s.recentOnly);
  const toggleRecentOnly = useAppStore((s) => s.toggleRecentOnly);

  return (
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
            <View
              style={[
                styles.dotRing,
                { backgroundColor: theme.colors.recentDotRing },
              ]}
            />
          ) : null}
          <View
            style={[
              styles.dot,
              { backgroundColor: recentOnly ? theme.colors.accent : theme.colors.muted },
            ]}
          />
          <T size={7} color={recentOnly ? 'greenStrong' : 'muted'}>
            Active 30d
          </T>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rolesRow}>
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
              style={[
                styles.roleChip,
                active ? styles.roleChipActive : styles.roleChipIdle,
              ]}>
              {role}
            </Chip>
          );
        })}
      </ScrollView>

      <SelectField
        value={feedLocation}
        options={LOCATION_OPTIONS}
        onChange={setFeedLocation}
        icon="location"
        estimatedWidth={140}
        accessibilityLabel="Pilih lokasi"
        style={styles.select}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 24,
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
  select: {
    marginTop: 9,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default FeedFilters;
