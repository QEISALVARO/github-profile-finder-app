// ---------------------------------------------------------------------------
// FE-2 — mock analysis adapter: a deterministic `AnalysisVM` built offline
// from the seed, with no network call.
//
// The v1 scoring rules (`lib/scoring.ts`) are used *only inside this file*
// (transition period): the UI reads the VM, never the raw repos.
// ---------------------------------------------------------------------------

import type { AnalysisVM, FeedItem } from '@/api/contracts';

import { fallbackRepos, fallbackUser } from '@/data/seed';
import { deriveAnalysis, repoScore, type LanguageStat } from '@/lib/scoring';
import type { AnalysisTarget } from './types';
import type { GithubRepo, GithubUser, Candidate } from '@/types';

/** PRD §5.3 — values the prototype shows statically (not computed in v1). */
const SCORE_VERSION = 1;
const CONFIDENCE = 94;
const CONTRIBUTIONS_12M = 642;
const YOY_PCT = 18;
const DEFAULT_STREAK_WEEKS = 28;
const FRAMEWORKS = ['React', 'Vite', 'Node.js', 'Expo', 'Metro', 'Hermes'];

/** PRD §5.4 — static Compare values: 184 for sindresorhus, 72 otherwise. */
const ORIGINAL_PROJECTS = 184;
const OTHER_ORIGINAL_PROJECTS = 72;
const LONG_STREAK_WEEKS = 28;
const SHORT_STREAK_WEEKS = 19;

/** design.md §3.13 — deterministic 84-cell heatmap. */
function buildHeatmap(): number[] {
  return Array.from({ length: 84 }, (_, i) => (i * 7 + (i % 5)) % 5);
}

export type BuildAnalysisVMOptions = {
  /** AUTH circle shown on the feed/candidate card (overrides the v1 formula). */
  authenticity?: number;
  /** PRD §5.4 "Original projects" for the Compare card. */
  originalCount?: number;
  /** PRD §5.4 "Commit streak" for the Compare card. */
  streakWeeks?: number;
  /** `profiles.public_repos` override (mock candidates carry PRD §5.4 counts). */
  publicRepos?: number;
};

function toLanguageStat(stats: LanguageStat[]): AnalysisVM['languageStats'] {
  return stats.slice(0, 3).map((stat) => ({ name: stat.name, value: stat.value }));
}

/**
 * Pure VM builder shared by the mock adapter and the /dev fixtures, so the
 * Analysis screen always renders the exact same shape the API will return.
 */
export function buildAnalysisVM(
  user: GithubUser,
  repos: GithubRepo[],
  options: BuildAnalysisVMOptions = {},
): AnalysisVM {
  const derived = deriveAnalysis(user, repos);
  const derivedAuthenticity = derived.authenticity;
  const authenticity = options.authenticity ?? derivedAuthenticity;
  const originalCount = options.originalCount ?? derived.originalCount;
  const streakWeeks = options.streakWeeks ?? DEFAULT_STREAK_WEEKS;
  const sliced = repos.slice(0, 8);

  const repoItems: AnalysisVM['repos'] = sliced.map((repo) => ({
    id: repo.id,
    name: repo.name,
    description: repo.description,
    language: repo.language,
    htmlUrl: repo.html_url,
    isFork: Boolean(repo.fork),
    hasVerifiedDemo: Boolean(repo.homepage),
    // v1 pill rule: forks are pinned at 64, originals cap at authenticity + 3.
    score: repoScore(repo, derivedAuthenticity),
  }));

  const metrics: AnalysisVM['metrics'] = {
    originalRatio: derived.originalRatio,
    originalCount,
    demoRatio: derived.demoRatio,
    commitHealth: 'Consistent',
    contributionDepth: 'Deep',
    streakWeeks,
    contributions12m: CONTRIBUTIONS_12M,
    yoyPct: YOY_PCT,
  };

  return {
    source: 'fresh',
    user: {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      htmlUrl: user.html_url,
      publicRepos: options.publicRepos ?? user.public_repos,
      locationText: user.location,
      countryCode: null,
      city: user.location,
    },
    repos: repoItems,
    authenticity,
    confidence: CONFIDENCE,
    tier: authenticity >= 85 ? 'high' : authenticity >= 70 ? 'medium' : 'low',
    scoreVersion: SCORE_VERSION,
    breakdown: {
      originality: derived.originalRatio,
      activity: Math.min(100, Math.round(CONTRIBUTIONS_12M / 8)),
      proof: derived.demoRatio,
      substance: Math.min(100, Math.round((originalCount / Math.max(sliced.length, 1)) * 100)),
      depth: Math.min(100, streakWeeks * 3),
      evidence: [
        {
          label: `${derived.originalCount} original repositories`,
          url: `https://github.com/${user.login}?tab=repositories`,
          reason: 'Mayoritas repository bukan hasil fork.',
        },
        {
          label: `${derived.demoRatio}% repositories with a live demo`,
          url: `https://github.com/${user.login}?tab=repositories`,
          reason: 'Terdeteksi homepage/tautan demo pada repository.',
        },
      ],
    },
    inferredRole: derived.role,
    primaryLanguage: derived.primary,
    languageStats: toLanguageStat(derived.stats),
    frameworks: FRAMEWORKS,
    metrics,
    heatmap: buildHeatmap(),
  };
}

/**
 * Synthetic but stable repo list for a Talent candidate (the seed carries no
 * repositories for them). All original — one with a verified demo — so
 * `originalRatio` stays consistent with the PRD §5.4 `originalCount` shown on
 * the Compare card.
 */
function candidateRepos(candidate: Candidate): GithubRepo[] {
  const htmlUrl = `https://github.com/${candidate.login}`;
  const base = {
    language: candidate.language,
    fork: false,
    html_url: htmlUrl,
    pushed_at: '2026-10-12',
  } as const;
  return [
    {
      ...base,
      id: 1,
      name: 'toolkit',
      description: 'Open-source project by this developer.',
      stargazers_count: candidate.score * 14,
      forks_count: 128,
      homepage: htmlUrl,
    },
    {
      ...base,
      id: 2,
      name: 'starter-template',
      description: 'Open-source project by this developer.',
      stargazers_count: candidate.score * 6,
      forks_count: 54,
      homepage: null,
    },
    {
      ...base,
      id: 3,
      name: 'dotfiles',
      description: 'Open-source project by this developer.',
      stargazers_count: candidate.score * 2,
      forks_count: 17,
      homepage: null,
    },
  ];
}

function candidateUser(candidate: Candidate, publicRepos: number): GithubUser {
  return {
    login: candidate.login,
    name: candidate.name,
    avatar_url: candidate.avatar,
    bio: null,
    followers: candidate.score * 31,
    following: 42,
    public_repos: publicRepos,
    location: candidate.location,
    html_url: `https://github.com/${candidate.login}`,
  };
}

/**
 * Adapt the VM's user block back into the `GithubUser` shape the chat slot
 * (`useAppStore.chat.person`) expects — the only bridge between the two
 * representations in the app.
 */
export function vmToGithubUser(vm: AnalysisVM): GithubUser {
  return {
    login: vm.user.login,
    name: vm.user.name,
    avatar_url: vm.user.avatarUrl,
    bio: vm.user.bio,
    followers: 0,
    following: 0,
    public_repos: vm.user.publicRepos,
    location: vm.user.locationText,
    html_url: vm.user.htmlUrl,
  };
}

/**
 * PRD §5.2 fallback, rebuilt from a contract `FeedItem` instead of the legacy
 * `FeedProject`: same values the prototype produced (followers = stars,
 * following 42, 18 public repos, homepage = demo, pushed_at = now).
 */
function analysisFromFeedItem(item: FeedItem): AnalysisVM {
  const login = item.developer.login;
  const user: GithubUser = {
    login,
    name: item.developer.name,
    avatar_url: item.developer.avatarUrl,
    bio: item.description,
    followers: item.stars,
    following: 42,
    public_repos: 18,
    location: item.city,
    html_url: `https://github.com/${login}`,
  };

  const repos: GithubRepo[] = [
    {
      id: Number(item.id) || 0,
      name: item.name,
      description: item.description,
      language: item.stack[0]?.name ?? null,
      stargazers_count: item.stars,
      forks_count: 42,
      fork: false,
      homepage: item.demoUrl,
      pushed_at: new Date().toISOString(),
      html_url: `https://github.com/${login}`,
    },
  ];

  // The AUTH circle on the card and the ring in Analysis must agree.
  return buildAnalysisVM(user, repos, { authenticity: item.score });
}

/**
 * Offline analysis for whatever developer the user tapped:
 *  - feed card → its own developer + repository (D1),
 *  - talent candidate → the candidate with PRD §5.4 Compare numbers,
 *  - no context → the octocat default (authenticity 73, PRD §7.2 AC).
 */
export async function fetchAnalysis(target: AnalysisTarget): Promise<AnalysisVM> {
  const person = target.person ?? null;
  const project = target.project ?? null;

  if (project) {
    return analysisFromFeedItem(project);
  }

  if (person) {
    const isLongTrack = person.login === 'sindresorhus';
    const originalCount = isLongTrack ? ORIGINAL_PROJECTS : OTHER_ORIGINAL_PROJECTS;
    return buildAnalysisVM(candidateUser(person, originalCount), candidateRepos(person), {
      authenticity: person.score,
      originalCount,
      streakWeeks: isLongTrack ? LONG_STREAK_WEEKS : SHORT_STREAK_WEEKS,
    });
  }

  return buildAnalysisVM(fallbackUser, fallbackRepos);
}
