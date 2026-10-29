-- supabase/tests/04_pol9_enforcement.sql
-- pgTAP: Verifikasi penegakan aturan POL-9 (PRD V2 §3 POL-9)
-- "developer_settings.listed = true hanya bila profiles.country_code terisi"
-- "Trigger BEFORE INSERT/UPDATE menolak dengan error terstruktur POL9_COUNTRY_REQUIRED"
-- "Trigger AFTER UPDATE OF country_code ON profiles mematikan listed bila negara dikosongkan"
-- "Sinkron projects.country_code saat negara profil berubah"

begin;
select plan(4);

-- 1. Siapkan user tanpa country_code
insert into auth.users (id, aud, role, email) values
  ('f1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'userf@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, github_id, login, github_login, roles, country_code) values
  ('f1111111-1111-4111-a111-111111111111', 999001, 'user_f', 'user_f', '{developer}', null)
on conflict (id) do update set country_code = null;

-- Test 1: Mencoba set listed = true pada developer tanpa country_code WAJIB ditolak dengan POL9_COUNTRY_REQUIRED
select throws_ok(
  $$
  insert into public.developer_settings (user_id, listed)
  values ('f1111111-1111-4111-a111-111111111111', true)
  $$,
  'POL9_COUNTRY_REQUIRED',
  'Menyetel listed=true tanpa country_code wajib ditolak oleh trigger POL-9'
);

-- 2. Isi country_code dan coba kembali
update public.profiles
set country_code = 'ID'
where id = 'f1111111-1111-4111-a111-111111111111';

-- Test 2: Sekarang set listed = true harus berhasil
select lives_ok(
  $$
  insert into public.developer_settings (user_id, listed)
  values ('f1111111-1111-4111-a111-111111111111', true)
  on conflict (user_id) do update set listed = true
  $$,
  'Menyetel listed=true setelah country_code terisi harus berhasil'
);

-- Siapkan proyek untuk user F (kolom mengikuti skema 006 nyata)
insert into public.projects (id, owner_id, github_repo_id, name, role, country_code) values
  ('f2222222-2222-4222-a222-222222222222', 'f1111111-1111-4111-a111-111111111111', 201, 'my-project', 'Back-End', 'ID')
on conflict (id) do nothing;

-- 3. Kosongkan country_code di profiles
update public.profiles
set country_code = null
where id = 'f1111111-1111-4111-a111-111111111111';

-- Test 3: Trigger AFTER UPDATE harus otomatis mematikan listed = false
select results_eq(
  'select listed from public.developer_settings where user_id = 'f1111111-1111-4111-a111-111111111111'',
  array[false],
  'Mengosongkan profiles.country_code wajib otomatis mematikan developer_settings.listed'
);

-- Test 4: projects.country_code juga tersinkronisasi menjadi null
select results_eq(
  'select country_code from public.projects where owner_id = 'f1111111-1111-4111-a111-111111111111'',
  array[null::char(2)],
  'Mengosongkan profiles.country_code wajib menyinkronkan projects.country_code'
);

select * from finish();
rollback;
