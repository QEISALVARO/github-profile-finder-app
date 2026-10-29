-- supabase/tests/06_rpcs.sql
-- pgTAP: Verifikasi fungsi RPC onboarding dan update profil (SECURITY INVOKER)

begin;
select plan(6);

-- Siapkan user autentikasi baru
insert into auth.users (id, aud, role, email) values
  ('77777777-7777-4777-a777-777777777777', 'authenticated', 'authenticated', 'onboarding_dev@test.com'),
  ('88888888-8888-4888-a888-888888888888', 'authenticated', 'authenticated', 'onboarding_rec@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, github_id, login, github_login, roles) values
  ('77777777-7777-4777-a777-777777777777', 999771, 'onboard_dev', 'onboard_dev', '{}'),
  ('88888888-8888-4888-a888-888888888888', 999881, 'onboard_rec', 'onboard_rec', '{}')
on conflict (id) do nothing;

-- 1. Test onboarding sebagai developer
set local role authenticated;
set local "request.jwt.claim.sub" to '77777777-7777-4777-a777-777777777777';

select lives_ok(
  $$
  select public.complete_onboarding(
    array['developer'::public.user_role],
    'ID'::char(2),
    'Bandung',
    null,
    null,
    null
  )
  $$,
  'complete_onboarding untuk peran developer berhasil'
);

-- Test 2: Periksa profil developer diperbarui dengan country_source='self' dan confidence 100
select results_eq(
  $$
  select country_code, city, country_source, country_confidence, roles
  from public.profiles
  where id = '77777777-7777-4777-a777-777777777777'
  $$,
  $$ values ('ID'::char(2), 'Bandung'::text, 'self'::text, 100::smallint, array['developer'::public.user_role]) $$,
  'Profil developer terkonfigurasi dengan country_source self dan confidence 100'
);

-- Test 3: update_developer_settings
select lives_ok(
  $$
  select public.update_developer_settings(
    true,
    true,
    'open_to_work'::public.availability,
    'Backend Engineer Handal'
  )
  $$,
  'update_developer_settings berhasil saat negara sudah terisi'
);

-- 2. Test onboarding sebagai recruiter
set local "request.jwt.claim.sub" to '88888888-8888-4888-a888-888888888888';

-- Test 4: Onboarding recruiter tanpa nama perusahaan WAJIB DITOLAK
select throws_ok(
  $$
  select public.complete_onboarding(
    array['recruiter'::public.user_role],
    null,
    null,
    '',  -- company kosong
    'Lead Recruiter',
    array['ID'::char(2)]
  )
  $$,
  null,
  'Onboarding recruiter tanpa nama perusahaan wajib ditolak'
);

-- Test 5: Onboarding recruiter dengan nama perusahaan berhasil
select lives_ok(
  $$
  select public.complete_onboarding(
    array['recruiter'::public.user_role],
    null,
    null,
    'Tech Ventures Asia',
    'Head of People',
    array['ID'::char(2), 'SG'::char(2)]
  )
  $$,
  'Onboarding recruiter dengan nama perusahaan valid berhasil'
);

-- Test 6: Verifikasi recruiter_profiles terbentuk dengan benar
select results_eq(
  $$
  select company, title, target_countries
  from public.recruiter_profiles
  where user_id = '88888888-8888-4888-a888-888888888888'
  $$,
  $$ values ('Tech Ventures Asia'::text, 'Head of People'::text, array['ID'::char(2), 'SG'::char(2)]) $$,
  'recruiter_profiles tersimpan dengan benar'
);

select * from finish();
rollback;
