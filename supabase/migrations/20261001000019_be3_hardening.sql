-- supabase/migrations/20261001000019_be3_hardening.sql
-- BE-3: hardening RLS projects (D3) + rate limit config table.
-- 1. SELECT langsung klien hanya baris visible ATAU milik sendiri.
-- 2. INSERT/UPDATE/DELETE langsung dicabut dari authenticated
--    (semua tulis lewat Edge Function service_role / RPC sempit).
-- 3. featured_projects & audit_log: default-tolak total.
-- 4. app_rate_limits: angka rate limit terdokumentasi per endpoint.

-- Cabut tulis langsung (D3)
revoke all on public.projects from authenticated;
revoke all on public.featured_projects from anon, authenticated;
revoke all on public.audit_log from anon, authenticated;

-- Kebijakan baca: visible ATAU milik sendiri (pemilik perlu baca barisnya
-- sendiri walau belum visible, utk alur publish -> visible)
drop policy if exists "projects: public read" on public.projects;
drop policy if exists "projects: owner read" on public.projects;
drop policy if exists "projects: owner insert" on public.projects;
drop policy if exists "projects: owner update" on public.projects;
drop policy if exists "projects: owner delete" on public.projects;

create policy "projects: visible or owner read"
  on public.projects for select to authenticated
  using (visible = true or owner_id = auth.uid());

-- Tidak ada kebijakan INSERT/UPDATE/DELETE untuk authenticated:
-- dengan RLS aktif + tanpa kebijakan tulis = default-deny total.

-- Tabel config rate limit (terbaca publik, ditulis service_role)
create table if not exists public.app_rate_limits (
  key text primary key,
  max_count int not null,
  window_len interval not null,
  description text
);
alter table public.app_rate_limits enable row level security;
revoke all on public.app_rate_limits from anon, authenticated;
create policy "app_rate_limits: authenticated read"
  on public.app_rate_limits for select to authenticated using (true);

insert into public.app_rate_limits (key, max_count, window_len, description) values
  ('search_projects', 300, '1 hour', 'Pencarian feed proyek per pengguna'),
  ('country_facets', 300, '1 hour', 'Facet negara per pengguna'),
  ('city_facets', 300, '1 hour', 'Facet kota per pengguna'),
  ('list_my_repos', 60, '1 hour', 'Daftar repo milik pemanggil'),
  ('publish_project', 20, '1 hour', 'Publikasi proyek per pengguna'),
  ('report_project', 20, '1 day', 'Laporan moderasi per pengguna')
on conflict (key) do update set
  max_count = excluded.max_count,
  window_len = excluded.window_len,
  description = excluded.description;
