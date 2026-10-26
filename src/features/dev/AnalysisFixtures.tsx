import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { fallbackRepos, fallbackUser, feedProjects } from '@/data/seed';
import type { GithubRepo, GithubUser } from '@/types';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { hitSlopFor } from '@/components/ui/hit-slop';
import { buildFallback } from '@/lib/github';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/useTheme';

/**
 * §5.1 — dev-only fixtures so the Analysis screen can be opened without the
 * M2 feed. Each button seeds `user`/`repos` and pushes /explore/analysis.
 * This block is thrown away in M6.
 */
export function AnalysisFixtures() {
  const theme = useTheme();
  const setUser = useAppStore((s) => s.setUser);
  const setRepos = useAppStore((s) => s.setRepos);

  const openFixture = (user: GithubUser, repos: GithubRepo[]) => {
    setUser(user);
    setRepos(repos);
    router.push('/explore/analysis');
  };

  const forkedRepos: GithubRepo[] = fallbackRepos.map((repo) => ({
    ...repo,
    fork: true,
    homepage: null,
  }));

  const originalWithDemos: GithubRepo[] = fallbackRepos.map((repo) => ({
    ...repo,
    fork: false,
    homepage: 'https://octocat.github.io',
  }));

  const longBioUser: GithubUser = {
    ...fallbackUser,
    name: null,
    bio: 'Engineer with a decade of experience across distributed systems, developer tooling, and the occasional game jam. I write long bios on purpose so the ProfileCard ellipsis behaviour can be verified on small screens.',
  };

  const manyLanguages: GithubRepo[] = [
    { ...fallbackRepos[0], id: 11, language: 'TypeScript' },
    { ...fallbackRepos[0], id: 12, language: 'TypeScript' },
    { ...fallbackRepos[0], id: 13, language: 'TypeScript' },
    { ...fallbackRepos[0], id: 14, language: 'Go' },
    { ...fallbackRepos[0], id: 15, language: 'Go' },
    { ...fallbackRepos[0], id: 16, language: 'Rust' },
    { ...fallbackRepos[0], id: 17, language: null },
  ];

  const fallbackProject = buildFallback(feedProjects[0]);

  const fixtures: { label: string; hint: string; user: GithubUser; repos: GithubRepo[] }[] = [
    { label: '1 · octocat (default)', hint: 'authenticity 73 · TS/Go 50/50', user: fallbackUser, repos: fallbackRepos },
    { label: '2 · repos kosong', hint: 'public_repos 8 · authenticity 8', user: { ...fallbackUser, public_repos: 8 }, repos: [] },
    { label: '3 · semua fork', hint: 'original 0 · pill skor 64', user: fallbackUser, repos: forkedRepos },
    { label: '4 · original + demo', hint: 'authenticity ter-cap 98', user: { ...fallbackUser, public_repos: 25 }, repos: originalWithDemos },
    { label: '5 · bio panjang + nama kosong', hint: 'uji ellipsis & fallback nama', user: longBioUser, repos: fallbackRepos },
    { label: '6 · bahasa > 3 + null', hint: 'top-3 + "Other"', user: fallbackUser, repos: manyLanguages },
    { label: '7 · fallback proyek', hint: 'buildFallback(feedProjects[0])', user: fallbackProject.user, repos: fallbackProject.repos },
  ];

  return (
    <View style={styles.block}>
      <T size={7} mono ls={1.8} color="greenText">
        ANALYSIS FIXTURES · DEV ONLY (BUANG DI M6)
      </T>
      <Card variant="base" padding={13} style={styles.card}>
        {fixtures.map((fixture) => (
          <Pressable
            key={fixture.label}
            accessibilityRole="button"
            accessibilityLabel={`Buka fixture ${fixture.label}`}
            hitSlop={hitSlopFor(200, 16)}
            onPress={() => openFixture(fixture.user, fixture.repos)}
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
