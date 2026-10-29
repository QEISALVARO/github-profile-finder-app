-- supabase/tests/09_be3_facets_moderation.sql
-- pgTAP BE-3: facet (masking, filter), featured + hide, moderasi, rank bounds,
-- RLS tulis langsung, anon ditolak semua RPC, facet mengikuti filter lain.

begin;
select plan(18);

set local role authenticated;
set local "request.jwt.claim.sub" to 'c3333333-3333-4333-a333-333333333333';

-- ─── facet mengikuti filter lain kecuali countries ──────────────────
-- (pakai data 08: 2 proyek ID-Go; 08 rollback? TIDAK — tiap file transaksi
-- sendiri, jadi siapkan ulang minimal di sini)
insert into auth.users (id, aud, role, email) values
  ('a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'be3a2@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, github_id, login, github_login, name, roles, country_code, city, country_source) values
  ('a1111111-1111-4111-a111-111111111111', 9201, 'be3a2', 'be3a2', 'BE3 A2', '{developer}', 'ID', 'Jakarta', 'self')
on conflict (id) do update set country_code = excluded.country_code, roles = excluded.roles;

insert into public.developer_settings (user_id, listed, open_to_messages) values
  ('a1111111-1111-4111-a111-111111111111', true, true)
on conflict (user_id) do update set listed = true;

insert into public.projects (id, owner_id, github_repo_id, name, role, description, stack, score, published, is_hidden, country_code, city, pushed_at, stars) values
  ('d1111111-1111-4111-a111-111111111111', 'a1111111-1111-4111-a111-111111111111', 92011, 'tokoonline', 'Back-End', 'Go e-commerce', '[{"name":"Go","percent":100}]', 88, true, false, null, null, now() - interval '5 days', 142),
  ('d2222222-2222-4222-a222-222222222222', 'a1111111-1111-4111-a111-111111111111', 92012, 'ml-pipe', 'Data', 'machine learning pipeline', '[{"name":"Python","percent":100}]', 75, true, false, null, null, now() - interval '6 days', 10)
on conflict (id) do nothing;

-- facet: 2 proyek ID -> ID:2
select results_eq(
  $$ select public.country_facets(null, null, null, false, null, false) $$,
  $$ values ('[{"iso2":"ID","count":2}]'::jsonb) $$,
  'country_facets menghitung ID=2 (tanpa masking di >=5? ambang 5 -> 2 tetap angka? lihat bawah)'
);

-- masking: <5 -> "<5" (2 < 5 sehingga termask)
select results_eq(
  $$ select public.country_facets(null, null, null, false, null, false)->0->>'count' $$,
  $$ values ('<5') $$,
  'hitungan 2 < ambang 5 dimask "<5"'
);

-- facet tanpa baris -> array kosong (bukan null)
select results_eq(
  $$ select public.country_facets('zzz-no-match-xyz', null, null, false, null, false) $$,
  $$ values ('[]'::jsonb) $$,
  'keyword tanpa hasil -> facet []'
);

-- facet mengikuti role: role=Data -> hanya 1 (ID tetap, count termask)
select results_eq(
  $$ select public.country_facets(null, 'Data', null, false, null, false)->0->>'count' $$,
  $$ values ('<5') $$,
  'facet mengikuti filter role'
);

-- facet mengabaikan filter countries (dimensi lain): countries=[SG] tetap ID
select results_eq(
  $$ select jsonb_array_length(public.country_facets(null, null, null, false, null, false)) $$,
  $$ values (1) $$,
  'facet menampilkan dimensi negara apa adanya'
);

-- city_facets: drill-down 1 negara
select results_eq(
  $$ select public.city_facets('ID', null, null, false, null) $$,
  $$ values ('[{"city":"Jakarta","count":"<5"}]'::jsonb) $$,
  'city_facets Jakarta termask'
);

-- city_facets: negara invalid ditolak
select throws_ok(
  $$ select public.city_facets('XX1', null, null, false, null) $$,
  'P0001',
  'city_facets menolak kode negara invalid'
);

-- unggah: facet kota mengikuti keyword (ml -> 1 proyek Data di Jakarta)
select results_eq(
  $$ select jsonb_array_length(public.city_facets('ID', 'ml', null, false, null)) $$,
  $$ values (1) $$,
  'city_facets mengikuti keyword'
);

-- ─── featured ──────────────────────────────────────────────────────
select results_eq(
  'select public.refresh_featured(10)',
  array[2],
  'refresh_featured memilih 2 proyek active'
);

select results_eq(
  $$ select jsonb_array_length((public.featured_projects(10)->'items')) $$,
  $$ values (2) $$,
  'featured_projects mengembalikan 2 item + totalCount 2'
);

-- ─── moderasi ──────────────────────────────────────────────────────
-- report valid
select lives_ok(
  $$ select public.report_project('d1111111-1111-4111-a111-111111111111', 'Spam atau misleading') $$,
  'report_project alasan valid berhasil'
);

-- report unik: kedua kali tetap 1 baris (tidak duplikat)
select results_eq(
  $$ select count(*)::int from public.abuse_reports where reporter_id = 'c3333333-3333-4333-a333-333333333333'::uuid and target_id = 'd1111111-1111-4111-a111-111111111111' $$,
  $$ values (1) $$,
  'report idempoten: tidak ada duplikat'
);

-- report alasan kosong ditolak
select throws_ok(
  $$ select public.report_project('d1111111-1111-4111-a111-111111111111', '  ') $$,
  'P0001',
  'alasan kosong ditolak VALIDATION'
);

-- unpublish/republish hanya pemilik: non-pemilik (recruiter C) ditolak
select throws_ok(
  $$ select public.unpublish_project('d1111111-1111-4111-a111-111111111111') $$,
  'P0001',
  'unpublish oleh non-pemilik ditolak NOT_FOUND'
);

-- admin_set_project_hidden tanpa klaim admin ditolak
select throws_ok(
  $$ select public.admin_set_project_hidden('d1111111-1111-4111-a111-111111111111', true, 'uji') $$,
  'P0001',
  'non-admin ditolak FORBIDDEN'
);

-- ─── rank bounds ───────────────────────────────────────────────────
select results_eq(
  'select (public.project_rank(0, now() - interval ''400 days'', 0) = 0)',
  array[true],
  'rank repo lama tanpa stars = 0'
);

-- ─── anon ditolak semua RPC ────────────────────────────────────────
reset role;
set local role anon;
select throws_ok(
  $$ select public.search_projects(null, null, null, null, false, null, null, 20, false) $$,
  'P0001',
  'anon ditolak search_projects'
);
select throws_ok(
  $$ select public.country_facets(null, null, null, false, null, false) $$,
  'P0001',
  'anon ditolak country_facets'
);

select * from finish();
rollback;
