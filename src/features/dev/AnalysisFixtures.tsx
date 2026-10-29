import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { SCENARIO_LOGINS } from '@/api/analysis';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { useTheme } from '@/theme/useTheme';

/**
 * §5.1 — dev-only analysis fixtures.
 *
 * FE-2 routes every state through the data layer: each row opens the Analysis
 * screen with a special login the mock adapter understands, so the real
 * loading / stale / error / empty / all-forks states can be inspected without
 * a backend and without any store injection.
 */
const FIXTURES: { login: string; label: string; hint: string }[] = [
  { login: 'octocat', label: '1 · octocat (default)', hint: 'authenticity 73 · PRD §7.2' },
  { login: 'sindresorhus', label: '2 · kandidat seed', hint: '184 repo · high tier' },
  { login: 'gaearon', label: '3 · kandidat seed', hint: '72 repo · medium tier' },
  { login: SCENARIO_LOGINS.empty, label: '4 · repos kosong', hint: '__empty__' },
  { login: SCENARIO_LOGINS.allForks, label: '5 · semua fork', hint: '__allforks__' },
  { login: SCENARIO_LOGINS.stale, label: '6 · data stale', hint: '__stale__ · banner' },
  { login: SCENARIO_LOGINS.notFound, label: '7 · tidak ditemukan', hint: '__notfound__ · 404' },
  {
    login: SCENARIO_LOGINS.rateLimited,
    label: '8 · rate limited',
    hint: '__ratelimited__ · 429',
  },
  { login: SCENARIO_LOGINS.error, label: '9 · upstream error', hint: '__error__ · 502' },
];

export function AnalysisFixtures() {
  const theme = useTheme();

  return (
    <View style={styles.block}>
      <T size={7} mono ls={1.8} color="greenText">
        ANALYSIS FIXTURES · DEV ONLY (BUANG DI M6)
      </T>
      <Card variant="base" padding={13} style={styles.card}>
        {FIXTURES.map((fixture) => (
          <Pressable
            key={fixture.login}
            accessibilityRole="button"
            accessibilityLabel={`Buka fixture ${fixture.label}`}
            hitSlop={hitSlopFor(200, 16)}
            onPress={() =>
              router.push({
                pathname: '/explore/analysis',
                params: { login: fixture.login },
              })
            }
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Icon name="arrow" size={14} color={theme.colors.greenText} />
            <T size={8} weight="700">
              {fixture.label}
            </T>
            <T size={7} color="muted" style={styles.hint}>
              {fixture.hint}
            </T>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: 26,
    paddingBottom: 8,
    gap: 8,
  },
  card: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  hint: {
    flex: 1,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.85,
  },
});
