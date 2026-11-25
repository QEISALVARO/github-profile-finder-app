import { CountryFacet, FeedPage } from '@contracts/feed';

import { fetchFeedCountryFacets, fetchFeedPage } from '@/api/feed/api';
import { getSupabase } from '@/lib/supabase';

/**
 * FE-2 + BE-3 gate — `feed.api` wraps the `search_projects` /
 * `country_facets` RPCs:
 *  - `FeedFilters` → named params (PRD v2 §11A pemetaan chip lokasi v1),
 *  - hasil jsonb memuaskan skema SP-0, termasuk fallback field profil nullable,
 *  - setiap kegagalan Postgres menjadi `AppError` — tidak pernah data palsu
 *    (POL-5).
 */

// Mock global (src/lib/__mocks__/supabase.ts) dipakai apa adanya; suite ini
// hanya mengganti hasil `getSupabase()` dengan client yang `rpc`-nya bisa
// diatur per test.
jest.mock('@/lib/supabase');

const mockRpc = jest.fn();
type SupabaseClient = Awaited<ReturnType<typeof getSupabase>>;

beforeEach(() => {
  mockRpc.mockReset();
  jest
    .mocked(getSupabase)
    .mockResolvedValue({ rpc: mockRpc } as unknown as SupabaseClient);
});

const DEFAULT_FILTERS = { query: '', role: 'All', location: 'All locations', recentOnly: false };

/** Bentuk jsonb persis keluaran `search_projects` (BE-3). */
function rpcPage(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        id: '8f2b1c00-0000-4000-8000-000000000001',
        name: 'Nusa Commerce',
        description: 'Toko online lintas platform',
        role: 'Mobile',
        stack: [
          { name: 'Flutter', percent: 65 },
          { name: 'Dart', percent: 35 },
        ],
        countryCode: 'ID',
        city: 'Jakarta',
        score: 96,
        active: true,
        demoUrl: 'https://play.google.com/store',
        demoVerified: true,
        stars: 1280,
        developer: {
          login: 'angga-risky',
          name: 'Angga Risky',
          avatarUrl: 'https://github.com/angga-risky.png',
          availability: 'open_to_work',
        },
      },
    ],
    nextCursor: 'eyJyIjo4NC4yLCJpZCI6IjhmMmIxYzAwIn0',
    totalCount: 41,
    ...overrides,
  };
}

function okRpc(result: unknown) {
  mockRpc.mockResolvedValueOnce({ data: result, error: null });
}

function failRpc(message: string) {
  mockRpc.mockResolvedValueOnce({ data: null, error: { message, code: 'P0001' } });
}

describe('feed api adapter — search_projects params', () => {
  it('sends the default filters as nulls and the page size', async () => {
    okRpc(rpcPage());

    await fetchFeedPage(DEFAULT_FILTERS);

    expect(mockRpc).toHaveBeenCalledWith(
      'search_projects',
      expect.objectContaining({
        p_q: null,
        p_role: null,
        p_countries: null,
        p_city: null,
        p_active_only: false,
        p_lim: 20,
      }),
    );
  });

  it('trims the query and maps the role chip', async () => {
    okRpc(rpcPage());

    await fetchFeedPage({ ...DEFAULT_FILTERS, query: '  golang  ', role: 'Back-End' });

    expect(mockRpc).toHaveBeenCalledWith(
      'search_projects',
      expect.objectContaining({ p_q: 'golang', p_role: 'Back-End' }),
    );
  });

  it('maps the legacy location chip per PRD v2 §11A', async () => {
    okRpc(rpcPage());
    await fetchFeedPage({ ...DEFAULT_FILTERS, location: 'Indonesia' });
    expect(mockRpc).toHaveBeenLastCalledWith(
      'search_projects',
      expect.objectContaining({ p_countries: ['ID'], p_city: null }),
    );

    okRpc(rpcPage());
    await fetchFeedPage({ ...DEFAULT_FILTERS, location: 'Jakarta' });
    expect(mockRpc).toHaveBeenLastCalledWith(
      'search_projects',
      expect.objectContaining({ p_countries: null, p_city: 'Jakarta' }),
    );

    okRpc(rpcPage());
    await fetchFeedPage({ ...DEFAULT_FILTERS, location: 'All locations' });
    expect(mockRpc).toHaveBeenLastCalledWith(
      'search_projects',
      expect.objectContaining({ p_countries: null, p_city: null }),
    );
  });

  it('lets the v2 countries/city filters override the legacy chip', async () => {
    okRpc(rpcPage());

    await fetchFeedPage({
      ...DEFAULT_FILTERS,
      location: 'Indonesia',
      countries: ['SG', 'ID'],
      city: 'Bandung',
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'search_projects',
      expect.objectContaining({ p_countries: ['SG', 'ID'], p_city: 'Bandung' }),
    );
  });

  it('passes the Active 30d toggle through as p_active_only', async () => {
    okRpc(rpcPage());

    await fetchFeedPage({ ...DEFAULT_FILTERS, recentOnly: true });

    expect(mockRpc).toHaveBeenCalledWith(
      'search_projects',
      expect.objectContaining({ p_active_only: true }),
    );
  });
});

describe('feed api adapter — response mapping', () => {
  it('resolves a page that parses against the SP-0 contract', async () => {
    okRpc(rpcPage());

    const page = await fetchFeedPage(DEFAULT_FILTERS);

    expect(() => FeedPage.parse(page)).not.toThrow();
    expect(page.items).toHaveLength(1);
    expect(page.totalCount).toBe(41);
    expect(page.nextCursor).toBe('eyJyIjo4NC4yLCJpZCI6IjhmMmIxYzAwIn0');
    expect(page.items[0].developer.name).toBe('Angga Risky');
  });

  it('falls back to the GitHub login for nullable profile fields', async () => {
    okRpc(
      rpcPage({
        items: [
          {
            ...rpcPage().items[0],
            developer: { login: 'octocat', name: null, avatarUrl: null, availability: 'freelance' },
          },
        ],
      }),
    );

    const page = await fetchFeedPage(DEFAULT_FILTERS);

    expect(() => FeedPage.parse(page)).not.toThrow();
    expect(page.items[0].developer.name).toBe('octocat');
    expect(page.items[0].developer.avatarUrl).toBe('https://github.com/octocat.png');
    expect(page.items[0].developer.availability).toBe('freelance');
  });

  it('rejects a malformed payload instead of rendering an empty page', async () => {
    okRpc(null);

    await expect(fetchFeedPage(DEFAULT_FILTERS)).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      status: 502,
    });
  });
});

describe('feed api adapter — Postgres error mapping', () => {
  it('maps UNAUTHORIZED (RPC butuh JWT)', async () => {
    failRpc('UNAUTHORIZED');

    await expect(fetchFeedPage(DEFAULT_FILTERS)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });

  it('maps RATE_LIMITED and keeps retry_after from the message', async () => {
    failRpc('RATE_LIMITED: retry_after=42');

    await expect(fetchFeedPage(DEFAULT_FILTERS)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      retry_after: 42,
    });
  });

  it('maps VALIDATION (kursor/filter rusak)', async () => {
    failRpc('VALIDATION');

    await expect(fetchFeedPage(DEFAULT_FILTERS)).rejects.toMatchObject({
      code: 'VALIDATION',
      status: 400,
    });
  });

  it('keeps unknown database failures visible as UPSTREAM_ERROR', async () => {
    failRpc('permission denied for table projects');

    await expect(fetchFeedPage(DEFAULT_FILTERS)).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      status: 502,
      message: 'permission denied for table projects',
    });
  });
});

describe('feed api adapter — country_facets', () => {
  it('sends the same filters except countries (facet = dimensi lain)', async () => {
    okRpc([]);

    await fetchFeedCountryFacets({
      ...DEFAULT_FILTERS,
      query: 'ml',
      role: 'Data',
      location: 'Jakarta',
      recentOnly: true,
      countries: ['SG'],
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'country_facets',
      expect.objectContaining({
        p_q: 'ml',
        p_role: 'Data',
        p_city: 'Jakarta',
        p_active_only: true,
      }),
    );
    const args = mockRpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args).not.toHaveProperty('p_countries');
    expect(args).not.toHaveProperty('p_lim');
  });

  it('passes "<5" counts through and parses against the contract', async () => {
    okRpc([
      { iso2: 'ID', count: 12 },
      { iso2: 'SG', count: '<5' },
    ]);

    const facets = await fetchFeedCountryFacets(DEFAULT_FILTERS);

    expect(() => facets.forEach((facet) => CountryFacet.parse(facet))).not.toThrow();
    expect(facets).toEqual([
      { iso2: 'ID', count: 12 },
      { iso2: 'SG', count: '<5' },
    ]);
  });

  it('maps facet RPC failures to AppError', async () => {
    failRpc('RATE_LIMITED: retry_after=7');

    await expect(fetchFeedCountryFacets(DEFAULT_FILTERS)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      retry_after: 7,
    });
  });
});
