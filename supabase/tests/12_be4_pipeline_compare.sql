-- supabase/tests/12_be4_pipeline_compare.sql
-- BE-4: pipeline_list/upsert/remove + compare_developers.

begin;
select plan(29);

insert into auth.users (id, aud, role, email) values
  ('11111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'p_r@test.com'),
  ('22222222-2222-4222-a222-222222222222', 'authenticated', 'authenticated', 'p_r2@test.com'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'p_a@test.com'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'p_b@test.com'),
  ('cccccccc-cccc-4ccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'p_c@test.com'),
  ('dddddddd-dddd-4ddd-dddd-dddddddddddd', 'authenticated', 'authenticated', 'p_d@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, github_id, login, github_login, name, avatar_url, roles, country_code, city, country_source) values
  ('11111111-1111-4111-a111-111111111111', 8201, 'p_r', 'p_r', 'Recruiter R', 'https://a/r', '{recruiter}', 'ID', 'Jakarta', 'self'),
  ('22222222-2222-4222-a222-222222222222', 8202, 'p_r2', 'p_r2', 'Recruiter R2', 'https://a/r2', '{recruiter}', 'ID', 'Jakarta', 'self'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 8203, 'a-dev', 'a-dev', 'Dev A', 'https://a/a', '{developer}', 'ID', 'Jakarta', 'self'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 8204, 'b-dev', 'b-dev', 'Dev B', 'https://a/b', '{developer}', 'SG', 'Singapore', 'self'),
  ('cccccccc-cccc-4ccc-cccc-cccccccccccc', 8205, 'c-dev', 'c-dev', 'Dev C', 'https://a/c', '{developer}', 'ID', 'Bandung', 'self'),
  ('dddddddd-dddd-4ddd-dddd-dddddddddddd', 8206, 'd-dev', 'd-dev', 'Dev D', 'https://a/d', '{developer}', 'ID', 'Jakarta', 'self')
on conflict (id) do nothing;

insert into public.developer_settings (user_id, listed, availability) values
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', true, 'open_to_work'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', true, 'freelance'),
  ('cccccccc-cccc-4ccc-cccc-cccccccccccc', false, 'not_available'),
  ('dddddddd-dddd-4ddd-dddd-dddddddddddd', true, 'open_to_work')
on conflict (user_id) do update set listed = excluded.listed, availability = excluded.availability;

insert into public.analyses
  (github_login, score_version, authenticity, confidence, breakdown, primary_language, inferred_role, metrics, created_at)
values
  ('a-dev', 2, 90, 80, '{}', 'Go', 'Back-End Developer', '{"originalCount":24,"streakWeeks":11}', now()),
  ('b-dev', 2, 80, 80, '{}', 'TypeScript', 'Mobile Developer', '{"originalCount":8,"streakWeeks":3}', now()),
  ('c-dev', 2, 70, 80, '{}', 'Python', 'AI / Data Engineer', '{"originalCount":5,"streakWeeks":1}', now());

insert into public.pipeline_entries (id, recruiter_id, github_login, stage, note, updated_at) values
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-a111-111111111111', 'a-dev', 'saved', 'Kandidat kuat', now() - interval '1 hour'),
  ('a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-a111-111111111111', 'c-dev', 'interviewing', 'Sudah interview', now() - interval '2 hours'),
  ('b0000000-0000-4000-8000-000000000003', '22222222-2222-4222-a222-222222222222', 'b-dev', 'saved', null, now())
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-4111-a111-111111111111';

-- ─── Daftar & summary ────────────────────────────────────────────────
select results_eq(
  $$ select jsonb_array_length(public.pipeline_list()->'entries') $$,
  $$ values (2) $$,
  'recruiter melihat 2 entri pipeline miliknya'
);

select results_eq(
  $$ select public.pipeline_list()->'summary' $$,
  $$ values ('{"saved":1,"interviewing":1,"hired":0}'::jsonb) $$,
  'summary dihitung dari data (saved/interviewing/hired)'
);

select results_eq(
  $$ select e->>'name', e->>'role', (e->>'score')::int
     from jsonb_array_elements(public.pipeline_list()->'entries') e
     where e->>'githubLogin' = 'a-dev' $$,
  $$ values ('Dev A', 'Back-End', 90) $$,
  'identitas developer listed diisi (D5)'
);

select results_eq(
  $$ select ((e->>'name') is null and (e->>'avatarUrl') is null
             and (e->>'role') is null and (e->>'score') is null)
     from jsonb_array_elements(public.pipeline_list()->'entries') e
     where e->>'githubLogin' = 'c-dev' $$,
  $$ values (true) $$,
  'identitas developer non-listed dimasking null (D5)'
);

select results_eq(
  $$ select jsonb_array_length(public.pipeline_list('saved')->'entries') $$,
  $$ values (1) $$,
  'filter stage saved hanya mengembalikan entri saved'
);

select results_eq(
  $$ select (public.pipeline_list('saved')->'summary'->>'interviewing')::int $$,
  $$ values (1) $$,
  'summary tidak terpengaruh filter stage'
);

-- ─── Validasi upsert ─────────────────────────────────────────────────
select throws_ok(
  $$ select public.pipeline_upsert('bad login!', 'saved', null) $$,
  'P0001',
  'VALIDATION',
  'login tidak valid -> VALIDATION'
);

select throws_ok(
  $$ select public.pipeline_upsert('a-dev', 'saved', repeat('x', 1001)) $$,
  'P0001',
  'VALIDATION',
  'note > 1000 karakter -> VALIDATION'
);

select throws_ok(
  $$ select public.pipeline_upsert('unlisted-unknown', 'saved', null) $$,
  'P0001',
  'NOT_FOUND',
  'login non-listed yang belum ada di pipeline -> NOT_FOUND (D4)'
);

-- ─── Upsert idempoten ────────────────────────────────────────────────
select lives_ok(
  $$ select public.pipeline_upsert('a-dev', 'hired', 'Sudah hired') $$,
  'upsert kedua untuk login yang sama berhasil'
);

select results_eq(
  $$ select count(*)::int from public.pipeline_entries
     where recruiter_id = '11111111-1111-4111-a111-111111111111' and github_login = 'a-dev' $$,
  $$ values (1) $$,
  'upsert idempoten: tetap 1 baris per (recruiter, login)'
);

select results_eq(
  $$ select e->>'stage' from jsonb_array_elements(public.pipeline_list()->'entries') e
     where e->>'githubLogin' = 'a-dev' $$,
  $$ values ('hired') $$,
  'upsert memperbarui stage'
);

-- ─── Isolasi recruiter ───────────────────────────────────────────────
set local "request.jwt.claim.sub" to '22222222-2222-4222-a222-222222222222';
select results_eq(
  $$ select (select jsonb_array_length(public.pipeline_list()->'entries')),
            bool_and(e->>'githubLogin' = 'b-dev')
     from jsonb_array_elements(public.pipeline_list()->'entries') e $$,
  $$ values (1, true) $$,
  'recruiter lain hanya melihat entri miliknya'
);

-- ─── Peran & akses langsung ──────────────────────────────────────────
set local "request.jwt.claim.sub" to 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
select throws_ok(
  $$ select public.pipeline_list() $$,
  'P0001',
  'FORBIDDEN',
  'developer (non-recruiter) ditolak FORBIDDEN'
);

reset role;
set local role anon;
select throws_ok(
  $$ select public.pipeline_list() $$,
  'P0001',
  'UNAUTHORIZED',
  'anon ditolak UNAUTHORIZED'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-4111-a111-111111111111';

select throws_ok(
  $$ select count(*) from public.pipeline_entries $$,
  '42501',
  null,
  'tidak ada akses baca tabel pipeline_entries langsung (D6)'
);

-- ─── D4: developer listed tanpa analisis boleh masuk ─────────────────
select lives_ok(
  $$ select public.pipeline_upsert('d-dev', 'saved', null) $$,
  'developer listed (walau belum ada analisis) boleh ditambahkan'
);

-- ─── Batas 500 entri (recruiter R2 diisi 500) ────────────────────────
reset role;
insert into public.pipeline_entries (recruiter_id, github_login, stage, updated_at)
select '22222222-2222-4222-a222-222222222222', 'bulk' || g, 'saved', now()
from generate_series(1, 500) g
on conflict do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" to '22222222-2222-4222-a222-222222222222';
select throws_ok(
  $$ select public.pipeline_upsert('a-dev', 'saved', null) $$,
  'P0001',
  'VALIDATION',
  'recruiter dengan 500+ entri ditolak VALIDATION'
);

-- ─── Compare ─────────────────────────────────────────────────────────
set local "request.jwt.claim.sub" to '11111111-1111-4111-a111-111111111111';

select results_eq(
  $$ select jsonb_array_length(public.compare_developers(array['a-dev','c-dev'])) $$,
  $$ values (2) $$,
  'compare tepat 2 login mengembalikan 2 entri'
);

select throws_ok(
  $$ select public.compare_developers(array['a-dev']) $$,
  'P0001',
  'VALIDATION',
  'compare 1 login -> VALIDATION'
);

select throws_ok(
  $$ select public.compare_developers(array['a-dev','b-dev','c-dev']) $$,
  'P0001',
  'VALIDATION',
  'compare 3 login -> VALIDATION'
);

select throws_ok(
  $$ select public.compare_developers(array['a-dev','a-dev']) $$,
  'P0001',
  'VALIDATION',
  'compare login duplikat -> VALIDATION'
);

select throws_ok(
  $$ select public.compare_developers(array['a-dev','zzz-unknown']) $$,
  'P0001',
  'NOT_FOUND',
  'compare login non-listed & bukan pipeline -> NOT_FOUND (D4)'
);

select results_eq(
  $$ select r->>'score', (r->>'originalCount')::int, (r->>'streakWeeks')::int, r->>'availability'
     from jsonb_array_elements(public.compare_developers(array['a-dev','c-dev'])) r
     where r->>'login' = 'a-dev' $$,
  $$ values ('90', 24, 11, 'open_to_work') $$,
  'metrik compare berasal dari analyses.metrics terbaru'
);

select results_eq(
  $$ select (r->>'availability') is null, (r->>'countryCode') is null
     from jsonb_array_elements(public.compare_developers(array['a-dev','c-dev'])) r
     where r->>'login' = 'c-dev' $$,
  $$ values (true, true) $$,
  'login non-listed: availability & negara null'
);

select is_empty(
  $$ select 1 from jsonb_array_elements(public.compare_developers(array['a-dev','c-dev'])) r,
            jsonb_object_keys(r) k
     where k ilike '%email%' or k ilike '%breakdown%' $$,
  'compare tanpa email/breakdown'
);

select results_eq(
  $$ select r->0->>'login', r->1->>'login'
     from (select public.compare_developers(array['c-dev','a-dev']) as r) s $$,
  $$ values ('c-dev', 'a-dev') $$,
  'urutan login masukan dipertahankan'
);

-- ─── Hapus ───────────────────────────────────────────────────────────
select lives_ok(
  $$ select public.pipeline_remove('a0000000-0000-4000-8000-000000000002') $$,
  'pemilik dapat menghapus entrinya'
);

select throws_ok(
  $$ select public.pipeline_remove('b0000000-0000-4000-8000-000000000003') $$,
  'P0001',
  'NOT_FOUND',
  'tidak dapat menghapus entri recruiter lain'
);

select * from finish();
rollback;
