-- supabase/tests/14_be4_bias_v1.sql
-- BE-4 (AIR-4, audit L2): bias_report_v1 — admin-only, hitungan ambang skor,
-- masking kelompok kecil, validasi parameter, tanpa identitas.

begin;
set search_path = public, extensions;
select plan(13);

-- Determinitas: DB lokal bisa berisi seed dev/bench, sedangkan RPC
-- mengagregasi seluruh tabel. Transaksi + rollback membuat pembersihan ini aman.
delete from public.analyses;
delete from public.profiles;

-- ─── Populasi: 30 ID (semua 80) + 30 SG (semua 60) ───────────────────
insert into auth.users (id, aud, role, email)
select md5('biasv1' || i)::uuid, 'authenticated', 'authenticated', 'biasv1' || i || '@test.com'
from generate_series(1, 60) i
on conflict (id) do nothing;

insert into public.profiles (id, github_id, login, github_login, name, roles, country_code, country_source)
select md5('biasv1' || i)::uuid, 9500 + i, 'biasv1_' || i, 'biasv1_' || i, 'Biasv1 ' || i,
       '{developer}', (case when i <= 30 then 'ID' else 'SG' end)::char(2), 'self'
from generate_series(1, 60) i
on conflict (id) do nothing;

insert into public.analyses
  (github_login, score_version, authenticity, confidence, breakdown, primary_language, inferred_role, metrics, created_at)
select 'biasv1_' || i, 2,
       case when i <= 30 then 80 else 60 end,
       80, '{}', 'Go', 'Back-End Developer', '{}', now()
from generate_series(1, 60) i;

insert into auth.users (id, aud, role, email) values
  ('dddddddd-dddd-4ddd-dddd-dddddddddddd', 'authenticated', 'authenticated', 'admin-v1@test.com')
on conflict (id) do nothing;

-- ─── Otorisasi ───────────────────────────────────────────────────────
set local role authenticated;
set local "request.jwt.claim.sub" to 'dddddddd-dddd-4ddd-dddd-dddddddddddd';
set local "request.jwt.claims" to '{"role":"authenticated","app_metadata":{}}';

select throws_ok(
  $$ select public.bias_report_v1() $$,
  'P0001',
  'FORBIDDEN',
  'non-admin ditolak FORBIDDEN'
);

reset role;
set local role anon;
set local "request.jwt.claims" to '{"role":"anon"}';
select throws_ok(
  $$ select public.bias_report_v1() $$,
  'P0001',
  'FORBIDDEN',
  'anon ditolak FORBIDDEN'
);

-- ─── Admin: agregat + hitungan ambang ────────────────────────────────
reset role;
set local role authenticated;
set local "request.jwt.claim.sub" to 'dddddddd-dddd-4ddd-dddd-dddddddddddd';
set local "request.jwt.claims" to '{"role":"authenticated","app_metadata":{"role":"admin"}}';

select results_eq(
  $$ select (public.bias_report_v1()->'overall'->>'n')::int $$,
  $$ values (60) $$,
  'admin memperoleh agregat keseluruhan (n=60)'
);

select results_eq(
  $$ select (public.bias_report_v1()->'overall'->>'atOrAbove')::int $$,
  $$ values (30) $$,
  'scoring rate default (>= 70) menghitung 30 dari 60'
);

select results_eq(
  $$ select (g->>'n')::int from jsonb_array_elements(public.bias_report_v1()->'byCountry') g
     where g->>'key' = 'ID' $$,
  $$ values (30) $$,
  'kelompok ID melaporkan n=30'
);

select results_eq(
  $$ select (g->>'atOrAbove')::int from jsonb_array_elements(public.bias_report_v1()->'byCountry') g
     where g->>'key' = 'ID' $$,
  $$ values (30) $$,
  'kelompok ID: semua skor >= ambang'
);

select results_eq(
  $$ select (g->>'atOrAbove')::int from jsonb_array_elements(public.bias_report_v1()->'byCountry') g
     where g->>'key' = 'SG' $$,
  $$ values (0) $$,
  'kelompok SG: tidak ada skor >= ambang'
);

select results_eq(
  $$ select public.bias_report_v1()->>'threshold' $$,
  $$ values ('70') $$,
  'ambang default terdokumentasi pada keluaran'
);

-- ─── Parameter ───────────────────────────────────────────────────────
select results_eq(
  $$ select g->>'n' from jsonb_array_elements(public.bias_report_v1(70, 40)->'byCountry') g
     where g->>'key' = 'SG' $$,
  $$ values ('<40>') $$,
  'grup n < p_min_group dimasking "<40>"'
);

select throws_ok(
  $$ select public.bias_report_v1(101) $$,
  'P0001',
  'VALIDATION',
  'ambang di luar 0..100 ditolak'
);

select throws_ok(
  $$ select public.bias_report_v1(70, 4) $$,
  'P0001',
  'VALIDATION',
  'p_min_group di luar 5..1000 ditolak'
);

-- ─── Tanpa identitas ─────────────────────────────────────────────────
select is_empty(
  $$ select 1 from jsonb_array_elements(public.bias_report_v1()->'byCountry') g,
            jsonb_object_keys(g) k
     where k in ('login', 'name', 'avatarUrl', 'githubLogin', 'id') $$,
  'tidak ada identitas individu pada laporan v1'
);

select results_eq(
  $$ select count(*)::int from jsonb_array_elements(public.bias_report_v1()->'byLanguage') g
     where (g->>'n')::int >= 5 $$,
  $$ values (1) $$,
  'dimensi bahasa tetap dilaporkan (satu grup reportable)'
);

select * from finish();
rollback;
