// ---------------------------------------------------------------------------
// FE-10a — feed `api` adapter.
//
// Calls the BE-3 RPCs (`search_projects`, `country_facets`, `city_facets`,
// `report_project`) over Supabase. Every response is validated with the Zod
// contract schema before it reaches the UI — a shape mismatch becomes
// `UPSTREAM_ERROR`, never silently invented data (POL-5).
//
// Parameter naming follows `docs/backend/feed.md`: `p_q`, `p_role`, `p_countries`,
// `p_city`, `p_active_only`, `p_min_score`, `p_cursor`, `p_lim`, `p_include_unknown`.
// ---------------------------------------------------------------------------

import type { CityFacet, CountryFacet, FeedPage } from '@/api/contracts';

import { FeedPage as FeedPageSchema } from '@contracts/feed';
import { CountryFacet as CountryFacetSchema } from '@contracts/feed';
import { CityFacet as CityFacetSchema } from '@contracts/projects';
import { getSupabase } from '@/lib/supabase';
import { apiNotReady, type AppError, MissingEnvironmentError } from '@/api/errors';
import type { FeedFilters } from '@/lib/feed';

function mapFilters(filters: FeedFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (filters.query) params.p_q = filters.query;
  // role: 'All' → null (server treats null as "all roles"); anything else → the role string.
  params.p_role = filters.role === 'All' ? null : filters.role;
  // countries: [] → null (server treats null as "all countries"); ["ID"] → ["ID"].
  if (filters.countries && filters.countries.length > 0) {
    params.p_countries = filters.countries;
  } else {
    params.p_countries = null;
  }
  if (filters.city) params.p_city = filters.city;
  params.p_active_only = filters.recentOnly;
  params.p_min_score = null;
  if (filters.city) params.p_include_unknown = false;
  return params;
}

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

export async function fetchFeedPage(filters: FeedFilters, cursor?: string | null): Promise<FeedPage> {
  const supabase = await getFeedSupabase();
  const params = mapFilters(filters);
  if (cursor) params.p_cursor = cursor;
  params.p_lim = 20;

  const { data, error } = await supabase.rpc('search_projects', params);

  if (error) throw mapRpcError(error);
  if (!data) throw { code: 'UPSTREAM_ERROR', message: 'Respons kosong dari server.', status: 502 };

  const parsed = FeedPageSchema.safeParse(data);
  if (!parsed.success) {
    console.warn('[feed.api] search_projects bentuk salah:', parsed.error.flatten());
    throw { code: 'UPSTREAM_ERROR', message: 'Bentuk respons tidak sesuai kontrak.', status: 502 };
  }

  return parsed.data;
}

export async function fetchFeedCountryFacets(filters: FeedFilters): Promise<CountryFacet[]> {
  const supabase = await getFeedSupabase();
  const params = mapFilters(filters);

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
  const params = mapFilters(filters);
  params.p_countries = [country];

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

function mapRpcError(error: { message?: string; code?: string } | null): AppError {
  if (!error) return { code: 'UPSTREAM_ERROR', message: 'Tidak ada respons dari server.', status: 502 };

  const msg = error.message ?? '';
  const code = error.code ?? '';

  // Backend menulis kode di awal pesan: `RATE_LIMITED: ... retry_after=N`.
  if (msg.startsWith('RATE_LIMITED')) {
    const wait = extractRetryAfter(msg);
    return { code: 'RATE_LIMITED', message: msg, status: 429, retry_after: wait };
  }
  if (msg.startsWith('VALIDATION') || code === 'VALIDATION') {
    return { code: 'VALIDATION', message: msg, status: 400 };
  }
  if (msg.startsWith('UNAUTHORIZED') || code === 'UNAUTHORIZED') {
    return { code: 'UNAUTHORIZED', message: msg, status: 401 };
  }
  if (msg.startsWith('FORBIDDEN') || code === 'FORBIDDEN') {
    return { code: 'FORBIDDEN', message: msg, status: 403 };
  }
  if (msg.startsWith('NOT_FOUND') || code === 'NOT_FOUND') {
    return { code: 'NOT_FOUND', message: msg, status: 404 };
  }

  return { code: 'UPSTREAM_ERROR', message: msg || 'Gagal terhubung ke server.', status: 502 };
}

function extractRetryAfter(msg: string): number {
  const m = msg.match(/retry_after[=:]\s*(\d+)/i);
  return m ? Number(m[1]) : 60;
}
