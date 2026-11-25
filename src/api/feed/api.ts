// ---------------------------------------------------------------------------
// FE-10a + BE-3 — feed `api` adapter.
//
// Calls the BE-3 RPCs (`search_projects`, `country_facets`, `city_facets`,
// `report_project`) over Supabase. Every response is validated with the Zod
// contract schema before it reaches the UI — a shape mismatch becomes
// `UPSTREAM_ERROR`, never silently invented data (POL-5).
//
// Parameter naming follows `docs/backend/feed.md`: `p_q`, `p_role`,
// `p_countries`, `p_city`, `p_active_only`, `p_min_score`, `p_cursor`,
// `p_lim`, `p_include_unknown`.
//
// Hasil integrasi FE-10a × TASK 2 — dua koreksi penting:
//   1. `country_facets`/`city_facets` TIDAK menerima `p_countries`
//      (migrasi 20261001000021): facet memantau dimensi lain / drill-down
//      kota per negara, jadi parameter dikirim persis sesuai signature —
//      tanpa ini PostgREST menjawab PGRST202 saat live.
//   2. `profiles.name`/`avatar_url` nullable di DB (migrasi …020 tidak
//      coalesce) dikoaleskan ke identitas ASLI (login, endpoint GitHub
//      canonical) SEBELUM validasi Zod — bukan ditolak dan bukan diarang
//      (POL-5).
// ---------------------------------------------------------------------------

import type { CityFacet, CountryFacet, FeedItem, FeedPage } from '@/api/contracts';

import { FeedPage as FeedPageSchema, CountryFacet as CountryFacetSchema } from '@contracts/feed';
import { CityFacet as CityFacetSchema } from '@contracts/projects';
import { getSupabase } from '@/lib/supabase';
import { apiNotReady, mapRpcError, MissingEnvironmentError } from '@/api/errors';
import type { FeedFilters } from '@/lib/feed';
import { openGithubUrl, openHttpsUrl } from '@/lib/links';
import { queryKeys } from '@/api/queryKeys';

// --- RPC parameter mapping (D1, D4) ---

function mapFilters(filters: FeedFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  // Trim whitespace so stray spaces from the search box never reach the backend
  // tsquery (PRD v2 §11A / TASK 2: query → p_q trim, kosong → null).
  if (filters.query?.trim()) params.p_q = filters.query.trim();
  // Role: 'All' is normalized to null so the server treats it as "all roles";
  // everything else is sent verbatim. Related D4 gate: 'All' always routes through null.
  params.p_role = filters.role === 'All' ? null : filters.role;
  // Countries: an explicit non-empty list is sent as-is; empty/undefined becomes null
  // so the server treats it as "all countries". Related D4 gate: empty → null always.
  if (filters.countries && filters.countries.length > 0) {
    params.p_countries = filters.countries;
  } else {
    params.p_countries = null;
  }
  if (filters.city?.trim()) params.p_city = filters.city.trim();
  params.p_active_only = filters.recentOnly;
  // Keep unknown-score filtering consistent independent of whether a city is chosen.
  params.p_include_unknown = false;
  params.p_min_score = null;
  return params;
}

/**
 * `country_facets(p_q, p_role, p_city, p_active_only, p_min_score,
 * p_include_unknown)` — sama dengan search KECUALI countries (kontrak BE-3:
 * facet mencerminkan dimensi lain), jadi `p_countries` tidak boleh ikut.
 */
function countryFacetArgs(filters: FeedFilters): Record<string, unknown> {
  const params = mapFilters(filters);
  delete params.p_countries;
  return params;
}

/**
 * `city_facets(p_country, p_q, p_role, p_active_only, p_min_score)` —
 * drill-down kota untuk SATU negara; signature tidak punya `p_city`,
 * `p_include_unknown`, maupun `p_countries`.
 */
function cityFacetArgs(country: string, filters: FeedFilters): Record<string, unknown> {
  const params = mapFilters(filters);
  delete params.p_countries;
  delete params.p_city;
  delete params.p_include_unknown;
  params.p_country = country;
  return params;
}

// --- re-export test-only symbols (D2/D3/error-mapping tests) ---

export { mapRpcError, openGithubUrl, openHttpsUrl, queryKeys };

// --- Supabase accessor ---

async function getFeedSupabase() {
  try {
    return await getSupabase();
  } catch (error) {
    if (error instanceof MissingEnvironmentError) {
      throw apiNotReady('feed', 'Menunggu konfigurasi Supabase (BE-3).');
    }
    throw error;
  }
}

// --- nullable profile normalisation (POL-5) ---

/** `profiles.name` / `avatar_url` nullable; the contract (and Zod) is not. */
type RpcFeedItem = Omit<FeedItem, 'developer'> & {
  developer: Omit<FeedItem['developer'], 'name' | 'avatarUrl'> & {
    name: string | null;
    avatarUrl: string | null;
  };
};

/**
 * Koalesce dua field profil nullable ke identitas asli SEBELUM Zod:
 * `name` → `login`, `avatarUrl` → endpoint GitHub canonical untuk login
 * tersebut (pola yang sama dengan seed). Payload yang bukan objek/halaman
 * dilewatkan apa adanya supaya Zod tetap menolaknya (bukan dianggap kosong).
 */
function normaliseNullableDeveloper(data: unknown): unknown {
  const page = data as { items?: unknown } | null | undefined;
  if (page === null || typeof page !== 'object' || !Array.isArray(page.items)) return data;
  return {
    ...page,
    items: page.items.map((raw) => {
      const item = raw as Partial<RpcFeedItem> | null;
      if (item === null || typeof item !== 'object') return raw;
      const developer = item.developer;
      if (developer === null || typeof developer !== 'object') return raw;
      return {
        ...item,
        developer: {
          ...developer,
          name: developer.name ?? developer.login,
          avatarUrl: developer.avatarUrl ?? `https://github.com/${developer.login}.png`,
        },
      };
    }),
  };
}

// --- public adapter API ---

export async function fetchFeedPage(filters: FeedFilters, cursor?: string | null): Promise<FeedPage> {
  const supabase = await getFeedSupabase();
  const params = mapFilters(filters);
  if (cursor) params.p_cursor = cursor;
  params.p_lim = 20;

  const { data, error } = await supabase.rpc('search_projects', params);

  if (error) throw mapRpcError(error);
  if (!data) throw { code: 'UPSTREAM_ERROR', message: 'Respons kosong dari server.', status: 502 };

  const parsed = FeedPageSchema.safeParse(normaliseNullableDeveloper(data));
  if (!parsed.success) {
    console.warn('[feed.api] search_projects bentuk salah:', parsed.error.flatten());
    throw { code: 'UPSTREAM_ERROR', message: 'Bentuk respons tidak sesuai kontrak.', status: 502 };
  }

  return parsed.data;
}

export async function fetchFeedCountryFacets(filters: FeedFilters): Promise<CountryFacet[]> {
  const supabase = await getFeedSupabase();
  const params = countryFacetArgs(filters);

  const { data, error } = await supabase.rpc('country_facets', params);

  if (error) throw mapRpcError(error);
  if (!data) throw { code: 'UPSTREAM_ERROR', message: 'Respons kosong dari server.', status: 502 };

  const parsed = CountryFacetSchema.array().safeParse(data);
  if (!parsed.success) {
    console.warn('[feed.api] country_facets bentuk salah:', parsed.error.flatten());
    throw { code: 'UPSTREAM_ERROR', message: 'Bentuk respons tidak sesuai kontrak.', status: 502 };
  }

  return parsed.data;
}

export async function fetchFeedCityFacets(country: string, filters: FeedFilters): Promise<CityFacet[]> {
  const supabase = await getFeedSupabase();
  const params = cityFacetArgs(country, filters);

  const { data, error } = await supabase.rpc('city_facets', params);

  if (error) throw mapRpcError(error);
  if (!data) throw { code: 'UPSTREAM_ERROR', message: 'Respons kosong dari server.', status: 502 };

  const parsed = CityFacetSchema.array().safeParse(data);
  if (!parsed.success) {
    console.warn('[feed.api] city_facets bentuk salah:', parsed.error.flatten());
    throw { code: 'UPSTREAM_ERROR', message: 'Bentuk respons tidak sesuai kontrak.', status: 502 };
  }

  return parsed.data;
}

export async function reportProject(projectId: string, reason: string): Promise<boolean> {
  const supabase = await getFeedSupabase();
  const { error } = await supabase.rpc('report_project', { p_project_id: projectId, p_reason: reason });

  if (error) throw mapRpcError(error);
  // Backend returns void on success; absence of error = accepted.
  return true;
}
