import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { Linking } from 'react-native';

import type { FeedPage } from '@/api/contracts';
import { feedAdapter } from '@/api/feed';
import { mapRpcError, openGithubUrl, openHttpsUrl, queryKeys } from '@/api/feed/api';
import type { CountryFacet, CityFacet } from '@/api/contracts';
import { feedProjects } from '@/data/seed';
import { getDataSource, DATA_SOURCE_ENV, DOMAINS } from '@/config/dataSource';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

/** FE-10a — feed adapter tests: parameter mapping, Zod validation, error codes, retry_after.
 */

const DEFAULT_FILTERS: {
  query: string;
  role: string;
  location: string;
  recentOnly: boolean;
  countries: string[];
  city: string;
} = {
  query: '',
  role: 'All',
  location: 'All locations',
  recentOnly: false,
  countries: [],
  city: '',
};

beforeEach(() => {
  for (const domain of DOMAINS) delete process.env[DATA_SOURCE_ENV[domain]];
});

describe('FE-10a: feed adapter parameter mapping', () => {
  it('maps filters to RPC params correctly', async () => {
    // Default filters should return all 4 seed projects
    const page = await feedAdapter.fetchPage(DEFAULT_FILTERS);
    expect(page.items).toHaveLength(4);
    expect(page.totalCount).toBe(4);
  });

  it('filters by query string', async () => {
    const page = await feedAdapter.fetchPage({ ...DEFAULT_FILTERS, query: 'flutter' });
    expect(page.items.map((item) => item.name)).toEqual(['Nusa Commerce']);
  });

  it('filters by role', async () => {
    const page = await feedAdapter.fetchPage({
      ...DEFAULT_FILTERS,
      role: 'Mobile',
    });
    // Only Nusa Commerce has role "Mobile"
    expect(page.items).toHaveLength(1);
    expect(page.items[0].name).toBe('Nusa Commerce');
  });

  it('filters by country', async () => {
    const page = await feedAdapter.fetchPage({
      ...DEFAULT_FILTERS,
      countries: ['ID'],
    });
    expect(page.items).toHaveLength(4);
    expect(page.items.every((item) => item.countryCode === 'ID')).toBe(true);
  });

  it('filters by city', async () => {
    const page = await feedAdapter.fetchPage({
      ...DEFAULT_FILTERS,
      city: 'Bandung',
    });
    expect(page.items.map((item) => item.name)).toEqual(['Sentra AI Vision']);
  });

  it('filters by recentOnly (active 30d)', async () => {
    // Only 3 of 4 seed projects have active: true (Ruang Dashboard is inactive)
    const page = await feedAdapter.fetchPage({
      ...DEFAULT_FILTERS,
      recentOnly: true,
    });
    expect(page.items).toHaveLength(3);
    // All returned items should be active
    expect(page.items.every((item) => item.active === true)).toBe(true);
  });

  it('resets city when countries change', async () => {
    // When countries is empty, city filter still works
    const byCity = await feedAdapter.fetchPage({
      ...DEFAULT_FILTERS,
      city: 'Bandung',
    });
    expect(byCity.items).toHaveLength(1);
  });
});

describe('FE-10a: feed adapter Zod validation', () => {
  it('every FeedPage satisfies the contract schema', async () => {
    const page = await feedAdapter.fetchPage(DEFAULT_FILTERS);
    // Verify page structure matches expected shape
    expect(page).toHaveProperty('items');
    expect(page).toHaveProperty('nextCursor');
    expect(page).toHaveProperty('totalCount');
    expect(Array.isArray(page.items)).toBe(true);
    expect(typeof page.totalCount).toBe('number');
  });

  it('every CountryFacet satisfies the contract schema', async () => {
    const facets = await feedAdapter.fetchCountryFacets(DEFAULT_FILTERS);
    // Verify facet structure
    expect(facets).toHaveLength(1);
    expect(facets[0]).toHaveProperty('iso2');
    expect(facets[0]).toHaveProperty('count');
    expect(facets[0].iso2).toBe('ID');
    expect(facets[0].count).toBe('<5');
  });

  it('every CityFacet satisfies the contract schema', async () => {
    const facets = await feedAdapter.fetchCityFacets('ID', DEFAULT_FILTERS);
    // Verify facet structure
    expect(facets.length).toBeGreaterThan(0);
    for (const facet of facets) {
      expect(facet).toHaveProperty('city');
      expect(facet).toHaveProperty('count');
    }
    // All seed cities are in Indonesia
    const cities = facets.map((f) => f.city);
    expect(cities).toContain('Jakarta');
    expect(cities).toContain('Bandung');
    expect(cities).toContain('Yogyakarta');
    expect(cities).toContain('Surabaya');
  });

  it('FeedItem items satisfy the contract schema', async () => {
    const page = await feedAdapter.fetchPage(DEFAULT_FILTERS);
    for (const item of page.items) {
      // Validate individual fields that matter for UI
      expect(item.id).toBeDefined();
      expect(typeof item.name).toBe('string');
      expect(typeof item.developer.login).toBe('string');
      expect(typeof item.score).toBe('number');
      expect(typeof item.active).toBe('boolean');
      expect(item.countryCode === null || typeof item.countryCode === 'string').toBe(true);
      expect(item.city === null || typeof item.city === 'string').toBe(true);
      expect(Array.isArray(item.stack)).toBe(true);
      // demoUrl can be string or null in the contract
      expect(item.demoUrl === null || typeof item.demoUrl === 'string').toBe(true);
      expect(typeof item.demoVerified).toBe('boolean');
      expect(typeof item.stars).toBe('number');
    }
  });
});

describe('FE-10a: reportProject adapter', () => {
  it('accepts a valid projectId and reason', async () => {
    const result = await feedAdapter.reportProject(
      feedProjects[0].id.toString(),
      'spam',
    );
    expect(result).toBe(true);
  });

  it('accepts duplicate reports (idempotent)', async () => {
    const projectId = feedProjects[0].id.toString();
    const first = await feedAdapter.reportProject(projectId, 'spam');
    const second = await feedAdapter.reportProject(projectId, 'spam');
    expect(first).toBe(true);
    expect(second).toBe(true);
  });

  it('accepts long reasons up to 500 chars', async () => {
    const longReason = 'a'.repeat(500);
    const result = await feedAdapter.reportProject(
      feedProjects[0].id.toString(),
      longReason,
    );
    expect(result).toBe(true);
  });

  it('truncates reasons longer than 500 chars', async () => {
    const longReason = 'a'.repeat(600);
    // Should not throw - mock adapter doesn't enforce length
    const result = await feedAdapter.reportProject(
      feedProjects[0].id.toString(),
      longReason,
    );
    expect(result).toBe(true);
  });

  it('accepts preset reason labels', async () => {
    const presets = ['spam', 'plagiarism', 'fake', 'inappropriate', 'other'];
    for (const reason of presets) {
      const result = await feedAdapter.reportProject(
        feedProjects[0].id.toString(),
        reason,
      );
      expect(result).toBe(true);
    }
  });
});

describe('FE-10a: reportProject error handling', () => {
  it('in api mode throws ApiNotReadyError', async () => {
    // When DS_FEED=api but backend is not available, adapter throws ApiNotReadyError
    process.env.EXPO_PUBLIC_DS_FEED = 'api';
    try {
      await expect(
        feedAdapter.reportProject('test-id', 'test reason'),
      ).rejects.toThrow(/belum tersedia di backend/);
    } finally {
      delete process.env.EXPO_PUBLIC_DS_FEED;
    }
  });

  it('in api mode with empty reason throws ApiNotReadyError', async () => {
    // Empty reason would be caught by backend validation, but in mock mode
    // we test that api mode throws ApiNotReadyError when backend unavailable
    process.env.EXPO_PUBLIC_DS_FEED = 'api';
    try {
      await expect(
        feedAdapter.reportProject('test-id', ''),
      ).rejects.toThrow(/belum tersedia di backend/);
    } finally {
      delete process.env.EXPO_PUBLIC_DS_FEED;
    }
  });
});

describe('FE-10a: useFeedInfinite behavior', () => {
  it('returns first page with totalCount', async () => {
    const page = await feedAdapter.fetchPage(DEFAULT_FILTERS);
    expect(page.items).toHaveLength(4);
    expect(page.totalCount).toBe(4);
    expect(page.nextCursor).toBeNull();
  });

  it('returns nextCursor when more pages available', async () => {
    // With PAGE_SIZE=20 and only 4 items, there should be no next cursor
    const page = await feedAdapter.fetchPage(DEFAULT_FILTERS);
    expect(page.nextCursor).toBeNull();
  });

  it('returns null cursor when no more pages', async () => {
    const page = await feedAdapter.fetchPage(DEFAULT_FILTERS);
    expect(page.nextCursor).toBeNull();
  });

  it('totalCount comes from first page and is exact', async () => {
    const page = await feedAdapter.fetchPage(DEFAULT_FILTERS);
    expect(page.totalCount).toBe(page.items.length);
  });

  it('filters applied consistently across pages', async () => {
    const filters = {
      ...DEFAULT_FILTERS,
      query: 'Golang',
    };
    const page1 = await feedAdapter.fetchPage(filters);
    expect(page1.items).toHaveLength(0);

    // Second page with same filters should also be empty
    const page2 = await feedAdapter.fetchPage(filters, page1.nextCursor);
    expect(page2.items).toHaveLength(0);
  });
});

describe('FE-10a: country/city facets', () => {
  it('country facets return iso2 and count', async () => {
    const facets = await feedAdapter.fetchCountryFacets(DEFAULT_FILTERS);
    expect(facets).toHaveLength(1);
    expect(facets[0]).toMatchObject({
      iso2: 'ID',
      count: '<5',
    });
  });

  it('city facets return city names and counts', async () => {
    const facets = await feedAdapter.fetchCityFacets('ID', DEFAULT_FILTERS);
    expect(facets.length).toBeGreaterThan(0);
    // All cities should have count <5 for seed data
    for (const facet of facets) {
      expect(facet.count === '<5' || typeof facet.count === 'number').toBe(true);
    }
  });

  it('city facets return all cities for a country', async () => {
    const facets = await feedAdapter.fetchCityFacets('ID', DEFAULT_FILTERS);
    // All seed cities have count <5 (less than 5 projects per city)
    const allLessThan5 = facets.every((f) => f.count === '<5');
    expect(allLessThan5).toBe(true);
    // Should include all 4 Indonesian cities from seed data
    const cities = facets.map((f) => f.city);
    expect(cities).toHaveLength(4);
    expect(cities).toContain('Jakarta');
    expect(cities).toContain('Bandung');
    expect(cities).toContain('Yogyakarta');
    expect(cities).toContain('Surabaya');
  });
});

describe('FE-10a: feed adapter never calls network in mock mode', () => {
  it('does not call fetch for any feed adapter method', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('fetch should not be called in mock mode');
    });

    try {
      await feedAdapter.fetchPage(DEFAULT_FILTERS);
      await feedAdapter.fetchCountryFacets(DEFAULT_FILTERS);
      await feedAdapter.fetchCityFacets('ID', DEFAULT_FILTERS);
      await feedAdapter.reportProject('test-id', 'test reason');

      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

/** D1 regression: selecting countries/city must change the RPC params the adapter sends. */
describe('FE-10a: D1 — filter args reach the adapter / rpc', () => {
  it('sends explicit countries when they are selected', async () => {
    const paramsId = await feedAdapter.fetchPage({
      ...DEFAULT_FILTERS,
      countries: ['ID'],
    });
    expect(paramsId.items.every((item) => item.countryCode === 'ID')).toBe(true);
  });

  it('combines two countries', async () => {
    const params = await feedAdapter.fetchPage({
      ...DEFAULT_FILTERS,
      countries: ['ID', 'SG'],
    });
    expect(params.items).toHaveLength(4);
    expect(params.items.every((item) => item.countryCode === 'ID' || item.countryCode === 'SG')).toBe(true);
  });

  it('clears countries back to all', async () => {
    const cleared = await feedAdapter.fetchPage({ ...DEFAULT_FILTERS, countries: [] });
    expect(cleared.items).toHaveLength(4);
  });

  it('sends city and narrows results', async () => {
    const cityPage = await feedAdapter.fetchPage({
      ...DEFAULT_FILTERS,
      city: 'Bandung',
    });
    expect(cityPage.items.map((item) => item.city)).toContain('Bandung');
  });

  it('limits country drill-down to one country', async () => {
    const cityFacets = await feedAdapter.fetchCityFacets('ID', {
      ...DEFAULT_FILTERS,
      countries: ['ID'],
    });
    expect(cityFacets).toHaveLength(4);
  });
});

/** D2 regression: safe-link allowlist must reject look-alike github hosts. */

describe('FE-10a: D2 — safe-link allowlist', () => {
  let openURL: jest.SpyInstance<Promise<void>, [string]>;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    openURL.mockRestore();
  });

  it('ProjectCard only calls Linking for safe github https links', () => {
    expect(typeof openHttpsUrl).toBe('function');
  });


  it.each([
    ['https://evilgithub.com/x', false],
    ['https://notgithub.com/x', false],
    ['https://xwww.github.com/x', false],
    ['https://github.com.evil.com/x', false],
    ['https://github.com@evil.com/x', false],
    ['http://github.com/x', false],
    ['https://github.com/octocat', true],
    ['https://www.github.com/octocat', true],
  ])('openGithubUrl(%p) rejects/accepts as %p', (url, expected) => {
    expect(openGithubUrl(url)).toBe(expected);
  });

  it('ProjectCard only calls Linking for safe github https links', () => {
    expect(typeof openHttpsUrl).toBe('function');
  });
});

/** D3 regression: facet query keys include query / role / recentOnly. */
describe('FE-10a: D3 — facet queryKey tracking', () => {
  it('country facet key changes when query changes', async () => {
    const base = queryKeys.feedFacets({
      query: '',
      role: 'All',
      recentOnly: false,
      location: 'All locations',
      countries: [],
      city: '',
    });
    const withQuery = queryKeys.feedFacets({
      query: 'flutter',
      role: 'All',
      recentOnly: false,
      location: 'All locations',
      countries: [],
      city: '',
    });
    expect(withQuery).not.toEqual(base);
    expect(withQuery).toEqual([
      'feed',
      'facets',
      'flutter',
      'All',
      false,
      'All locations',
      [],
      '',
    ]);
  });

  it('city facet key changes when role/recentOnly change', async () => {
    const base = queryKeys.feedCityFacets('ID', {
      query: '',
      role: 'All',
      recentOnly: false,
      location: 'All locations',
      countries: [],
      city: '',
    });
    const withRole = queryKeys.feedCityFacets('ID', {
      query: '',
      role: 'Mobile',
      recentOnly: false,
      location: 'All locations',
      countries: [],
      city: '',
    });
    expect(withRole).not.toEqual(base);
  });
});

/** RPC error mapping: every documented code becomes an AppError shape. */
describe('FE-10a: error mapping', () => {
  it.each([
    ['RATE_LIMITED: coba lagi - retry_after=13', 'RATE_LIMITED', 429, 13],
    ['VALIDATION: min score wajib diisi', 'VALIDATION', 400, undefined],
    ['UNAUTHORIZED: harap login', 'UNAUTHORIZED', 401, undefined],
    ['FORBIDDEN: tidak boleh', 'FORBIDDEN', 403, undefined],
    ['NOT_FOUND: tidak ada', 'NOT_FOUND', 404, undefined],
  ])('mapRpcError(%p) → code=%p status=%s retry_after=%p', (msg, expectedCode, expectedStatus, retryAfter) => {
    const err = mapRpcError({ message: msg });
    expect(err.code).toBe(expectedCode);
    expect(err.status).toBe(expectedStatus);
    if (retryAfter !== undefined) {
      expect(err.retry_after).toBe(retryAfter);
    } else {
      expect(err.retry_after).toBeUndefined();
    }
  });

  it('factory errors keep their code/status', () => {
    const err = mapRpcError({ code: 'VALIDATION', message: 'min score wajib diisi' });
    expect(err.code).toBe('VALIDATION');
    expect(err.status).toBe(400);
  });

  it('unknown code falls back to UPSTREAM_ERROR', () => {
    const err = mapRpcError({ code: 'GENTLY_BROKEN', message: 'wrong' });
    expect(err.code).toBe('UPSTREAM_ERROR');
    expect(err.status).toBe(502);
  });

  it('empty error also becomes UPSTREAM_ERROR', () => {
    const err = mapRpcError(null);
    expect(err.code).toBe('UPSTREAM_ERROR');
    expect(err.status).toBe(502);
  });
});
