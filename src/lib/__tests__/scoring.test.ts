import { fallbackRepos, fallbackUser } from '@/data/seed';
import type { GithubRepo } from '@/types';
import {
  authenticity,
  demoRatio,
  deriveAnalysis,
  inferRole,
  languageStats,
  originalRatio,
  primaryLanguage,
  repoScore,
} from '../scoring';

function repo(partial: Partial<GithubRepo> & { id: number }): GithubRepo {
  return {
    name: `repo-${partial.id}`,
    description: null,
    language: null,
    stargazers_count: 0,
    html_url: `https://github.com/octocat/repo-${partial.id}`,
    ...partial,
  };
}

describe('inferRole', () => {
  it('maps front-end languages to Front-End Developer', () => {
    for (const lang of ['JavaScript', 'TypeScript', 'HTML', 'CSS']) {
      expect(inferRole(lang)).toBe('Front-End Developer');
    }
  });

  it('maps mobile languages to Mobile Developer', () => {
    for (const lang of ['Kotlin', 'Dart', 'Swift']) {
      expect(inferRole(lang)).toBe('Mobile Developer');
    }
  });

  it('maps data languages to AI / Data Engineer', () => {
    for (const lang of ['Python', 'R']) {
      expect(inferRole(lang)).toBe('AI / Data Engineer');
    }
  });

  it('falls back to Back-End Developer for anything else', () => {
    expect(inferRole('Rust')).toBe('Back-End Developer');
    expect(inferRole('Other')).toBe('Back-End Developer');
    expect(inferRole('')).toBe('Back-End Developer');
    expect(inferRole('Go')).toBe('Back-End Developer');
  });
});

describe('primaryLanguage', () => {
  it('returns the top stat language', () => {
    expect(primaryLanguage([{ name: 'Go', value: 60 }])).toBe('Go');
  });

  it('defaults to TypeScript when there are no stats', () => {
    expect(primaryLanguage([])).toBe('TypeScript');
  });
});

describe('languageStats', () => {
  it('counts null languages as Other', () => {
    const stats = languageStats([repo({ id: 1, language: null }), repo({ id: 2, language: 'Go' })]);
    // Tie (1 vs 1) → first appearance wins: "Other" was seen first.
    expect(stats).toEqual([
      { name: 'Other', value: 50 },
      { name: 'Go', value: 50 },
    ]);
  });

  it('keeps only the top 3 languages, sorted desc', () => {
    const stats = languageStats([
      repo({ id: 1, language: 'TypeScript' }),
      repo({ id: 2, language: 'TypeScript' }),
      repo({ id: 3, language: 'TypeScript' }),
      repo({ id: 4, language: 'Go' }),
      repo({ id: 5, language: 'Go' }),
      repo({ id: 6, language: 'Rust' }),
      repo({ id: 7, language: 'Python' }),
    ]);
    expect(stats).toEqual([
      { name: 'TypeScript', value: 43 },
      { name: 'Go', value: 29 },
      { name: 'Rust', value: 14 },
    ]);
  });

  it('breaks ties by first appearance', () => {
    const stats = languageStats([
      repo({ id: 1, language: 'Go' }),
      repo({ id: 2, language: 'TypeScript' }),
    ]);
    expect(stats).toEqual([
      { name: 'Go', value: 50 },
      { name: 'TypeScript', value: 50 },
    ]);
  });
});

describe('ratios & authenticity', () => {
  it('octocat fallback: originalRatio 100, demoRatio 50, authenticity 73', () => {
    expect(originalRatio(fallbackRepos)).toBe(100);
    expect(demoRatio(fallbackRepos)).toBe(50);
    expect(authenticity(fallbackRepos, fallbackUser.public_repos)).toBe(73);
  });

  it('octocat fallback: primary TypeScript, Front-End role, 50/50 stats', () => {
    const derived = deriveAnalysis(fallbackUser, fallbackRepos);
    expect(derived.primary).toBe('TypeScript');
    expect(derived.role).toBe('Front-End Developer');
    expect(derived.stats).toEqual([
      { name: 'TypeScript', value: 50 },
      { name: 'Go', value: 50 },
    ]);
    expect(derived.originalCount).toBe(2);
  });

  it('empty repos with public_repos 8 → ratios 0, authenticity 8', () => {
    expect(originalRatio([])).toBe(0);
    expect(demoRatio([])).toBe(0);
    expect(authenticity([], 8)).toBe(8);
  });

  it('empty repos with public_repos 100 → authenticity capped at 25', () => {
    expect(authenticity([], 100)).toBe(25);
  });

  it('all forks without homepages, public_repos 25 → 0/0/25', () => {
    const repos = [
      repo({ id: 1, fork: true, homepage: null }),
      repo({ id: 2, fork: true, homepage: null }),
    ];
    expect(originalRatio(repos)).toBe(0);
    expect(demoRatio(repos)).toBe(0);
    expect(authenticity(repos, 25)).toBe(25);
  });

  it('all original with homepages, public_repos 25 → 100 capped to 98', () => {
    const repos = [
      repo({ id: 1, fork: false, homepage: 'https://a.example' }),
      repo({ id: 2, fork: false, homepage: 'https://b.example' }),
    ];
    expect(authenticity(repos, 25)).toBe(98);
  });

  it('treats an empty-string homepage as no demo', () => {
    const repos = [repo({ id: 1, homepage: '' }), repo({ id: 2, homepage: 'https://x.example' })];
    expect(demoRatio(repos)).toBe(50);
  });
});

describe('repoScore', () => {
  it('scores forks at a flat 64', () => {
    expect(repoScore(repo({ id: 1, fork: true }), 96)).toBe(64);
  });

  it('scores original repos at authenticity + 3, capped at 98', () => {
    expect(repoScore(repo({ id: 2, fork: false }), 96)).toBe(98);
    expect(repoScore(repo({ id: 3, fork: false }), 50)).toBe(53);
  });
});
