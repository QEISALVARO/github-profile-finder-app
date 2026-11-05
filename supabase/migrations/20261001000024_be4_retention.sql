-- supabase/migrations/20261001000024_be4_retention.sql
-- BE-4 (POL-5/§14): retensi analisis mengikuti status listing developer.
--
-- - listed = true  -> analisis untuk login itu menjadi permanen
--   (is_lookup = false, expires_at = NULL) dan snapshot tidak kedaluwarsa.
-- - listed = false -> analisis kembali menjadi lookup (expires_at +
--   7 hari) dan snapshot kedaluwarsa dalam 24 jam.
--
-- Juga: indeks pendukung Discover dan pembersihan pipeline milik recruiter
-- lain ketika developer menghapus akun (D5).

-- ─── 1. Trigger retensi ──────────────────────────────────────────────
create or replace function public.sync_analysis_retention()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_login text;
begin
  select lower(p.github_login) into v_login
  from public.profiles p
  where p.id = new.user_id;

  if v_login is null then
    return new;
  end if;

  if new.listed is true then
    update public.analyses
    set is_lookup = false, expires_at = null
    where github_login = v_login;

    update public.github_snapshots
    set expires_at = null
    where login = v_login;
  else
    update public.analyses
    set is_lookup = true, expires_at = now() + interval '7 days'
    where github_login = v_login;

    update public.github_snapshots
    set expires_at = now() + interval '24 hours'
    where login = v_login;
  end if;

  return new;
end;
$func$;

comment on function public.sync_analysis_retention() is
  'POL-5: listed -> analisis permanen; unlisted -> lookup 7 hari, snapshot 24 jam.';

drop trigger if exists developer_settings_retention on public.developer_settings;
create trigger developer_settings_retention
  after insert or update of listed on public.developer_settings
  for each row execute function public.sync_analysis_retention();

-- ─── 2. Hapus entri pipeline saat developer menghapus akun (D5) ──────
create or replace function public.purge_pipeline_for_deleted_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  if old.github_login is not null then
    delete from public.pipeline_entries
    where github_login = lower(old.github_login);
  end if;
  return old;
end;
$func$;

comment on function public.purge_pipeline_for_deleted_profile() is
  'D5: entri pipeline milik recruiter lain yang merujuk login akun terhapus ikut dihapus.';

drop trigger if exists profiles_purge_pipeline on public.profiles;
create trigger profiles_purge_pipeline
  after delete on public.profiles
  for each row execute function public.purge_pipeline_for_deleted_profile();

-- ─── 3. Indeks pendukung Discover (hindari N+1) ──────────────────────
-- Indeks (github_login, score_version, created_at desc) sudah ada sejak 014;
-- indeks parsial ini mempersempit ke analisis v2 untuk "latest per login".
create index if not exists analyses_login_v2_created_idx
  on public.analyses (github_login, created_at desc)
  where score_version = 2;

create index if not exists profiles_lower_login_idx
  on public.profiles (lower(github_login));

create index if not exists developer_settings_listed_idx
  on public.developer_settings (user_id)
  where listed = true;

-- ─── 4. View internal: satu baris terbaru per login ──────────────────
-- security_invoker = true agar view tidak menjadi jalur bypass RLS; akses
-- klien dicabut, view hanya dipakai fungsi SECURITY DEFINER.
create or replace view public.latest_analysis_v2
  with (security_invoker = true) as
select distinct on (a.github_login)
  a.github_login,
  a.authenticity,
  a.confidence,
  a.score_version,
  a.inferred_role,
  a.primary_language,
  a.language_stats,
  a.frameworks,
  a.metrics,
  a.created_at
from public.analyses a
order by a.github_login, a.created_at desc;

comment on view public.latest_analysis_v2 is
  'BE-4 internal: analisis TERBARU per login (termasuk bila versinya bukan 2). Klien tidak punya akses.';

revoke all on public.latest_analysis_v2 from anon, authenticated;

-- ─── 5. purge_expired_lookups: analisis developer listed aman ─────────
-- Versi 014 menghapus semua baris ber-expires_at lampau. Developer yang
-- sedang listed tidak boleh kehilangan analisisnya walau ada expires_at sisa
-- (mis. baru di-unlist lalu di-list kembali). Fungsi diganti dengan signature
-- yang sama + pengecualian listing.
create or replace function public.purge_expired_lookups()
returns table(deleted_snapshots integer, deleted_analyses integer, deleted_rate_limits integer)
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_del_snap integer := 0;
  v_del_ana  integer := 0;
  v_del_rate integer := 0;
begin
  delete from public.github_snapshots g
  where g.expires_at is not null and g.expires_at < now()
    and not exists (
      select 1
      from public.profiles p
      join public.developer_settings ds on ds.user_id = p.id
      where lower(p.github_login) = g.login and ds.listed = true
    );
  get diagnostics v_del_snap = row_count;

  delete from public.analyses a
  where a.expires_at is not null and a.expires_at < now()
    and not exists (
      select 1
      from public.profiles p
      join public.developer_settings ds on ds.user_id = p.id
      where lower(p.github_login) = a.github_login and ds.listed = true
    );
  get diagnostics v_del_ana = row_count;

  delete from public.rate_limits
  where window_start < now() - interval '24 hours';
  get diagnostics v_del_rate = row_count;

  return query select v_del_snap, v_del_ana, v_del_rate;
end;
$func$;

comment on function public.purge_expired_lookups() is
  'POL-5: hapus snapshot/analisis kedaluwarsa, KECUALI login developer yang sedang listed.';
