// ---------------------------------------------------------------------------
// PRD §5.3 — pure scoring & inference logic. No React, no store, no I/O.
// ---------------------------------------------------------------------------

import type { GithubRepo, GithubUser } from '@/types';

export type LanguageStat = { name: string; value: number };

/**
 * Top 3 languages by repo count (`null` → "Other"), sorted desc by count.
 * The sort is stable, so ties keep first-appearance order (PRD §5.3 AC:
 * octocat's TypeScript/Go tie resolves to TypeScript).
 */
export function languageStats(repos: GithubRepo[]): LanguageStat[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    const name = repo.language ?? 'Other';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({
      name,
      value: Math.round((count / Math.max(repos.length, 1)) * 100),
    }));
}

export function primaryLanguage(stats: LanguageStat[]): string {
  return stats[0]?.name ?? 'TypeScript';
}

export function inferRole(primary: string): string {
  if (['JavaScript', 'TypeScript', 'HTML', 'CSS'].includes(primary)) {
    return 'Front-End Developer';
  }
  if (['Kotlin', 'Dart', 'Swift'].includes(primary)) {
    return 'Mobile Developer';
  }
  if (['Python', 'R'].includes(primary)) {
    return 'AI / Data Engineer';
  }
  return 'Back-End Developer';
}

export function originalRatio(repos: GithubRepo[]): number {
  return repos.length
    ? Math.round(repos.filter((r) => !r.fork).length / repos.length * 100)
    : 0;
}

/** Empty-string homepages count as "no demo" (falsy check). */
export function demoRatio(repos: GithubRepo[]): number {
  return repos.length
    ? Math.round(repos.filter((r) => r.homepage).length / repos.length * 100)
    : 0;
}

export function authenticity(repos: GithubRepo[], publicRepos: number): number {
  return Math.min(
    98,
    Math.round(originalRatio(repos) * 0.55 + demoRatio(repos) * 0.2 + Math.min(publicRepos, 25)),
  );
}

export function repoScore(repo: GithubRepo, authenticityValue: number): number {
  return repo.fork ? 64 : Math.min(98, authenticityValue + 3);
}

export type DerivedAnalysis = {
  stats: LanguageStat[];
  primary: string;
  role: string;
  originalRatio: number;
  originalCount: number;
  demoRatio: number;
  authenticity: number;
};

/** Pure helper so screens compute every derived value in one `useMemo`. */
export function deriveAnalysis(user: GithubUser, repos: GithubRepo[]): DerivedAnalysis {
  const stats = languageStats(repos);
  const originalCount = repos.filter((r) => !r.fork).length;
  const ratio = originalRatio(repos);
  const demos = demoRatio(repos);
  return {
    stats,
    primary: primaryLanguage(stats),
    role: inferRole(primaryLanguage(stats)),
    originalRatio: ratio,
    originalCount,
    demoRatio: demos,
    authenticity: authenticity(repos, user.public_repos),
  };
}
