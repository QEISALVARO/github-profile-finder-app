import type { AnalysisVM, ErrorBody } from '../../contracts/src/types.ts';
import { getSupabase } from '@/lib/supabase';
import type { GithubRepo, GithubUser } from '@/types';

// ---------------------------------------------------------------------------
// PRD v2 §8 — analyze-developer via Supabase Edge Function.
// Menggantikan panggilan GitHub langsung dari klien (PRD §5.2, dihapus di R2):
// token GitHub hanya hidup di server, client memakai sesi Supabase.
// Kegagalan upstream TIDAK PERNAH mengarang data (POL-5): tanpa cache lama,
// error diteruskan apa adanya untuk ditampilkan sebagai state error.
// ---------------------------------------------------------------------------

export const ANALYZE_STALE_MESSAGE =
  'Data GitHub sedang gangguan — menampilkan analisis terakhir yang tersimpan.';

export const ANALYZE_NOT_FOUND_MESSAGE = 'Profil tidak ditemukan. Periksa kembali username.';

export type AnalyzeError = ErrorBody & { status: number };

export function isAnalyzeError(value: unknown): value is AnalyzeError {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.code === 'string' && typeof record.status === 'number';
}

/** Login GitHub valid (aturan yang sama dengan BE): alfanumerik + hyphen tunggal. */
export function isValidLogin(login: string): boolean {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(login.trim());
}

type InvokeOk = { data: AnalysisVM; error: null; stale: boolean };
type InvokeErr = { data: null; error: AnalyzeError; stale: false };

/**
 * Panggil Edge Function analyze-developer dan kembalikan AnalysisVM.
 * `stale=true` berarti GitHub gangguan dan BE mengembalikan cache lama —
 * UI wajib menampilkan banner stale, bukan angka seolah segar.
 */
export async function analyzeDeveloper(
  login: string,
  options: { force?: boolean; signal?: AbortSignal } = {},
): Promise<InvokeOk | InvokeErr> {
  const normalized = login.trim().toLowerCase();
  if (!isValidLogin(normalized)) {
    return {
      data: null,
      error: { code: 'VALIDATION', message: ANALYZE_NOT_FOUND_MESSAGE, status: 400 },
      stale: false,
    };
  }

  // Lazy client: in mock-only mode this module is never called, so no client
  // and no environment variables are required.
  const supabase = await getSupabase();

  const { data, error } = await supabase.functions.invoke<AnalysisVM>('analyze-developer', {
    body: { login: normalized, force: options.force ?? false },
  });

  if (!error) {
    // functions.invoke menaruh non-2xx ke `error`; 2xx (fresh/cache/stale)
    // selalu membawa AnalysisVM beserta field `source`-nya sendiri.
    return { data: data as AnalysisVM, error: null, stale: (data as AnalysisVM).source === 'stale' };
  }

  // Supabase FunctionsHttpError membawa Response di `context`.
  const context = (error as { context?: unknown }).context;
  let body: Partial<ErrorBody> | null = null;
  let status = 502;
  if (context instanceof Response) {
    status = context.status;
    try {
      body = (await context.clone().json()) as Partial<ErrorBody>;
    } catch {
      body = null;
    }
  } else if (typeof (error as { status?: unknown }).status === 'number') {
    status = (error as { status: number }).status;
  }

  const code = body?.code;
  const known: AnalyzeError['code'][] = [
    'NOT_FOUND',
    'RATE_LIMITED',
    'UPSTREAM_ERROR',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'VALIDATION',
  ];
  return {
    data: null,
    error: {
      code: known.includes(code as AnalyzeError['code'])
        ? (code as AnalyzeError['code'])
        : 'UPSTREAM_ERROR',
      message:
        typeof body?.message === 'string' && body.message.length > 0
          ? body.message
          : 'Gagal menghubungi layanan analisis. Coba lagi.',
      ...(typeof body?.retry_after === 'number' ? { retry_after: body.retry_after } : {}),
      status,
    },
    stale: false,
  };
}

/** Pesan error BE → kalimat yang ditampilkan di slot error feed (FR-E9). */
export function analyzeErrorMessage(error: AnalyzeError): string {
  switch (error.code) {
    case 'NOT_FOUND':
    case 'VALIDATION':
      return ANALYZE_NOT_FOUND_MESSAGE;
    case 'RATE_LIMITED':
      return typeof error.retry_after === 'number'
        ? `Batas analisis tercapai. Coba lagi dalam ${error.retry_after} detik.`
        : 'Batas analisis tercapai. Coba lagi nanti.';
    case 'FORBIDDEN':
      return 'Analisis profil ini memerlukan akses recruiter.';
    case 'UNAUTHORIZED':
      return 'Sesi berakhir. Masuk kembali untuk menganalisis.';
    default:
      return 'Gagal menghubungi layanan analisis. Coba lagi.';
  }
}

// --- Adapter AnalysisVM → tipe layar lama (sementara, R2) -------------------
// Layar Analysis masih membaca GithubUser/GithubRepo dari store. Adapter ini
// memetakan respons BE ke bentuk itu TANPA mengarang angka: heatmap, tier,
// confidence, dan evidence dibaca langsung dari VM oleh komponen.

/** AnalysisVM.repos → GithubRepo[] (dipakai tes & dev fixture lama). */
export function vmToGithubRepos(vm: AnalysisVM): GithubRepo[] {
  return vm.repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    description: repo.description,
    language: repo.language,
    stargazers_count: 0,
    fork: repo.isFork,
    homepage: repo.hasVerifiedDemo ? repo.htmlUrl : null,
    html_url: repo.htmlUrl,
  }));
}

/** AnalysisVM.user → GithubUser untuk ProfileCard. */
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
