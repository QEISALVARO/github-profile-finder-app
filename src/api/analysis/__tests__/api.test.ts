import type { AnalysisVM, ErrorBody } from '@/api/contracts';
import { buildAnalysisVM } from '@/api/analysis';
import { fetchAnalysis } from '@/api/analysis/api';
import { getSupabase } from '@/lib/supabase';

/**
 * FE-2 gate — `analysis.api` wraps the `analyze-developer` Edge Function:
 * fresh / cache / stale pass through, and every failure becomes an AppError
 * (never a fabricated VM, POL-5).
 */

// Mock global (src/lib/__mocks__/supabase.ts) dipakai apa adanya; suite ini
// hanya mengganti hasil `getSupabase()` dengan client yang `invoke`-nya bisa
// diatur per test. Tidak ada stub ad-hoc yang menimpa seluruh modul.
jest.mock('@/lib/supabase');

const mockInvoke = jest.fn();
type SupabaseClient = Awaited<ReturnType<typeof getSupabase>>;

beforeEach(() => {
  mockInvoke.mockReset();
  jest
    .mocked(getSupabase)
    .mockResolvedValue({ functions: { invoke: mockInvoke } } as unknown as SupabaseClient);
});

const BASE_VM = buildAnalysisVM({ login: 'octocat' });

function vmWith(source: AnalysisVM['source'], extra: Partial<AnalysisVM> = {}): AnalysisVM {
  return { ...BASE_VM, source, ...extra };
}

/** Supabase `FunctionsHttpError` shape: status + a Response in `context`. */
function httpError(status: number, body: ErrorBody): Error {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
  return Object.assign(new Error(`Edge Function returned ${status}`), {
    status,
    context: response,
  });
}

describe('analysis api adapter', () => {
  it('returns a fresh VM', async () => {
    const vm = vmWith('fresh');
    mockInvoke.mockResolvedValueOnce({ data: vm, error: null });

    await expect(fetchAnalysis({ login: 'octocat' })).resolves.toEqual(vm);
    expect(mockInvoke).toHaveBeenCalledWith('analyze-developer', {
      body: { login: 'octocat', force: false },
    });
  });

  it('passes cached results through unchanged', async () => {
    const vm = vmWith('cache');
    mockInvoke.mockResolvedValueOnce({ data: vm, error: null });

    const result = await fetchAnalysis({ login: 'octocat' });
    expect(result.source).toBe('cache');
  });

  it('keeps staleSince so the screen can show the banner', async () => {
    const vm = vmWith('stale', { staleSince: '2026-10-27T09:00:00.000Z' });
    mockInvoke.mockResolvedValueOnce({ data: vm, error: null });

    const result = await fetchAnalysis({ login: 'octocat' });
    expect(result.source).toBe('stale');
    expect(result.staleSince).toBe('2026-10-27T09:00:00.000Z');
  });

  it('maps 404 to NOT_FOUND', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: httpError(404, { code: 'NOT_FOUND', message: 'Profil tidak ditemukan.' }),
    });

    await expect(fetchAnalysis({ login: 'ghost' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('maps 429 to RATE_LIMITED and keeps retry_after', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: httpError(429, {
        code: 'RATE_LIMITED',
        message: 'Batas analisis tercapai.',
        retry_after: 30,
      }),
    });

    await expect(fetchAnalysis({ login: 'octocat' })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      retry_after: 30,
    });
  });

  it('maps 502 to UPSTREAM_ERROR without inventing data', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: httpError(502, { code: 'UPSTREAM_ERROR', message: 'GitHub sedang gangguan.' }),
    });

    await expect(fetchAnalysis({ login: 'octocat' })).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      status: 502,
    });
  });

  it('validates the login before calling the Edge Function', async () => {
    await expect(fetchAnalysis({ login: 'not a login!' })).rejects.toMatchObject({
      code: 'VALIDATION',
      status: 400,
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('never resolves with fake data when the invocation fails', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: httpError(500, { code: 'UPSTREAM_ERROR', message: 'boom' }),
    });

    await expect(fetchAnalysis({ login: 'octocat' })).rejects.toBeTruthy();
  });
});
