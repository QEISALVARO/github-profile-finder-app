// ---------------------------------------------------------------------------
// PRD §5.2 — GitHub REST fetching + fallback. Pure data layer: it never touches
// the store, router or UI state. No auth token (PRD §10).
//
// @deprecated — dihapus di R2. Everything that talks to `api.github.com` from
// the client (`API_BASE`, `fetchProfile`, `fetchRepos`, `analyzeDeveloper`)
// is replaced by the `analysis` adapter (src/api/analysis) + the
// `analyze-developer` Edge Function (PRD v2 §8.1). The UI must not call these.
// `buildFallback` stays: it is a pure, offline helper.
// ---------------------------------------------------------------------------

import type { FeedProject, GithubRepo, GithubUser } from '@/types';

export type AnalyzeResult = {
  user: GithubUser;
  repos: GithubRepo[]; // already sliced to max 8
  source: 'api' | 'fallback';
};

export type FetchDeps = {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

export type AnalyzeDeps = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/** @deprecated — dihapus di R2 (lihat catatan modul di atas). */
const API_BASE = 'https://api.github.com';
const REPOS_PER_PAGE = 12;
const MAX_REPOS = 8;

// PRD §5.2 — the ONLY header sent; deliberately no Authorization (PRD §10).
const HEADERS = { Accept: 'application/vnd.github+json' } as const;

export const PROFILE_NOT_FOUND_MESSAGE = 'Profil tidak ditemukan. Periksa kembali username.';

/** @deprecated — dihapus di R2; pakai adapter `analysis`. */
export async function fetchProfile(login: string, deps: FetchDeps = {}): Promise<GithubUser> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const response = await fetchImpl(`${API_BASE}/users/${encodeURIComponent(login)}`, {
    headers: HEADERS,
    signal: deps.signal,
  });
  if (!response.ok) {
    throw new Error(PROFILE_NOT_FOUND_MESSAGE);
  }
  return (await response.json()) as GithubUser;
}

/** Non-ok repos response → `[]`, never a throw (PRD §5.2 step 4).
 *  @deprecated — dihapus di R2; pakai adapter `analysis`. */
export async function fetchRepos(login: string, deps: FetchDeps = {}): Promise<GithubRepo[]> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const response = await fetchImpl(
    `${API_BASE}/users/${encodeURIComponent(login)}/repos?sort=pushed&per_page=${REPOS_PER_PAGE}`,
    { headers: HEADERS, signal: deps.signal },
  );
  if (!response.ok) {
    return [];
  }
  return (await response.json()) as GithubRepo[];
}

/** PRD §5.2 step 5 — fallback built from the feed project's own data. */
export function buildFallback(project: FeedProject): { user: GithubUser; repos: GithubRepo[] } {
  return {
    user: {
      login: project.developer.login,
      name: project.developer.name,
      avatar_url: project.developer.avatar,
      bio: project.description,
      followers: project.stars,
      following: 42,
      public_repos: 18,
      location: project.location,
      html_url: `https://github.com/${project.developer.login}`,
    },
    repos: [
      {
        id: project.id,
        name: project.name,
        description: project.description,
        language: project.stack[0].split(' ')[0],
        stargazers_count: project.stars,
        forks_count: 42,
        homepage: project.demo,
        pushed_at: new Date().toISOString(),
        html_url: `https://github.com/${project.developer.login}`,
      },
    ],
  };
}

/**
 * Fetch profile + repos in parallel with a shared AbortController. NEVER
 * throws — any failure (network, timeout, 403, 404, bad JSON) resolves to
 * the project fallback (PRD §5.2 step 5).
 *
 * @deprecated — dihapus di R2; pakai adapter `analysis`.
 */
export async function analyzeDeveloper(
  project: FeedProject,
  deps?: AnalyzeDeps,
): Promise<AnalyzeResult> {
  const fetchImpl = deps?.fetchImpl ?? fetch;
  const timeoutMs = deps?.timeoutMs ?? 10_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const [user, repoList] = await Promise.all([
      fetchProfile(project.developer.login, { fetchImpl, signal: controller.signal }),
      fetchRepos(project.developer.login, { fetchImpl, signal: controller.signal }),
    ]);
    return { user, repos: repoList.slice(0, MAX_REPOS), source: 'api' };
  } catch {
    return { ...buildFallback(project), source: 'fallback' };
  } finally {
    clearTimeout(timer);
  }
}
