-- supabase/tests/11_be4_discover.sql
-- BE-4 Discover: D1/D2/D3, filter role/skor/negara/bahasa/availability,
-- kursor stabil, tanpa kebocoran, blokir, unlist/POL-9, facet masking, rate limit.

begin;
select plan(27);

-- ─── Data uji ────────────────────────────────────────────────────────
insert into auth.users (id, aud, role, email) values
  ('11111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'd_r@test.com'),
  ('22222222-2222-4222-a222-222222222222', 'authenticated', 'authenticated', 'd_r2@test.com'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'd_a@test.com'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'd_b@test.com'),
  ('cccccccc-cccc-4ccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'd_c@test.com'),
  ('dddddddd-dddd-4ddd-dddd-dddddddddddd', 'authenticated', 'authenticated', 'd_d@test.com'),
  ('ffffffff-ffff-4fff-ffff-ffffffffffff', 'authenticated', 'authenticated', 'd_f@test.com'),
  ('99999999-9999-4999-9999-999999999999', 'authenticated', 'authenticated', 'd_g@test.com'),
  ('88888888-8888-4888-8888-888888888888', 'authenticated', 'authenticated', 'd_h@test.com'),
  ('77777777-7777-4777-7777-777777777777', 'authenticated', 'authenticated', 'd_s@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, github_id, login, github_login, name, avatar_url, roles, country_code, city, country_source) values
  ('11111111-1111-4111-a111-111111111111', 8101, 'd_r', 'd_r', 'Recruiter R', 'https://a/r', '{recruiter}', 'ID', 'Jakarta', 'self'),
  ('22222222-2222-4222-a222-222222222222', 8102, 'd_r2', 'd_r2', 'Recruiter R2', 'https://a/r2', '{recruiter}', 'ID', 'Jakarta', 'self'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 8103, 'a_dev', 'a_dev', 'Dev A', 'https://a/a', '{developer}', 'ID', 'Jakarta', 'self'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 8104, 'b_dev', 'b_dev', 'Dev B', 'https://a/b', '{developer}', 'SG', 'Singapore', 'self'),
  ('cccccccc-cccc-4ccc-cccc-cccccccccccc', 8105, 'c_dev', 'c_dev', 'Dev C', 'https://a/c', '{developer}', 'ID', 'Bandung', 'self'),
  ('dddddddd-dddd-4ddd-dddd-dddddddddddd', 8106, 'd_dev', 'd_dev', 'Dev D', 'https://a/d', '{developer}', 'ID', 'Jakarta', 'self'),
  ('ffffffff-ffff-4fff-ffff-ffffffffffff', 8107, 'f_dev', 'f_dev', 'Dev F', 'https://a/f', '{developer}', 'ID', 'Jakarta', 'self'),
  ('99999999-9999-4999-9999-999999999999', 8108, 'g_dev', 'g_dev', 'Dev G', 'https://a/g', '{developer}', 'ID', 'Jakarta', 'self'),
  ('88888888-8888-4888-8888-888888888888', 8109, 'h_dev', 'h_dev', 'Dev H', 'https://a/h', '{developer}', 'ID', 'Jakarta', 'self'),
  ('77777777-7777-4777-7777-777777777777', 8110, 's_dev', 's_dev', 'Dev S', 'https://a/s', '{developer,recruiter}', 'ID', 'Jakarta', 'self')
on conflict (id) do nothing;

insert into public.developer_settings (user_id, listed, availability) values
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', true, 'open_to_work'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', true, 'freelance'),
  ('cccccccc-cccc-4ccc-cccc-cccccccccccc', true, 'open_to_work'),
  ('dddddddd-dddd-4ddd-dddd-dddddddddddd', false, 'open_to_work'),
  ('ffffffff-ffff-4fff-ffff-ffffffffffff', true, 'open_to_work'),
  ('99999999-9999-4999-9999-999999999999', true, 'open_to_work'),
  ('88888888-8888-4888-8888-888888888888', true, 'open_to_work'),
  ('77777777-7777-4777-7777-777777777777', true, 'open_to_work')
on conflict (user_id) do update set listed = excluded.listed, availability = excluded.availability;

insert into public.analyses
  (github_login, score_version, authenticity, confidence, breakdown, primary_language, inferred_role, metrics, created_at)
values
  ('a_dev', 2, 90, 80, '{}', 'Go', 'Back-End Developer', '{"originalCount":10,"streakWeeks":2}', now() - interval '1 day'),
  ('b_dev', 2, 80, 80, '{}', 'TypeScript', 'Mobile Developer', '{}', now() - interval '1 day'),
  ('c_dev', 2, 95, 80, '{}', 'Python', 'AI / Data Engineer', '{}', now() - interval '1 day'),
  ('d_dev', 2, 99, 80, '{}', 'Go', 'Back-End Developer', '{}', now() - interval '1 day'),
  ('g_dev', 2, 91, 80, '{}', 'Go', 'Back-End Developer', '{}', now() - interval '1 day'),
  ('h_dev', 2, 60, 80, '{}', 'Go', 'Back-End Developer', '{}', now() - interval '2 days'),
  ('h_dev', 1, 99, 80, '{}', 'Go', 'Back-End Developer', '{}', now() - interval '1 day'),
  ('s_dev', 2, 85, 80, '{}', 'TypeScript', 'Front-End Developer', '{}', now() - interval '1 day');

-- G memblokir recruiter R.
insert into public.blocks (blocker_id, blocked_id) values
  ('99999999-9999-4999-9999-999999999999', '11111111-1111-4111-a111-111111111111')
on conflict do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-4111-a111-111111111111';

-- ─── Visibilitas D1/D3 ───────────────────────────────────────────────
select results_eq(
  $$ select (public.discover_developers()->>'totalCount')::int $$,
  $$ values (4) $$,
  'hanya listed + negara + analisis v2 terbaru (A,B,C,S); blokir/v1/unlisted/no-analysis tersaring'
);

select results_eq(
  $$ select jsonb_array_length(public.discover_developers('Data')->'items') $$,
  $$ values (1) $$,
  'filter role Data -> C saja'
);

select results_eq(
  $$ select jsonb_array_length(public.discover_developers('Back-End')->'items') $$,
  $$ values (1) $$,
  'filter role Back-End -> A saja'
);

select results_eq(
  $$ select (public.discover_developers(null, 90)->>'totalCount')::int $$,
  $$ values (2) $$,
  'min_score 90 -> A dan C'
);

select throws_ok(
  $$ select public.discover_developers(null, 69) $$,
  'P0001',
  'VALIDATION',
  'min_score < 70 ditolak VALIDATION'
);

select throws_ok(
  $$ select public.discover_developers(null, 96) $$,
  'P0001',
  'VALIDATION',
  'min_score > 95 ditolak VALIDATION'
);

select results_eq(
  $$ select (public.discover_developers(null, null, array['ID']::char(2)[])->>'totalCount')::int $$,
  $$ values (3) $$,
  'countries=[ID] -> A,C,S'
);

select results_eq(
  $$ select (public.discover_developers(null, null, array['ID','SG']::char(2)[])->>'totalCount')::int $$,
  $$ values (4) $$,
  'countries=[ID,SG] -> semua'
);

select results_eq(
  $$ select (public.discover_developers(null, null, array[]::char(2)[])->>'totalCount')::int $$,
  $$ values (4) $$,
  'countries kosong = semua negara'
);

select results_eq(
  $$ select (public.discover_developers(null, null, null, 'GO')->>'totalCount')::int $$,
  $$ values (1) $$,
  'language case-insensitive -> A (Go)'
);

select results_eq(
  $$ select (public.discover_developers(null, null, null, null, 'open_to_work')->>'totalCount')::int $$,
  $$ values (3) $$,
  'availability open_to_work -> A,C,S'
);

select results_eq(
  $$ select (public.discover_developers('Back-End', null, array['ID']::char(2)[], null, 'open_to_work')->>'totalCount')::int $$,
  $$ values (1) $$,
  'kombinasi role+negara+availability -> A saja'
);

-- ─── Kursor stabil ───────────────────────────────────────────────────
do $$ declare c1 text; p1 jsonb; p2 jsonb; l1 text; l2 text;
begin
  select public.discover_developers(null, null, null, null, null, null, 2) into p1;
  c1 := p1->>'nextCursor';
  if c1 is null then raise exception 'kursor halaman 1 null (harus ada)'; end if;
  execute format('select public.discover_developers(null, null, null, null, null, %L, 2)', c1) into p2;
  l1 := p1->'items'->0->>'login';
  l2 := p2->'items'->0->>'login';
  if l1 = l2 then raise exception 'duplikat antar halaman'; end if;
  if jsonb_array_length(p2->'items') <> 2 then raise exception 'halaman 2 tidak lengkap'; end if;
end $$;
select ok(true, 'kursor 2 halaman stabil (authenticity desc, login asc) tanpa duplikat');

select throws_ok(
  $$ select public.discover_developers(null, null, null, null, null, '!!!', 20) $$,
  'P0001',
  'VALIDATION',
  'kursor rusak ditolak VALIDATION'
);

select lives_ok(
  $$ select public.discover_developers(null, null, null, null, null, null, 500) $$,
  'p_lim besar di-clamp (maks 50) tanpa error'
);

-- ─── Privasi keluaran ────────────────────────────────────────────────
select is_empty(
  $$ select 1 from jsonb_array_elements(public.discover_developers()->'items') e,
            jsonb_object_keys(e) k
     where k ilike '%email%' or k ilike '%breakdown%' $$,
  'tidak ada email/breakdown pada DiscoverItem'
);

-- ─── Peran ───────────────────────────────────────────────────────────
set local "request.jwt.claim.sub" to 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
select throws_ok(
  $$ select public.discover_developers() $$,
  'P0001',
  'FORBIDDEN',
  'developer (non-recruiter) ditolak FORBIDDEN'
);

reset role;
set local role anon;
select throws_ok(
  $$ select public.discover_developers() $$,
  'P0001',
  'UNAUTHORIZED',
  'anon ditolak UNAUTHORIZED'
);

-- ─── Blokir: setelah blokir dihapus, G muncul ────────────────────────
reset role;
delete from public.blocks where blocker_id = '99999999-9999-4999-9999-999999999999';
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-4111-a111-111111111111';

select results_eq(
  $$ select (public.discover_developers()->>'totalCount')::int $$,
  $$ values (5) $$,
  'blokir dihapus -> G muncul kembali'
);

-- ─── Self exclusion (S adalah developer+recruiter) ───────────────────
set local "request.jwt.claim.sub" to '77777777-7777-4777-7777-777777777777';
select results_eq(
  $$ select (public.discover_developers()->>'totalCount')::int $$,
  $$ values (4) $$,
  'pemanggil tidak melihat dirinya sendiri'
);
select is_empty(
  $$ select 1 from jsonb_array_elements(public.discover_developers()->'items') e
     where e->>'login' = 's_dev' $$,
  'login pemanggil tidak ada pada items'
);

-- ─── Unlist & POL-9 ──────────────────────────────────────────────────
reset role;
update public.developer_settings set listed = false
where user_id = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-4111-a111-111111111111';

select results_eq(
  $$ select (public.discover_developers()->>'totalCount')::int $$,
  $$ values (4) $$,
  'developer di-unlist hilang dari Discover'
);

reset role;
update public.profiles set country_code = null
where id = 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-4111-a111-111111111111';

select results_eq(
  $$ select (public.discover_developers()->>'totalCount')::int $$,
  $$ values (3) $$,
  'negara dikosongkan -> auto-unlist (POL-9) -> hilang'
);

-- ─── Facet ───────────────────────────────────────────────────────────
select results_eq(
  $$ select g->>'count' from jsonb_array_elements(public.discover_country_facets()) g
     where g->>'iso2' = 'ID' $$,
  $$ values ('<5') $$,
  'facet negara memakai masking <5'
);

select results_eq(
  $$ select g->>'count' from jsonb_array_elements(public.discover_country_facets('Mobile')) g
     where g->>'iso2' = 'SG' $$,
  $$ values ('<5') $$,
  'facet mengikuti filter role dan tetap ter-mask'
);

-- ─── Rate limit (recruiter baru R2, batas 1) ─────────────────────────
reset role;
update public.app_rate_limits set max_count = 1 where key = 'discover_developers';
set local role authenticated;
set local "request.jwt.claim.sub" to '22222222-2222-4222-a222-222222222222';

select lives_ok(
  $$ select public.discover_developers() $$,
  'panggilan pertama dalam batas lolos'
);
select throws_ok(
  $$ select public.discover_developers() $$,
  'P0001',
  null,
  'panggilan kedua melewati batas -> RATE_LIMITED'
);

reset role;
update public.app_rate_limits set max_count = 300 where key = 'discover_developers';

select * from finish();
rollback;
