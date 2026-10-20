import { feedProjects } from '@/data/seed';
import type { GithubRepo, GithubUser } from '@/types';
import {
  analyzeDeveloper,
  buildFallback,
  fetchProfile,
  fetchRepos,
  PROFILE_NOT_FOUND_MESSAGE,
} from '../github';

const project = feedProjects[0]; // Nusa Commerce — angga-risky

const profileJson: GithubUser = {
  login: 'angga-risky',
  name: 'Angga Risky',
  avatar_url: 'https://github.com/angga-risky.png',
  bio: 'Mobile developer.',
  followers: 1280,
  following: 42,
  public_repos: 18,
  location: 'Jakarta',
  html_url: 'https://github.com/angga-risky',
};

function makeRepo(id: number): GithubRepo {
  return {
    id,
    name: `repo-${id}`,
    description: null,
    language: 'Dart',
    stargazers_count: 10,
    html_url: `https://github.com/angga-risky/repo-${id}`,
  };
}

type Call = { url: string; init?: RequestInit };

function mockFetch(handler: (url: string) => Promise<Response>) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchProfile', () => {
  it('throws the exact Indonesian message when the profile is not ok', async () => {
    const { fetchImpl } = mockFetch(() => Promise.resolve(jsonResponse('Not found', 404)));
    await expect(fetchProfile('angga-risky', { fetchImpl })).rejects.toThrow(
      PROFILE_NOT_FOUND_MESSAGE,
    );
    await expect(fetchProfile('angga-risky', { fetchImpl })).rejects.toThrow(
      'Profil tidak ditemukan. Periksa kembali username.',
    );
  });

  it('encodes the login in the URL and sends only the Accept header', async () => {
    const { fetchImpl, calls } = mockFetch(() => Promise.resolve(jsonResponse(profileJson)));
    const user = await fetchProfile('angga risky/query', { fetchImpl });
    expect(user.login).toBe('angga-risky');
    expect(calls[0].url).toBe('https://api.github.com/users/angga%20risky%2Fquery');
    expect(calls[0].init?.headers).toEqual({ Accept: 'application/vnd.github+json' });
    expect(calls[0].init?.headers).not.toHaveProperty('Authorization');
  });
});

describe('fetchRepos', () => {
  it('returns [] when the repos response is not ok', async () => {
    const { fetchImpl } = mockFetch(() => Promise.resolve(jsonResponse('Server error', 500)));
    await expect(fetchRepos('angga-risky', { fetchImpl })).resolves.toEqual([]);
  });

  it('requests repos sorted by pushed with per_page=12', async () => {
    const { fetchImpl, calls } = mockFetch(() => Promise.resolve(jsonResponse([])));
    await fetchRepos('angga-risky', { fetchImpl });
    expect(calls[0].url).toBe(
      'https://api.github.com/users/angga-risky/repos?sort=pushed&per_page=12',
    );
  });
});

describe('analyzeDeveloper', () => {
  it('returns source "api" and slices repos to 8', async () => {
    const { fetchImpl } = mockFetch((url) =>
      url.includes('/repos')
        ? Promise.resolve(jsonResponse(Array.from({ length: 12 }, (_, i) => makeRepo(i + 1))))
        : Promise.resolve(jsonResponse(profileJson)),
    );
    const result = await analyzeDeveloper(project, { fetchImpl });
    expect(result.source).toBe('api');
    expect(result.user.login).toBe('angga-risky');
    expect(result.repos).toHaveLength(8);
  });

  it('falls back when the profile 404s', async () => {
    const { fetchImpl } = mockFetch((url) =>
      url.includes('/repos')
        ? Promise.resolve(jsonResponse([]))
        : Promise.resolve(jsonResponse('Not found', 404)),
    );
    const result = await analyzeDeveloper(project, { fetchImpl });
    expect(result.source).toBe('fallback');
    expect(result.user.login).toBe(project.developer.login);
  });

  it('falls back on network errors', async () => {
    const fetchImpl = (async () => {
      throw new Error('Network request failed');
    }) as typeof fetch;
    const result = await analyzeDeveloper(project, { fetchImpl });
    expect(result.source).toBe('fallback');
  });

  it('falls back on 403 rate limit', async () => {
    const { fetchImpl } = mockFetch(() => Promise.resolve(jsonResponse('API rate limit exceeded', 403)));
    const result = await analyzeDeveloper(project, { fetchImpl });
    expect(result.source).toBe('fallback');
  });

  it('keeps source "api" with empty repos when the repos call fails', async () => {
    const { fetchImpl } = mockFetch((url) =>
      url.includes('/repos')
        ? Promise.resolve(jsonResponse('Server error', 500))
        : Promise.resolve(jsonResponse(profileJson)),
    );
    const result = await analyzeDeveloper(project, { fetchImpl });
    expect(result.source).toBe('api');
    expect(result.repos).toEqual([]);
  });

  it('times out and falls back instead of hanging', async () => {
    jest.useFakeTimers();
    try {
      const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        })) as typeof fetch;

      const promise = analyzeDeveloper(project, { fetchImpl, timeoutMs: 50 });
      await jest.advanceTimersByTimeAsync(50);
      await expect(promise).resolves.toMatchObject({ source: 'fallback' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('never rejects for any failure mode', async () => {
    const scenarios: (typeof fetch)[] = [
      (async () => {
        throw new Error('offline');
      }) as typeof fetch,
      (async () => Promise.resolve(jsonResponse('rate limited', 403))) as typeof fetch,
      (async () => Promise.resolve(jsonResponse('missing', 404))) as typeof fetch,
      (async () => Promise.resolve(new Response('not json', { status: 200 }))) as typeof fetch,
    ];
    for (const fetchImpl of scenarios) {
      await expect(analyzeDeveloper(project, { fetchImpl })).resolves.toMatchObject({
        source: 'fallback',
      });
    }
  });
});

describe('buildFallback', () => {
  it('builds the fallback user and repo from the feed project', () => {
    const { user, repos } = buildFallback(project);
    expect(user).toMatchObject({
      login: 'angga-risky',
      name: 'Angga Risky',
      avatar_url: 'https://github.com/angga-risky.png',
      bio: project.description,
      followers: 1280,
      following: 42,
      public_repos: 18,
      location: 'Jakarta',
      html_url: 'https://github.com/angga-risky',
    });
    expect(repos).toHaveLength(1);
    expect(repos[0]).toMatchObject({
      id: 101,
      name: 'Nusa Commerce',
      description: project.description,
      language: 'Flutter', // stack[0] "Flutter 65%" → "Flutter"
      stargazers_count: 1280,
      forks_count: 42,
      homepage: 'Play Store',
      html_url: 'https://github.com/angga-risky',
    });
    expect(repos[0].pushed_at).toBeDefined();
  });
});
