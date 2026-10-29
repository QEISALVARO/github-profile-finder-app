-- supabase/tests/03_rls_policies.sql
-- pgTAP: Verifikasi kebijakan RLS spesifik per tabel (PRD V2 §7.1)

begin;
select plan(7);

-- Siapkan data uji untuk simulasi RLS
-- User A (Developer di ID, listed=true)
-- User B (Developer di SG, listed=false)
-- User C (Recruiter)
insert into auth.users (id, aud, role, email) values
  ('a1111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'usera@test.com'),
  ('b2222222-2222-4222-a222-222222222222', 'authenticated', 'authenticated', 'userb@test.com'),
  ('c3333333-3333-4333-a333-333333333333', 'authenticated', 'authenticated', 'userc@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, github_login, name, roles, country_code, city, country_source) values
  ('a1111111-1111-4111-a111-111111111111', 'user_a', 'User A', '{developer}', 'ID', 'Jakarta', 'self'),
  ('b2222222-2222-4222-a222-222222222222', 'user_b', 'User B', '{developer}', 'SG', 'Singapore', 'self'),
  ('c3333333-3333-4333-a333-333333333333', 'user_c', 'User C Recruiter', '{recruiter}', 'ID', 'Jakarta', 'self')
on conflict (id) do nothing;

insert into public.developer_settings (user_id, listed, open_to_messages) values
  ('a1111111-1111-4111-a111-111111111111', true, true),
  ('b2222222-2222-4222-a222-222222222222', false, false)
on conflict (user_id) do nothing;

insert into public.projects (id, owner_id, repo_id, repo_name, published, is_hidden, country_code) values
  ('d1111111-1111-4111-a111-111111111111', 'a1111111-1111-4111-a111-111111111111', 101, 'user_a/repo-a', true, false, 'ID'),
  ('d2222222-2222-4222-a222-222222222222', 'b2222222-2222-4222-a222-222222222222', 102, 'user_b/repo-b', true, false, 'SG')
on conflict (id) do nothing;

-- 1. Switch ke User C (Recruiter)
set local role authenticated;
set local "request.jwt.claim.sub" to 'c3333333-3333-4333-a333-333333333333';

-- Test 1: User C bisa melihat profil User A karena User A listed=true
select results_eq(
  'select github_login from public.profiles where id = 'a1111111-1111-4111-a111-111111111111'',
  array['user_a'],
  'Recruiter dapat melihat profil developer yang listed=true'
);

-- Test 2: User C TIDAK bisa melihat profil User B karena User B listed=false
select is_empty(
  'select github_login from public.profiles where id = 'b2222222-2222-4222-a222-222222222222'',
  'Recruiter TIDAK DAPAT melihat profil developer yang listed=false'
);

-- Test 3: User C bisa melihat project User A (karena listed & published & not hidden)
select results_eq(
  'select repo_name from public.projects where id = 'd1111111-1111-4111-a111-111111111111'',
  array['user_a/repo-a'],
  'Proyek milik developer listed dapat dilihat di feed'
);

-- Test 4: User C TIDAK bisa melihat project User B (karena owner listed=false)
select is_empty(
  'select repo_name from public.projects where id = 'd2222222-2222-4222-a222-222222222222'',
  'Proyek milik developer unlisted TIDAK DAPAT dilihat di feed'
);

-- Kembali ke superuser/service_role untuk test percakapan
reset role;

-- Buat percakapan aktif antara User C dan User A, dan percakapan diblokir antara User C dan User B
insert into public.conversations (id, recruiter_id, developer_id, status) values
  ('e1111111-1111-4111-a111-111111111111', 'c3333333-3333-4333-a333-333333333333', 'a1111111-1111-4111-a111-111111111111', 'active'),
  ('e2222222-2222-4222-a222-222222222222', 'c3333333-3333-4333-a333-333333333333', 'b2222222-2222-4222-a222-222222222222', 'blocked')
on conflict (id) do nothing;

-- Switch ke User C
set local role authenticated;
set local "request.jwt.claim.sub" to 'c3333333-3333-4333-a333-333333333333';

-- Test 5: Peserta percakapan bisa melihat percakapan
select results_eq(
  'select id from public.conversations where id = 'e1111111-1111-4111-a111-111111111111'',
  array['e1111111-1111-4111-a111-111111111111'::uuid],
  'Peserta percakapan dapat melihat percakapannya'
);

-- Test 6: Mengirim pesan di percakapan aktif berhasil
select lives_ok(
  $$
  insert into public.messages (conversation_id, sender_id, body)
  values ('e1111111-1111-4111-a111-111111111111', 'c3333333-3333-4333-a333-333333333333', 'Halo developer!')
  $$,
  'Peserta dapat mengirim pesan pada percakapan yang aktif'
);

-- Test 7: Mengirim pesan di percakapan yang blocked DITOLAK
select throws_ok(
  $$
  insert into public.messages (conversation_id, sender_id, body)
  values ('e2222222-2222-4222-a222-222222222222', 'c3333333-3333-4333-a333-333333333333', 'Pesan yang harus gagal')
  $$,
  null,
  'Kirim pesan pada percakapan dengan status blocked/declined WAJIB ditolak oleh RLS'
);

select * from finish();
rollback;
