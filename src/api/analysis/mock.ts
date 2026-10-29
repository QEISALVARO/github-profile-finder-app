// ---------------------------------------------------------------------------
// FE-2 — mock analysis adapter: a deterministic `AnalysisVM` built offline
// from the seed and the SP-0 fixtures, with no network call.
//
// The v1 scoring library is gone; every number is derived here from a stable
// hash of the login, so the same developer always produces the same VM while
// different developers differ visibly (name, language, role, country, repos,
// score, tier, heatmap).
//
// Special logins let the UI exercise every state without a backend:
//   __stale__ __notfound__ __ratelimited__ __error__ __empty__ __allforks__
// ---------------------------------------------------------------------------

import fixture from '../../../contracts/fixtures/analysis_vm.json';

import type { AnalysisVM, FeedItem } from '@/api/contracts';
import type { AppError } from '@/api/errors';
import type { Candidate } from '@/types';

import { analysisLogin, type AnalysisTarget } from './types';

type FixtureVM = AnalysisVM & { _description?: string };

/** SP-0 fixtures (BE-owned). `_description` is stripped before returning. */
const FIXTURES = fixture as unknown as FixtureVM[];

const OCTOCAT_BASE = FIXTURES[0];

export const SCENARIO_LOGINS = {
  stale: '__stale__',
  notFound: '__notfound__',
  rateLimited: '__ratelimited__',
  error: '__error__',
  empty: '__empty__',
  allForks: '__allforks__',
} as const;

export type ScenarioLogin = (typeof SCENARIO_LOGINS)[keyof typeof SCENARIO_LOGINS];

const STALE_SINCE = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const RATE_LIMIT_RETRY_AFTER = 42;

// --- deterministic helpers --------------------------------------------------

function hashLogin(login: string): number {
  let hash = 2166136261;
  for (let index = 0; index < login.length; index += 1) {
    hash ^= login.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function titleCaseLogin(login: string): string {
  return login
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const LANGUAGES = ['TypeScript', 'Go', 'Python', 'Rust', 'JavaScript', 'Dart', 'Swift'] as const;

const ROLE_BY_LANGUAGE: Record<string, string> = {
  TypeScript: 'Front-End',
  JavaScript: 'Front-End',
  Go: 'Back-End',
  Rust: 'Systems',
  Python: 'AI / Data',
  Dart: 'Mobile',
  Swift: 'Mobile',
};

const FRAMEWORKS_BY_LANGUAGE: Record<string, string[]> = {
  TypeScript: ['React', 'Vite', 'Node.js', 'Expo', 'tRPC'],
  JavaScript: ['React', 'Next.js', 'Node.js'],
  Go: ['Gin', 'Postgres', 'Docker'],
  Rust: ['Tokio', 'Serde', 'WASM'],
  Python: ['PyTorch', 'FastAPI', 'Ray'],
  Dart: ['Flutter', 'Riverpod', 'Firebase'],
  Swift: ['SwiftUI', 'Combine', 'CoreData'],
};

const LOCATIONS: { countryCode: string; city: string }[] = [
  { countryCode: 'ID', city: 'Jakarta' },
  { countryCode: 'SG', city: 'Singapore' },
  { countryCode: 'US', city: 'Austin' },
  { countryCode: 'DE', city: 'Berlin' },
  { countryCode: 'GB', city: 'London' },
  { countryCode: 'NO', city: 'Oslo' },
];

const REPO_STEMS = ['core', 'toolkit', 'starter-template', 'cli', 'dashboard', 'utils'];

function heatmapFor(seed: number): number[] {
  return Array.from({ length: 84 }, (_, index) => (index * 7 + (index % 5) + seed) % 5);
}

function tierFor(authenticity: number): AnalysisVM['tier'] {
  if (authenticity >= 85) return 'high';
  if (authenticity >= 70) return 'medium';
  return 'low';
}

function languageStats(language: string, seed: number): AnalysisVM['languageStats'] {
  const rest = LANGUAGES.filter((entry) => entry !== language).slice(seed % 3, (seed % 3) + 2);
  const values = seed % 2 === 0 ? [55, 27, 18] : [62, 22, 16];
  return [language, ...rest].slice(0, 3).map((name, index) => ({
    name,
    value: values[index],
  }));
}

type Identity = {
  login: string;
  name: string;
  avatarUrl: string;
  bio: string | null;
  htmlUrl: string;
  publicRepos: number;
  locationText: string | null;
  countryCode: string | null;
  city: string | null;
  score: number | null;
  role: string | null;
  language: string | null;
};

function identityFor(target: AnalysisTarget): Identity {
  const login = analysisLogin(target);
  const project: FeedItem | null = target.project ?? null;
  const person: Candidate | null = target.person ?? null;
  const seed = hashLogin(login);

  if (project) {
    const stackName = project.stack[0]?.name ?? 'TypeScript';
    return {
      login: project.developer.login,
      name: project.developer.name,
      avatarUrl: project.developer.avatarUrl,
      bio: project.description,
      htmlUrl: `https://github.com/${project.developer.login}`,
      publicRepos: 18,
      locationText: project.city,
      countryCode: project.countryCode,
      city: project.city,
      score: project.score,
      role: project.role,
      language: stackName,
    };
  }

  if (person) {
    return {
      login: person.login,
      name: person.name,
      avatarUrl: person.avatar,
      bio: null,
      htmlUrl: `https://github.com/${person.login}`,
      publicRepos: person.login === 'sindresorhus' ? 184 : 72,
      locationText: person.city ?? person.location,
      countryCode: person.countryCode ?? null,
      city: person.city ?? person.location,
      score: person.score,
      role: person.role,
      language: person.language,
    };
  }

  if (login === 'octocat') {
    return {
      login,
      name: OCTOCAT_BASE.user.name ?? 'The Octocat',
      avatarUrl: OCTOCAT_BASE.user.avatarUrl,
      bio: OCTOCAT_BASE.user.bio,
      htmlUrl: OCTOCAT_BASE.user.htmlUrl,
      publicRepos: OCTOCAT_BASE.user.publicRepos,
      locationText: OCTOCAT_BASE.user.locationText,
      countryCode: OCTOCAT_BASE.user.countryCode,
      city: OCTOCAT_BASE.user.city,
      // PRD §7.2 AC — the default analysis reads authenticity 73.
      score: 73,
      role: null,
      language: 'TypeScript',
    };
  }

  const language = LANGUAGES[seed % LANGUAGES.length];
  const location = LOCATIONS[seed % LOCATIONS.length];
  return {
    login,
    name: titleCaseLogin(login),
    avatarUrl: `https://github.com/${login}.png?size=200`,
    bio: `Open-source developer working in ${language}.`,
    htmlUrl: `https://github.com/${login}`,
    publicRepos: 12 + (seed % 60),
    locationText: location.city,
    countryCode: location.countryCode,
    city: location.city,
    score: null,
    role: ROLE_BY_LANGUAGE[language] ?? 'Full-Stack',
    language,
  };
}

function reposFor(
  identity: Identity,
  seed: number,
  options: { empty?: boolean; allForks?: boolean } = {},
): AnalysisVM['repos'] {
  if (options.empty) return [];

  // Octocat keeps the PRD §7.2 AC shape: two originals, one with a demo.
  const count = identity.login === 'octocat' ? 2 : 3;
  return Array.from({ length: count }, (_, index) => {
    const isFork = options.allForks
      ? true
      : index === count - 1 && seed % 3 === 0 && identity.login !== 'octocat';
    const hasVerifiedDemo = !isFork && index % 2 === 0;
    return {
      id: (seed % 900_000) + index + 1,
      name: `${identity.login.split(/[-_.]/)[0]}-${REPO_STEMS[index]}`,
      description: `Open-source ${REPO_STEMS[index]} maintained by ${identity.login}.`,
      language: index === 2 ? identity.language : (LANGUAGES[(seed + index) % LANGUAGES.length] ?? null),
      htmlUrl: `https://github.com/${identity.login}/${REPO_STEMS[index]}`,
      isFork,
      hasVerifiedDemo,
      score: isFork ? 64 : Math.min(98, 40 + (seed + index * 13) % 59),
    };
  });
}

/** The tapped feed card becomes the evidence list (D1). */
function reposFromProject(project: FeedItem): AnalysisVM['repos'] {
  return [
    {
      id: Number(project.id) || 1,
      name: project.name,
      description: project.description,
      language: project.stack[0]?.name ?? null,
      htmlUrl: `https://github.com/${project.developer.login}`,
      isFork: false,
      hasVerifiedDemo: project.demoVerified,
      score: Math.max(0, Math.min(100, project.score)),
    },
  ];
}

/**
 * Build a deterministic, contract-valid VM for whatever the user asked for.
 * Pure and synchronous — the mock adapter and the /dev panel share it.
 */
export function buildAnalysisVM(
  target: AnalysisTarget,
  options: { empty?: boolean; allForks?: boolean; stale?: boolean } = {},
): AnalysisVM {
  const identity = identityFor(target);
  const seed = hashLogin(identity.login);
  const repos =
    target.project && !options.empty ? reposFromProject(target.project) : reposFor(identity, seed, options);

  const nonFork = repos.filter((repo) => !repo.isFork);
  const withDemo = nonFork.filter((repo) => repo.hasVerifiedDemo);

  const authenticity = options.empty
    ? 8
    : options.allForks
      ? 15
      : (identity.score ?? 40 + (seed % 59));

  const originalRatio = repos.length === 0 ? 0 : Math.round((nonFork.length / repos.length) * 100) / 100;
  const demoRatio = nonFork.length === 0 ? 0 : Math.round((withDemo.length / nonFork.length) * 100);
  const originalCount =
    target.person && !options.empty
      ? identity.publicRepos
      : nonFork.length;

  const contributions12m = identity.login === 'octocat' ? 642 : 320 + (seed % 480);
  const streakWeeks =
    identity.login === 'sindresorhus' ? 28 : identity.login === 'gaearon' ? 19 : 8 + (seed % 20);
  const yoyPct = 8 + (seed % 15);

  const language = identity.language ?? 'TypeScript';

  return {
    source: options.stale ? 'stale' : 'fresh',
    ...(options.stale ? { staleSince: STALE_SINCE } : {}),
    user: {
      login: identity.login,
      name: identity.name,
      avatarUrl: identity.avatarUrl,
      bio: identity.bio,
      htmlUrl: identity.htmlUrl,
      publicRepos: identity.publicRepos,
      locationText: identity.locationText,
      countryCode: identity.countryCode,
      city: identity.city,
    },
    repos,
    authenticity,
    confidence: options.empty ? 34 : 60 + (seed % 35),
    tier: tierFor(authenticity),
    scoreVersion: 2,
    breakdown: {
      originality: Math.round(originalRatio * 100),
      activity: Math.min(100, Math.round(contributions12m / 9)),
      proof: demoRatio,
      substance: Math.min(100, originalCount * (repos.length === 0 ? 0 : 4)),
      depth: Math.min(100, streakWeeks * 3),
      evidence: [
        {
          label: `${nonFork.length} original repositories in the top ${repos.length || 0}`,
          url: `https://github.com/${identity.login}?tab=repositories`,
          reason: 'Mayoritas repository bukan hasil fork.',
        },
        {
          label: `${demoRatio}% repositories with a verified demo`,
          url: `https://github.com/${identity.login}?tab=repositories`,
          reason: 'Terdeteksi homepage/tautan demo pada repository.',
        },
      ],
    },
    inferredRole: identity.role ?? ROLE_BY_LANGUAGE[language] ?? 'Full-Stack',
    primaryLanguage: options.empty ? 'Other' : language,
    languageStats: options.empty ? [{ name: 'Other', value: 100 }] : languageStats(language, seed),
    frameworks: options.empty ? [] : (FRAMEWORKS_BY_LANGUAGE[language] ?? ['React', 'Node.js']),
    metrics: {
      originalRatio,
      originalCount,
      demoRatio,
      commitHealth: streaksHealth(streakWeeks),
      contributionDepth: contributions12m > 600 ? 'Deep' : contributions12m > 420 ? 'Moderate' : 'Light',
      streakWeeks,
      contributions12m,
      yoyPct,
    },
    heatmap: heatmapFor(seed),
  };
}

function streaksHealth(weeks: number): AnalysisVM['metrics']['commitHealth'] {
  if (weeks >= 20) return 'Consistent';
  if (weeks >= 12) return 'Irregular';
  return 'Sporadic';
}

function scenarioError(login: string): AppError | null {
  switch (login) {
    case SCENARIO_LOGINS.notFound:
      return { code: 'NOT_FOUND', message: 'Profil tidak ditemukan.', status: 404 };
    case SCENARIO_LOGINS.rateLimited:
      return {
        code: 'RATE_LIMITED',
        message: 'Batas analisis tercapai.',
        retry_after: RATE_LIMIT_RETRY_AFTER,
        status: 429,
      };
    case SCENARIO_LOGINS.error:
      return {
        code: 'UPSTREAM_ERROR',
        message: 'Layanan GitHub sedang gangguan. Coba lagi nanti.',
        status: 502,
      };
    default:
      return null;
  }
}

/** Offline analysis; throws `AppError` for the failure scenarios. */
export async function fetchAnalysis(target: AnalysisTarget): Promise<AnalysisVM> {
  const login = analysisLogin(target);

  const failure = scenarioError(login);
  if (failure) throw failure;

  return buildAnalysisVM(target, {
    empty: login === SCENARIO_LOGINS.empty,
    allForks: login === SCENARIO_LOGINS.allForks,
    stale: login === SCENARIO_LOGINS.stale,
  });
}
