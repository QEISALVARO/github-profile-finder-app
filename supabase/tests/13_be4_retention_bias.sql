-- supabase/tests/13_be4_retention_bias.sql
-- BE-4: retensi analisis listed/unlisted, purge aman, pembersihan pipeline
-- saat akun dihapus, dan bias_report_v0 (admin-only, masking).

begin;
select plan(15);

-- ─── Data populasi sintetis untuk bias (12 ID + 3 SG) ────────────────
insert into auth.users (id, aud, role, email)
select md5('bias' || i)::uuid, 'authenticated', 'authenticated', 'bias' || i || '@test.com'
from generate_series(1, 15) i
on conflict (id) do nothing;

insert into public.profiles (id, github_id, login, github_login, name, roles, country_code, country_source)
select md5('bias' || i)::uuid, 9000 + i, 'bias' || i, 'bias' || i, 'Bias ' || i,
       '{developer}', (case when i <= 12 then 'ID' else 'SG' end)::char(2), 'self'
from generate_series(1, 15) i
on conflict (id) do nothing;

insert into public.developer_settings (user_id, listed)
select md5('bias' || i)::uuid, false from generate_series(1, 15) i
on conflict (user_id) do nothing;

insert into public.analyses
  (github_login, score_version, authenticity, confidence, breakdown, primary_language, inferred_role, metrics, created_at)
select 'bias' || i, 2,
       case when i <= 12 then 59 + i else 80 + (i - 13) * 10 end,
       80, '{}', 'Go', 'Back-End Developer', '{}', now()
from generate_series(1, 15) i;

-- ─── bias_report_v0: admin-only ──────────────────────────────────────
insert into auth.users (id, aud, role, email) values
  ('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee', 'authenticated', 'authenticated', 'admin@test.com')
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" to 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee';
set local "request.jwt.claims" to '{"role":"authenticated","app_metadata":{}}';

select throws_ok(
  $$ select public.bias_report_v0() $$,
  'P0001',
  'FORBIDDEN',
  'non-admin ditolak FORBIDDEN'
);

reset role;
set local role anon;
set local "request.jwt.claims" to '{"role":"anon"}';
select throws_ok(
  $$ select public.bias_report_v0() $$,
  'P0001',
  'FORBIDDEN',
  'anon ditolak FORBIDDEN'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" to 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee';
set local "request.jwt.claims" to '{"role":"authenticated","app_metadata":{"role":"admin"}}';

select results_eq(
  $$ select (public.bias_report_v0()->'overall'->>'n')::int $$,
  $$ values (15) $$,
  'admin memperoleh agregat keseluruhan (n=15)'
);

select results_eq(
  $$ select g->>'n' from jsonb_array_elements(public.bias_report_v0()->'byCountry') g
     where g->>'key' = 'ID' $$,
  $$ values ('12') $$,
  'kelompok n >= 10 menampilkan jumlah'
);

select results_eq(
  $$ select g->>'median' from jsonb_array_elements(public.bias_report_v0()->'byCountry') g
     where g->>'key' = 'ID' $$,
  $$ values ('65.5') $$,
  'median kelompok ID dihitung (60..71 -> 65.5)'
);

select results_eq(
  $$ select g->>'n' from jsonb_array_elements(public.bias_report_v0()->'byCountry') g
     where g->>'key' = 'SG' $$,
  $$ values ('<10') $$,
  'kelompok n < 10 dimasking "<10"'
);

select is_empty(
  $$ select 1 from jsonb_array_elements(public.bias_report_v0()->'byCountry') g,
            jsonb_object_keys(g) k
     where k in ('login', 'name', 'avatarUrl', 'githubLogin') $$,
  'tidak ada identitas individu pada laporan bias'
);

-- ─── Retensi: unlisted -> lookup 7 hari, snapshot 24 jam ─────────────
insert into auth.users (id, aud, role, email) values
  ('ffffffff-ffff-4fff-ffff-ffffffffffff', 'authenticated', 'authenticated', 'ret@test.com'),
  ('99999999-9999-4999-9999-999999999999', 'authenticated', 'authenticated', 'gone@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, github_id, login, github_login, name, roles, country_code, country_source) values
  ('ffffffff-ffff-4fff-ffff-ffffffffffff', 9301, 'ret-dev', 'ret-dev', 'Ret Dev', '{developer}', 'ID', 'self'),
  ('99999999-9999-4999-9999-999999999999', 9302, 'gone-dev', 'gone-dev', 'Gone Dev', '{developer}', 'ID', 'self')
on conflict (id) do nothing;

insert into public.developer_settings (user_id, listed) values
  ('ffffffff-ffff-4fff-ffff-ffffffffffff', false),
  ('99999999-9999-4999-9999-999999999999', false)
on conflict (user_id) do nothing;

insert into public.analyses
  (github_login, score_version, authenticity, confidence, breakdown, primary_language, inferred_role, metrics, is_lookup, expires_at)
values
  ('ret-dev', 2, 77, 80, '{}', 'Go', 'Back-End Developer', '{}', true, now() + interval '7 days'),
  ('gone-dev', 2, 66, 80, '{}', 'Go', 'Back-End Developer', '{}', true, now() - interval '1 day');

insert into public.github_snapshots (login, user_json, repos_json, expires_at)
values ('ret-dev', '{}', '[]', now() + interval '24 hours')
on conflict (login) do update set expires_at = excluded.expires_at;

update public.developer_settings set listed = true
where user_id = 'ffffffff-ffff-4fff-ffff-ffffffffffff';

select results_eq(
  $$ select is_lookup, expires_at is null from public.analyses where github_login = 'ret-dev' $$,
  $$ values (false, true) $$,
  'listed=true -> analisis permanen (is_lookup=false, expires_at NULL)'
);

select results_eq(
  $$ select expires_at is null from public.github_snapshots where login = 'ret-dev' $$,
  $$ values (true) $$,
  'listed=true -> snapshot tidak kedaluwarsa'
);

update public.developer_settings set listed = false
where user_id = 'ffffffff-ffff-4fff-ffff-ffffffffffff';

select results_eq(
  $$ select is_lookup, (expires_at > now() + interval '6 days' and expires_at < now() + interval '8 days')
     from public.analyses where github_login = 'ret-dev' $$,
  $$ values (true, true) $$,
  'listed=false -> analisis kembali lookup + 7 hari'
);

select results_eq(
  $$ select (expires_at > now() + interval '23 hours' and expires_at < now() + interval '25 hours')
     from public.github_snapshots where login = 'ret-dev' $$,
  $$ values (true) $$,
  'listed=false -> snapshot kedaluwarsa 24 jam'
);

-- ─── Purge aman untuk developer listed ───────────────────────────────
update public.developer_settings set listed = true
where user_id = 'ffffffff-ffff-4fff-ffff-ffffffffffff';
update public.analyses set expires_at = now() - interval '1 day' where github_login = 'ret-dev';

select lives_ok(
  $$ select * from public.purge_expired_lookups() $$,
  'purge_expired_lookups berjalan'
);

select results_eq(
  $$ select count(*)::int from public.analyses where github_login = 'ret-dev' $$,
  $$ values (1) $$,
  'purge TIDAK menghapus analisis developer listed'
);

select results_eq(
  $$ select count(*)::int from public.analyses where github_login = 'gone-dev' $$,
  $$ values (0) $$,
  'purge menghapus analisis lookup kedaluwarsa non-listed'
);

-- ─── Hapus akun developer -> entri pipeline orang lain ikut hapus ────
insert into public.pipeline_entries (recruiter_id, github_login, stage)
values ('eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee', 'gone-dev', 'saved')
on conflict do nothing;

delete from public.profiles where id = '99999999-9999-4999-9999-999999999999';

select results_eq(
  $$ select count(*)::int from public.pipeline_entries where github_login = 'gone-dev' $$,
  $$ values (0) $$,
  'entri pipeline milik recruiter lain dihapus saat developer menghapus akun (D5)'
);

select * from finish();
rollback;
