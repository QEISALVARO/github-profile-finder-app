-- supabase/tests/10_email_auth.sql
-- P0: akun email/password mendapat profil tanpa identitas GitHub, onboarding
-- recruiter tidak membutuhkan GitHub, tetapi listing developer tetap ditolak.

begin;
select plan(6);

-- Trigger handle_new_user membuat profil dari metadata provider 'email'.
insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data
) values (
  '99999999-9999-4999-a999-999999999999',
  'authenticated',
  'authenticated',
  'recruiter.email@test.com',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb
) on conflict (id) do nothing;

-- 1. Profil email tidak memiliki identitas GitHub dan memakai login placeholder.
select results_eq(
  $$
  select auth_provider, github_id, github_login, (login = 'user-' || substr(md5(id::text), 1, 6))
  from public.profiles
  where id = '99999999-9999-4999-a999-999999999999'
  $$,
  $$ values ('email'::text, null::bigint, null::text, true) $$,
  'Akun email membuat profil tanpa github_id/github_login dan login placeholder'
);

-- 2. Email tidak bocor ke kolom publik profiles (POL-2).
select is(
  (
    select count(*)
    from public.profiles
    where id = '99999999-9999-4999-a999-999999999999'
      and (login = 'recruiter.email' or name = 'recruiter.email@test.com')
  ),
  0::bigint,
  'Email tidak dipakai sebagai login/name publik'
);

set local role authenticated;
set local "request.jwt.claim.sub" to '99999999-9999-4999-a999-999999999999';

-- 3. Recruiter email tanpa GitHub boleh menyelesaikan onboarding.
select lives_ok(
  $$
  select public.complete_onboarding(
    array['recruiter'::public.user_role],
    null,
    null,
    'Email Recruiters Inc',
    'Talent Lead',
    array['ID'::char(2)]
  )
  $$,
  'Onboarding recruiter email berhasil tanpa menautkan GitHub'
);

-- 4. Data recruiter tersimpan.
select results_eq(
  $$
  select company, title
  from public.recruiter_profiles
  where user_id = '99999999-9999-4999-a999-999999999999'
  $$,
  $$ values ('Email Recruiters Inc'::text, 'Talent Lead'::text) $$,
  'recruiter_profiles email tersimpan'
);

-- 5. Listing developer ditolak karena belum ada identitas GitHub.
select throws_ok(
  $$
  select public.update_developer_settings(
    true,
    null,
    null,
    null
  )
  $$,
  '22000',
  'VALIDATION: GitHub account must be linked before enabling listing',
  'listed=true ditolak untuk akun email tanpa GitHub'
);

-- 6. Toggle non-listing tetap boleh untuk akun tanpa GitHub.
select lives_ok(
  $$
  select public.update_developer_settings(
    null,
    true,
    'open_to_work'::public.availability,
    null
  )
  $$,
  'open_to_messages/availability tetap bisa diubah tanpa GitHub'
);

select * from finish();
rollback;
