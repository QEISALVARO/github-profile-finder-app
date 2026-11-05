-- supabase/tests/10_be3_projects_rpc_only.sql
-- A3: membuktikan `projects` tidak dapat dibaca/ditulis langsung oleh klien
-- (tanpa GRANT + tanpa kebijakan), dan satu-satunya jalur baca adalah RPC.

begin;
set search_path = public, extensions;
select plan(11);

-- ─── 1. Privilese tabel langsung ─────────────────────────────────────
select ok(
  not has_table_privilege('authenticated', 'public.projects', 'SELECT'),
  'authenticated tanpa GRANT SELECT langsung pada projects'
);

select ok(
  not has_table_privilege('anon', 'public.projects', 'SELECT'),
  'anon tanpa GRANT SELECT langsung pada projects'
);

select ok(
  not has_table_privilege('authenticated', 'public.projects', 'INSERT'),
  'authenticated tanpa GRANT INSERT langsung pada projects'
);

select ok(
  not has_table_privilege('authenticated', 'public.projects', 'UPDATE'),
  'authenticated tanpa GRANT UPDATE langsung pada projects'
);

select ok(
  not has_table_privilege('authenticated', 'public.projects', 'DELETE'),
  'authenticated tanpa GRANT DELETE langsung pada projects'
);

-- ─── 2. Tidak ada kebijakan inert tersisa ────────────────────────────
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'projects'),
  0,
  'projects tidak memiliki kebijakan RLS yang menyesatkan (0 kebijakan)'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.projects'::regclass),
  'RLS projects tetap aktif (default-deny)'
);

-- service_role tetap bisa membaca (Edge Function memakai service role).
select ok(
  has_table_privilege('service_role', 'public.projects', 'SELECT'),
  'service_role tetap memiliki SELECT untuk Edge Function'
);

-- ─── 3. Akses langsung ditolak, RPC tetap bekerja ────────────────────
insert into auth.users (id, aud, role, email) values
  ('a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'rpc_only_a@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, github_id, login, github_login, name, roles, country_code, country_source)
values ('a1111111-1111-4111-a111-111111111111', 9301, 'rpc_only_a', 'rpc_only_a', 'RPC Only A', '{developer}', 'ID', 'self')
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" to 'a1111111-1111-4111-a111-111111111111';

select throws_ok(
  $$ select * from public.projects $$,
  '42501',
  null,
  'authenticated ditolak membaca projects langsung (permission denied)'
);

select lives_ok(
  $$ select public.search_projects(null, null, null, null, false, null, null, 20, false) $$,
  'RPC search_projects tetap dapat dipanggil authenticated (jalur baca resmi)'
);

select ok(
  (public.search_projects(null, null, null, null, false, null, null, 20, false)) ? 'items',
  'keluaran RPC berbentuk FeedPage (memuat kunci items)'
);

select * from finish();
rollback;
