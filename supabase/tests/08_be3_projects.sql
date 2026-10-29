-- supabase/tests/08_be3_projects.sql
-- pgTAP BE-3: visibilitas, RLS/privilese, build_tsquery, search_projects,
-- facet masking, featured, moderasi, project_rank.

begin;
select plan(30);

-- ─── build_tsquery ──────────────────────────────────────────────────
select results_eq(
  $$ select public.build_tsquery('golang')::text $$,
  $$ values ('golang:* | go:*'::text) $$,
  'golang diperluas ke go (grup OR prefix)'
);

select results_eq(
  $$ select (public.build_tsquery('ml')::text like '%pytorch%')::text $$,
  values ('true'),
  'ml diperluas ke pytorch/tensorflow/machine/learning'
);

select results_eq(
  $$ select (public.build_tsquery('e-commerce')::text = public.build_tsquery('e commerce')::text)::text $$,
  values ('true'),
  '"e-commerce" setara "e commerce"'
);

select results_eq(
  $$ select upper(public.build_tsquery('GOLANG')::text) $$,
  $$ values ('GOLANG:* | GO:*'::text) $$,
  'huruf besar/kecil tidak masalah'
);

select is_empty(
  $$ select public.build_tsquery('')::text where public.build_tsquery('') is not null $$,
  'query kosong menghasilkan tsquery NULL (tanpa filter teks)'
);

-- ─── visibilitas: siapkan developer listed/unlisted + proyek ─────────
insert into auth.users (id, aud, role, email) values
  ('a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'be3a@test.com'),
  ('b2222222-2222-4222-a222-222222222222', 'authenticated', 'authenticated', 'be3b@test.com'),
  ('c3333333-3333-4333-a333-333333333333', 'authenticated', 'authenticated', 'be3c@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, github_id, login, github_login, name, roles, country_code, city, country_source) values
  ('a1111111-1111-4111-a111-111111111111', 9101, 'be3a', 'be3a', 'BE3 A', '{developer}', 'ID', 'Jakarta', 'self'),
  ('b2222222-2222-4222-a222-222222222222', 9102, 'be3b', 'be3b', 'BE3 B', '{developer}', 'SG', 'Singapore', 'self'),
  ('c3333333-3333-4333-a333-333333333333', 9103, 'be3rec', 'be3rec', 'BE3 Rec', '{recruiter}', 'ID', 'Jakarta', 'self')
on conflict (id) do update set country_code = excluded.country_code, city = excluded.city;

insert into public.developer_settings (user_id, listed, open_to_messages) values
  ('a1111111-1111-4111-a111-111111111111', true, true),
  ('b2222222-2222-4222-a222-222222222222', false, false)
on conflict (user_id) do update set listed = excluded.listed;

-- trigger computed: visible dihitung otomatis (published default true)
insert into public.projects (id, owner_id, github_repo_id, name, role, description, stack, score, published, is_hidden, country_code, city, pushed_at, stars) values
  ('d1111111-1111-4111-a111-111111111111', 'a1111111-1111-4111-a111-111111111111', 91001, 'tokoonline', 'Back-End', 'Go e-commerce stack', '[{"name":"Go","percent":100}]', 88, true, false, null, null, now() - interval '5 days', 142),
  ('d2222222-2222-4222-a222-222222222222', 'b2222222-2222-4222-a222-222222222222', 91002, 'hidden-gem', 'Back-End', 'Go secret project', '[{"name":"Go","percent":100}]', 90, true, false, null, null, now() - interval '5 days', 10)
on conflict (id) do nothing;

-- trigger sync: country dari profil harus turun ke projects + owner_listed
select results_eq(
  'select country_code, city, owner_listed, visible from public.projects where id = ''d1111111-1111-4111-a111-111111111111''',
  $$ values ('ID'::char(2), 'Jakarta'::text, true, true) $$,
  'country/city/owner_listed/visible tersinkron dari profil (listed ID)'
);

-- proyek kedua milik A (untuk uji kursor 2 halaman)
insert into public.projects (id, owner_id, github_repo_id, name, role, description, stack, score, published, is_hidden, country_code, city, pushed_at, stars) values
  ('d3333333-3333-4333-a333-333333333333', 'a1111111-1111-4111-a111-111111111111', 91003, 'go-cache', 'Back-End', 'Go caching layer', '[{"name":"Go","percent":100}]', 70, true, false, null, null, now() - interval '2 days', 5)
on conflict (id) do nothing;

select results_eq(
  'select owner_listed, visible from public.projects where id = ''d3333333-3333-4333-a333-333333333333''',
  $$ values (true, true) $$,
  'proyek kedua ikut visible + tersinkron'
);

select results_eq(
  'select owner_listed, visible from public.projects where id = ''d2222222-2222-4222-a222-222222222222''',
  $$ values (false, false) $$,
  'pemilik unlisted -> visible=false walau published'
);

-- search: keyword + alias (masuk sebagai pemilik agar auth lolos; RLS tidak
-- menghalangi baca visible)
set local role authenticated;
set local "request.jwt.claim.sub" to 'c3333333-3333-4333-a333-333333333333';

select results_eq(
  $$ select jsonb_array_length((public.search_projects('golang', null, null, null, false, null, null, 20, false)->'items')) $$,
  $$ values (2) $$,
  'keyword golang mengembalikan 2 proyek Go yang visible (alias go)'
);

select results_eq(
  $$ select (public.search_projects(null, null, array['ID']::char(2)[], null, false, null, null, 20, false)->'items'->0->>'countryCode') $$,
  $$ values ('ID') $$,
  'filter countries=[ID] hanya ID (2 proyek)'
);

select results_eq(
  $$ select jsonb_array_length((public.search_projects(null, null, array['ID']::char(2)[], null, false, null, null, 20, false)->'items')) $$,
  $$ values (2) $$,
  'countries=[ID] mengembalikan kedua proyek ID'
);

select results_eq(
  $$ select jsonb_array_length((public.search_projects(null, null, array['SG']::char(2)[], null, false, null, null, 20, false)->'items')) $$,
  $$ values (0) $$,
  'countries=[SG] kosong karena pemilik SG unlisted'
);

select results_eq(
  $$ select jsonb_array_length((public.search_projects(null, 'Back-End', null, 'jakarta', false, null, null, 20, false)->'items')) $$,
  $$ values (2) $$,
  'role + city (case-insensitive) cocok kedua proyek Jakarta'
);

-- min_score + active_only (proyek 8001: score 88 active; go-cache: 70 active)
select results_eq(
  $$ select jsonb_array_length((public.search_projects(null, null, null, null, true, 80, null, 20, false)->'items')) $$,
  $$ values (1) $$,
  'active_only + min_score menyaring benar (hanya score>=80)'
);

-- kursor stabil 2 halaman: lim 1 -> halaman 1 nextCursor ada;
-- halaman 2 item berbeda + nextCursor null (tidak ada duplikat/loncatan).
-- Roundtrip memakai SQL dinamis karena kursor hanya diketahui saat jalan.
do $$ declare c1 text; p1 jsonb; p2 jsonb;
begin
  select public.search_projects(null, null, null, null, false, null, null, 1, false) into p1;
  c1 := p1->>'nextCursor';
  if c1 is null then raise exception 'kursor halaman 1 null (harus ada)';
  end if;
  execute format('select public.search_projects(null, null, null, null, false, null, %L, 1, false)', c1) into p2;
  if (p2->'items'->0->>'id') = (p1->'items'->0->>'id') then
    raise exception 'duplikat antar halaman';
  end if;
  if (p2->>'nextCursor') is not null then
    raise exception 'halaman terakhir harus nextCursor null';
  end if;
end $$;
select ok(true, 'kursor 2 halaman stabil tanpa duplikat/loncatan');

-- kursor rusak -> VALIDATION
select throws_ok(
  $$ select public.search_projects(null, null, null, null, false, null, '!!!', 20, false) $$,
  'P0001',
  'kursor rusak ditolak VALIDATION'
);

-- lim di-clamp: minta 500 -> tetap jalan (maks 50)
select lives_ok(
  $$ select public.search_projects(null, null, null, null, false, null, null, 500, false) $$,
  'lim besar di-clamp tanpa error'
);

-- keluaran tanpa email: kunci json items tidak memuat email
select is_empty(
  $$ select 1 where exists (
    select 1 from jsonb_array_elements(
      (public.search_projects(null, null, null, null, false, null, null, 20, false)->'items')) it
    where it::text ilike '%email%'
  ) $$,
  'tidak ada field email di keluaran FeedPage'
);

-- developer tanpa negara / unlisted / is_hidden tidak muncul (POL-1/POL-9)
reset role;
update public.profiles set country_code = null, city = null
where id = 'a1111111-1111-4111-a111-111111111111';
set local role authenticated;
set local "request.jwt.claim.sub" to 'c3333333-3333-4333-a333-333333333333';

select results_eq(
  $$ select jsonb_array_length((public.search_projects(null, null, null, null, false, null, null, 20, false)->'items')) $$,
  $$ values (0) $$,
  'negara dikosongkan -> auto-unlist (POL-9) -> hilang dari feed'
);

-- kembalikan negara agar test berikut stabil
reset role;
update public.profiles set country_code = 'ID', city = 'Jakarta'
where id = 'a1111111-1111-4111-a111-111111111111';
set local role authenticated;
set local "request.jwt.claim.sub" to 'c3333333-3333-4333-a333-333333333333';

-- rate limit: 300/jam — verifikasi fungsi menolak setelah batas (pakai kunci uji)
reset role;
select lives_ok(
  $$ select public.check_rate_limit('c3333333-3333-4333-a333-333333333333'::uuid, 'rl_test_be3', 1, '1 hour'::interval) $$,
  'panggilan rate limit pertama lolos'
);
select results_eq(
  'select allowed from public.check_rate_limit(''c3333333-3333-4333-a333-333333333333''::uuid, ''rl_test_be3'', 1, ''1 hour''::interval)',
  array[false],
  'panggilan kedua melewati batas ditolak'
);

-- ─── featured ───────────────────────────────────────────────────────
select results_eq(
  'select public.refresh_featured(10)',
  array[1],
  'refresh_featured memilih 1 proyek active teratas'
);

select is_empty(
  $$ select 1 from public.featured_projects fp join public.projects p on p.id = fp.project_id where p.visible = false $$,
  'featured tidak memuat proyek invisible'
);

-- hide proyek -> hilang saat baca featured
update public.projects set is_hidden = true where id = 'd1111111-1111-4111-a111-111111111111';
select results_eq(
  $$ select jsonb_array_length((public.featured_projects(10)->'items')) $$,
  $$ values (0) $$,
  'proyek di-hide hilang dari featured saat dibaca ulang'
);
update public.projects set is_hidden = false where id = 'd1111111-1111-4111-a111-111111111111';

-- ─── project_rank batas ─────────────────────────────────────────────
select results_eq(
  'select (public.project_rank(100, now(), 100000) <= 100 and public.project_rank(100, now(), 100000) >= 0)',
  array[true],
  'rank skor 100 + push hari ini + stars besar dalam [0,100]'
);

select results_eq(
  'select (public.project_rank(0, now() - interval ''400 days'', 0) = 0)',
  array[true],
  'rank repo lama tanpa stars = 0'
);

-- ─── RLS/privilese: klien tak bisa tulis langsung ───────────────────
set local role authenticated;
set local "request.jwt.claim.sub" to 'c3333333-3333-4333-a333-333333333333';

select throws_ok(
  $$ insert into public.projects (owner_id, github_repo_id, name, role) values ('c3333333-3333-4333-a333-333333333333', 999, 'x', 'Back-End') $$,
  null,
  'klien tidak bisa INSERT projects langsung'
);

select throws_ok(
  $$ update public.projects set score = 100 where id = 'd1111111-1111-4111-a111-111111111111' $$,
  null,
  'klien tidak bisa UPDATE kolom perhitungan langsung'
);

select is_empty(
  'select * from public.featured_projects',
  'klien tidak bisa membaca featured_projects langsung'
);

select is_empty(
  'select * from public.audit_log',
  'klien tidak bisa membaca audit_log langsung'
);

select * from finish();
rollback;
