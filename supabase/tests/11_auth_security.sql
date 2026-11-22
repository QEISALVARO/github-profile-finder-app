-- supabase/tests/11_auth_security.sql
-- P1: batas akses auth/role setelah akun email recruiter ditambahkan.
-- Fokus pada hal yang belum dicakup 10_email_auth.sql: anon ditolak, RLS
-- profile unlisted, RPC hanya mengubah auth.uid(), dan delete cascade.

begin;
select plan(8);

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data) values
  (
    'aaaaaaaa-1111-4111-a111-111111111111',
    'authenticated',
    'authenticated',
    'security.recruiter@test.com',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  ),
  (
    'bbbbbbbb-2222-4222-a222-222222222222',
    'authenticated',
    'authenticated',
    'security.listed@test.com',
    '{"provider":"github","providers":["github"]}'::jsonb,
    '{"user_name":"security_listed","provider_id":"91001"}'::jsonb
  ),
  (
    'cccccccc-3333-4333-a333-333333333333',
    'authenticated',
    'authenticated',
    'security.unlisted@test.com',
    '{"provider":"github","providers":["github"]}'::jsonb,
    '{"user_name":"security_unlisted","provider_id":"91002"}'::jsonb
  )
on conflict (id) do nothing;

-- Profile dibuat idempoten: trigger auth.users dan seed test bisa berlomba.
insert into public.profiles (
  id, github_id, login, github_login, name, roles, country_code, city, country_source, auth_provider
) values
  ('aaaaaaaa-1111-4111-a111-111111111111', null, 'user-security-rec', null, 'Security Recruiter', '{recruiter}', 'ID', 'Jakarta', 'self', 'email'),
  ('bbbbbbbb-2222-4222-a222-222222222222', 91001, 'security_listed', 'security_listed', 'Listed Dev', '{developer}', 'ID', 'Bandung', 'self', 'github'),
  ('cccccccc-3333-4333-a333-333333333333', 91002, 'security_unlisted', 'security_unlisted', 'Unlisted Dev', '{developer}', 'SG', 'Singapore', 'self', 'github')
on conflict (id) do update set
  github_id = excluded.github_id,
  login = excluded.login,
  github_login = excluded.github_login,
  roles = excluded.roles,
  country_code = excluded.country_code,
  city = excluded.city,
  country_source = excluded.country_source,
  auth_provider = excluded.auth_provider;

insert into public.developer_settings (user_id, listed, open_to_messages) values
  ('bbbbbbbb-2222-4222-a222-222222222222', true, true),
  ('cccccccc-3333-4333-a333-333333333333', false, false)
on conflict (user_id) do update set
  listed = excluded.listed,
  open_to_messages = excluded.open_to_messages;

-- 1. Anon tidak boleh menjalankan RPC pencarian (bukan hanya RLS tabel).
set local role anon;
select throws_ok(
  $$ select public.search_projects() $$,
  'P0001',
  'UNAUTHORIZED',
  'Anon ditolak oleh search_projects sebelum membaca data'
);

-- 2. Anon tidak boleh membaca recruiter_profiles.
select is_empty(
  'select * from public.recruiter_profiles',
  'Anon tidak dapat membaca recruiter_profiles'
);
reset role;

-- 3. Recruiter tidak dapat membaca profil developer yang listed=false.
set local role authenticated;
set local "request.jwt.claim.sub" to 'aaaaaaaa-1111-4111-a111-111111111111';
select is_empty(
  $$ select login from public.profiles where id = 'cccccccc-3333-4333-a333-333333333333' $$,
  'Recruiter tidak dapat membaca profil developer unlisted'
);

-- 4. RPC set_country hanya mengubah auth.uid(), bukan profil developer lain.
select lives_ok(
  $$ select public.set_country('SG'::char(2), 'Singapore') $$,
  'Recruiter dapat menyimpan domisili sendiri'
);
reset role;
select results_eq(
  $$ select country_code from public.profiles where id = 'bbbbbbbb-2222-4222-a222-222222222222' $$,
  $$ values ('ID'::char(2)) $$,
  'set_country tidak mengubah profil developer lain'
);

-- 5. RPC settings hanya mengubah auth.uid(); listing developer lain tetap.
set local role authenticated;
set local "request.jwt.claim.sub" to 'aaaaaaaa-1111-4111-a111-111111111111';
select lives_ok(
  $$ select public.update_developer_settings(false, true, 'open_to_work'::public.availability, null) $$,
  'Recruiter dapat mengubah settings miliknya sendiri'
);
reset role;
select results_eq(
  $$ select listed from public.developer_settings where user_id = 'bbbbbbbb-2222-4222-a222-222222222222' $$,
  $$ values (true) $$,
  'update_developer_settings tidak mengubah listing pengguna lain'
);

-- 6. Hapus auth user menghapus profile + settings (delete account cascade).
delete from auth.users where id = 'bbbbbbbb-2222-4222-a222-222222222222';
select is_empty(
  $$
  select 1 from public.profiles p
  where p.id = 'bbbbbbbb-2222-4222-a222-222222222222'
  union all
  select 1 from public.developer_settings ds
  where ds.user_id = 'bbbbbbbb-2222-4222-a222-222222222222'
  $$,
  'Delete auth user menghapus profile dan developer_settings (cascade)'
);

select * from finish();
rollback;
