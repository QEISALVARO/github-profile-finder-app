-- supabase/migrations/20261001000014_be2_ingestion.sql
-- BE-2: Ingestion GitHub & Scoring v2 Skema Tambahan
-- (1) github_snapshots & analyses updates (facts, expires_at, etag, lowercase check)
-- (2) rate_limits table & check_rate_limit function
-- (3) purge_expired_lookups function (POL-5)
-- (4) RLS default deny for rate_limits

-- ─── 1. Pembaruan github_snapshots ───────────────────────────
alter table public.github_snapshots
  add column if not exists expires_at timestamptz,
  add column if not exists etag_repos text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'github_snapshots_login_lower_check'
  ) then
    alter table public.github_snapshots
      add constraint github_snapshots_login_lower_check check (login = lower(login));
  end if;
end $$;

-- ─── 2. Pembaruan analyses ───────────────────────────────────
alter table public.analyses
  add column if not exists facts jsonb not null default '{}'::jsonb,
  add column if not exists is_lookup boolean not null default true,
  add column if not exists expires_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'analyses_github_login_lower_check'
  ) then
    alter table public.analyses
      add constraint analyses_github_login_lower_check check (github_login = lower(github_login));
  end if;
end $$;

create index if not exists idx_analyses_login_version_created
  on public.analyses (github_login, score_version, created_at desc);

-- ─── 3. Tabel rate_limits ────────────────────────────────────
create table if not exists public.rate_limits (
  user_id       uuid        not null references auth.users on delete cascade,
  key           text        not null,
  window_start  timestamptz not null,
  count         integer     not null default 1,
  primary key (user_id, key, window_start)
);

-- RLS aktif pada rate_limits (default-deny)
alter table public.rate_limits enable row level security;

-- Hanya service_role yang memiliki akses ke rate_limits
revoke all on public.rate_limits from anon, authenticated;

-- Fungsi atomik check_rate_limit
create or replace function public.check_rate_limit(
  p_user    uuid,
  p_key     text,
  p_max     integer,
  p_window  interval
)
returns table(allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_current_count integer;
  v_retry_after integer;
begin
  -- Hitung batas awal jendela waktu saat ini
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window)
  );

  -- Hitung detik sisa hingga jendela waktu berakhir
  v_retry_after := ceil(extract(epoch from (v_window_start + p_window - now())));
  if v_retry_after < 1 then
    v_retry_after := 1;
  end if;

  -- Upsert hitungan pemanggilan dalam jendela waktu ini
  insert into public.rate_limits (user_id, key, window_start, count)
  values (p_user, p_key, v_window_start, 1)
  on conflict (user_id, key, window_start)
  do update set count = public.rate_limits.count + 1
  returning public.rate_limits.count into v_current_count;

  if v_current_count > p_max then
    return query select false, v_retry_after;
  else
    return query select true, 0;
  end if;
end;
$$;

-- Cabut akses publik ke fungsi check_rate_limit (hanya service_role)
revoke all on function public.check_rate_limit(uuid, text, integer, interval) from public, anon, authenticated;
grant execute on function public.check_rate_limit(uuid, text, integer, interval) to service_role;

-- ─── 4. Fungsi Pembersihan Data Kedaluwarsa (POL-5) ──────────
create or replace function public.purge_expired_lookups()
returns table(deleted_snapshots integer, deleted_analyses integer, deleted_rate_limits integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_del_snap integer := 0;
  v_del_ana  integer := 0;
  v_del_rate integer := 0;
begin
  -- Hapus snapshot yang kedaluwarsa
  delete from public.github_snapshots
  where expires_at is not null and expires_at < now();
  get diagnostics v_del_snap = row_count;

  -- Hapus analisis lookup yang kedaluwarsa
  delete from public.analyses
  where expires_at is not null and expires_at < now();
  get diagnostics v_del_ana = row_count;

  -- Hapus rekaman rate limit lama (> 24 jam)
  delete from public.rate_limits
  where window_start < now() - interval '24 hours';
  get diagnostics v_del_rate = row_count;

  return query select v_del_snap, v_del_ana, v_del_rate;
end;
$$;

revoke all on function public.purge_expired_lookups() from public, anon, authenticated;
grant execute on function public.purge_expired_lookups() to service_role;
