import { getSupabase } from '@/lib/supabase';
import type { Availability } from '@/store/useAuthStore';

// ---------------------------------------------------------------------------
// PRD v2 §6 — RPC onboarding & profil (SECURITY INVOKER, milik auth.uid()).
// Nama + parameter mengikuti supabase/migrations/20261001000012_rpcs.sql.
// Pesan error Postgres (VALIDATION:/POL9_*) diterjemahkan ke kalimat UI.
// ---------------------------------------------------------------------------

export interface RemoteResult {
  error: string | null;
  /** Kode kegagalan yang perlu ditangani pemanggil (mis. sesi kedaluwarsa). */
  code?: 'UNAUTHORIZED';
}

export interface OnboardingInput {
  roles: ('developer' | 'recruiter')[];
  countryCode?: string | null;
  city?: string | null;
  company?: string | null;
  title?: string | null;
  targetCountries?: string[];
}

export async function completeOnboardingRemote(input: OnboardingInput): Promise<RemoteResult> {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('complete_onboarding', {
    p_roles: input.roles,
    p_country_code: input.countryCode ?? null,
    p_city: input.city ?? null,
    p_company: input.company ?? null,
    p_title: input.title ?? null,
    p_target_countries: input.targetCountries ?? [],
  });
  return rpcResult(error);
}

export async function setCountryRemote(
  countryCode: string | null,
  city?: string | null,
): Promise<RemoteResult> {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('set_country', {
    p_country_code: countryCode,
    p_city: city ?? null,
  });
  return rpcResult(error);
}

export interface DeveloperSettingsInput {
  listed?: boolean;
  openToMessages?: boolean;
  availability?: Availability;
  headline?: string | null;
}

export async function updateDeveloperSettingsRemote(
  input: DeveloperSettingsInput,
): Promise<RemoteResult> {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('update_developer_settings', {
    p_listed: input.listed ?? null,
    p_open_to_messages: input.openToMessages ?? null,
    p_availability: input.availability ?? null,
    p_headline: input.headline ?? null,
  });
  return rpcResult(error, true);
}

export interface RecruiterProfileInput {
  company?: string | null;
  title?: string | null;
  targetCountries?: string[] | null;
}

export async function updateRecruiterProfileRemote(
  input: RecruiterProfileInput,
): Promise<RemoteResult> {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('update_recruiter_profile', {
    p_company: input.company ?? null,
    p_title: input.title ?? null,
    p_target_countries: input.targetCountries ?? null,
  });
  return rpcResult(error);
}

type RpcError = { message: string } | null;

function rpcResult(error: RpcError, isListing = false): RemoteResult {
  if (!error) return { error: null };
  const message = error.message ?? '';
  if (message.includes('POL9_COUNTRY_REQUIRED')) {
    return { error: 'Pilih negara domisili dulu sebelum mengaktifkan listing.' };
  }
  if (message.includes('VALIDATION: company is required')) {
    return { error: 'Nama perusahaan wajib diisi untuk peran recruiter.' };
  }
  if (message.includes('VALIDATION: invalid country_code')) {
    return { error: 'Kode negara tidak dikenal. Pilih dari daftar.' };
  }
  if (message.includes('UNAUTHORIZED')) {
    return {
      error: isListing
        ? 'Sesi berakhir. Masuk kembali untuk mengubah visibilitas.'
        : 'Sesi berakhir. Masuk kembali.',
      code: 'UNAUTHORIZED',
    };
  }
  return { error: 'Perubahan gagal disimpan. Coba lagi.' };
}
