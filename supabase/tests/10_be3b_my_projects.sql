-- supabase/tests/10_be3b_my_projects.sql
-- BE-3b: my_projects() — hanya milik sendiri (termasuk unpublished/hidden),
-- peran developer wajib, anon ditolak, kursor, rate limit, tanpa email.

begin;
set search_path = public, extensions;
select plan(19);

-- ─── Data uji ────────────────────────────────────────────────────────
insert into auth.users (id, aud, role, email) values
  ('a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'be3b_a@test.com'),
  ('b2222222-2222-4222-a222-222222222222', 'authenticated', 'authenticated', 'be3b_b@test.com'),
  ('c3333333-3333-4333-a333-333333333333', 'authenticated', 'authenticated', 'be3b_c@test.com'),
  ('d4444444-4444-4444-a444-444444444444', 'authenticated', 'authenticated', 'be3b_r@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, github_id, login, github_login, name, roles, country_code, city, country_source) values
  ('a1111111-1111-4111-a111-111111111111', 9401, 'be3b_a', 'be3b_a', 'BE3B A', '{developer}', 'ID', 'Jakarta', 'self'),
  ('b2222222-2222-4222-a222-222222222222', 9402, 'be3b_b', 'be3b_b', 'BE3B B', '{developer}', 'ID', 'Bandung', 'self'),
  ('c3333333-3333-4333-a333-333333333333', 9403, 'be3b_c', 'be3b_c', 'BE3B C', '{developer}', 'ID', 'Surabaya', 'self'),
  ('d4444444-4444-4444-a444-444444444444', 9404, 'be3b_r', 'be3b_r', 'BE3B R', '{recruiter}', 'ID', 'Jakarta', 'self')
on conflict (id) do nothing;

insert into public.developer_settings (user_id, listed, open_to_messages, availability) values
  ('a1111111-1111-4111-a111-111111111111', true, true, 'open_to_work'),
  ('b2222222-2222-4222-a222-222222222222', true, true, 'open_to_work')
on conflict (user_id) do update set listed = excluded.listed;

insert into public.projects
  (id, owner_id, github_repo_id, name, role, description, stack, score, published, is_hidden, demo_url, demo_verified, stars, pushed_at, created_at)
values
  ('d1111111-1111-4111-a111-111111111111', 'a1111111-1111-4111-a111-111111111111', 94101, 'publis', 'Back-End', 'Proyek publik', '[{"name":"Go","percent":100}]', 88, true, false, 'https://demo.example.com', true, 142, now() - interval '5 days', now() - interval '3 days'),
  ('d2222222-2222-4222-a222-222222222222', 'a1111111-1111-4111-a111-111111111111', 94102, 'belum-terbit', 'Back-End', 'Belum diterbitkan', '[{"name":"Go","percent":100}]', 60, false, false, null, false, 3, now() - interval '60 days', now() - interval '2 days'),
  ('d3333333-3333-4333-a333-333333333333', 'a1111111-1111-4111-a111-111111111111', 94103, 'disembunyikan', 'Mobile', 'Di-hide admin', '[{"name":"Dart","percent":100}]', 75, true, true, null, false, 9, now() - interval '10 days', now() - interval '1 day'),
  ('d4444444-4444-4444-a444-444444444444', 'b2222222-2222-4222-a222-222222222222', 94104, 'milik-b', 'Data', 'Proyek B', '[{"name":"Python","percent":100}]', 70, true, false, null, false, 4, now() - interval '4 days', now() - interval '4 days')
on conflict (id) do nothing;

-- ─── 1. Pemilik melihat SEMUA proyeknya (termasuk unpublished/hidden) ─
set local role authenticated;
set local "request.jwt.claim.sub" to 'a1111111-1111-4111-a111-111111111111';

select results_eq(
  $$ select jsonb_array_length((public.my_projects())->'items') $$,
  $$ values (3) $$,
  'pemilik melihat 3 proyeknya (publik, unpublished, hidden)'
);

select results_eq(
  $$ select (e->>'published')::bool, (e->>'visible')::bool, (e->>'isHidden')::bool
     from jsonb_array_elements((public.my_projects())->'items') e
     where e->>'projectId' = 'd2222222-2222-4222-a222-222222222222' $$,
  $$ values (false, false, false) $$,
  'proyek published=false tetap muncul dengan flag benar'
);

select results_eq(
  $$ select (e->>'published')::bool, (e->>'visible')::bool, (e->>'isHidden')::bool
     from jsonb_array_elements((public.my_projects())->'items') e
     where e->>'projectId' = 'd3333333-3333-4333-a333-333333333333' $$,
  $$ values (true, false, true) $$,
  'proyek isHidden=true tetap muncul dengan visible=false'
);

select results_eq(
  $$ select count(*)::int from jsonb_array_elements((public.my_projects())->'items') e
     where e ? 'score' and e ? 'demoVerified' and e ? 'stars' and e ? 'countryCode' and e ? 'city' $$,
  $$ values (3) $$,
  'setiap item memuat field MyProject yang dijanjikan'
);

-- ─── 2. Orang lain hanya melihat miliknya ────────────────────────────
set local "request.jwt.claim.sub" to 'b2222222-2222-4222-a222-222222222222';

select results_eq(
  $$ select count(*)::int from jsonb_array_elements((public.my_projects())->'items') e
     where e->>'projectId' in (
       'd1111111-1111-4111-a111-111111111111',
       'd2222222-2222-4222-a222-222222222222',
       'd3333333-3333-4333-a333-333333333333'
     ) $$,
  $$ values (0) $$,
  'developer B tidak melihat satu pun proyek A'
);

select results_eq(
  $$ select jsonb_array_length((public.my_projects())->'items') $$,
  $$ values (1) $$,
  'developer B melihat tepat 1 proyeknya'
);

-- ─── 3. Peran & anon ─────────────────────────────────────────────────
set local "request.jwt.claim.sub" to 'd4444444-4444-4444-a444-444444444444';
select throws_ok(
  $$ select public.my_projects() $$,
  'P0001',
  'FORBIDDEN',
  'recruiter ditolak FORBIDDEN'
);

reset role;
set local role anon;
set local "request.jwt.claim.sub" to '';
select throws_ok(
  $$ select public.my_projects() $$,
  'P0001',
  'UNAUTHORIZED',
  'anon ditolak UNAUTHORIZED'
);

-- ─── 4. Tanpa email & tanpa akses tabel langsung ─────────────────────
reset role;
set local role authenticated;
set local "request.jwt.claim.sub" to 'a1111111-1111-4111-a111-111111111111';

select is_empty(
  $$ select 1 from jsonb_array_elements((public.my_projects())->'items') e,
            jsonb_object_keys(e) k
     where k ilike '%email%' $$,
  'tidak ada kunci email pada keluaran my_projects'
);

select throws_ok(
  $$ select count(*) from public.projects $$,
  '42501',
  null,
  'pemilik pun tidak dapat membaca projects langsung (RPC-only)'
);

-- ─── 5. Kursor stabil ────────────────────────────────────────────────
do $$ declare c1 text; p1 jsonb; p2 jsonb;
begin
  select public.my_projects(null, 1) into p1;
  c1 := p1->>'nextCursor';
  if c1 is null then raise exception 'kursor halaman 1 null (harus ada)'; end if;
  execute format('select public.my_projects(%L, 1)', c1) into p2;
  if (p2->'items'->0->>'projectId') = (p1->'items'->0->>'projectId') then
    raise exception 'duplikat antar halaman';
  end if;
end $$;
select ok(true, 'kursor 2 halaman stabil tanpa duplikat');

select throws_ok(
  $$ select public.my_projects('!!!', 20) $$,
  'P0001',
  'VALIDATION',
  'kursor rusak ditolak VALIDATION'
);

select lives_ok(
  $$ select public.my_projects(null, 500) $$,
  'p_lim besar di-clamp (maks 100) tanpa error'
);

-- ─── 6. Republish tidak mengubah kolom hitungan ──────────────────────
-- Snapshot kolom internal dibaca sebagai superuser (klien tidak punya grant).
reset role;
create temporary table _my_projects_before on commit drop as
  select score, demo_verified, stars, rank_score
  from public.projects where id = 'd1111111-1111-4111-a111-111111111111';
set local role authenticated;
set local "request.jwt.claim.sub" to 'a1111111-1111-4111-a111-111111111111';

select lives_ok(
  $$ select public.unpublish_project('d1111111-1111-4111-a111-111111111111') $$,
  'pemilik dapat unpublish'
);

select results_eq(
  $$ select (e->>'published')::bool from jsonb_array_elements((public.my_projects())->'items') e
     where e->>'projectId' = 'd1111111-1111-4111-a111-111111111111' $$,
  $$ values (false) $$,
  'setelah unpublish, my_projects menunjukkan published=false'
);

select lives_ok(
  $$ select public.republish_project('d1111111-1111-4111-a111-111111111111') $$,
  'pemilik dapat republish'
);

reset role;
select results_eq(
  $$ select (p.score, p.demo_verified, p.stars, p.rank_score)::text
     from public.projects p where p.id = 'd1111111-1111-4111-a111-111111111111' $$,
  $$ select (b.score, b.demo_verified, b.stars, b.rank_score)::text
     from _my_projects_before b $$,
  'republish tidak mengubah score/demo_verified/stars/rank_score'
);

-- ─── 7. Rate limit 120/jam (uji dengan batas 1 pada user C) ──────────
update public.app_rate_limits set max_count = 1 where key = 'my_projects';

set local "request.jwt.claim.sub" to 'c3333333-3333-4333-a333-333333333333';
select lives_ok(
  $$ select public.my_projects() $$,
  'panggilan pertama dalam batas lolos'
);
select throws_ok(
  $$ select public.my_projects() $$,
  'P0001',
  null,
  'panggilan kedua melewati batas -> RATE_LIMITED'
);

update public.app_rate_limits set max_count = 120 where key = 'my_projects';

select * from finish();
rollback;
