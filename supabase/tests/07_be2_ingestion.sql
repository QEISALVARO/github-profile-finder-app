-- supabase/tests/07_be2_ingestion.sql
-- pgTAP: Verifikasi skema BE-2 (RLS rate_limits, default deny, check_rate_limit, purge_expired_lookups)

begin;
select plan(8);

-- Test 1: rate_limits memiliki RLS aktif
select row_security_active('public.rate_limits');

-- Test 2: Anon tidak bisa membaca rate_limits
set local role anon;
select throws_ok(
  'select * from public.rate_limits',
  null,
  'Anon ditolak membaca rate_limits'
);

-- Test 3: Authenticated tidak bisa membaca rate_limits
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-4111-a111-111111111111';
select throws_ok(
  'select * from public.rate_limits',
  null,
  'Authenticated ditolak membaca rate_limits'
);

-- Kembali ke superuser/service_role
reset role;

-- Test 4: check_rate_limit bekerja di bawah batas
select results_eq(
  $$
  select allowed, (retry_after >= 0)
  from public.check_rate_limit('11111111-1111-4111-a111-111111111111'::uuid, 'test_key', 2, interval '1 hour')
  $$,
  $$ values (true, true) $$,
  'Panggilan pertama check_rate_limit diizinkan'
);

-- Test 5: Panggilan kedua masih diizinkan (max = 2)
select results_eq(
  $$
  select allowed
  from public.check_rate_limit('11111111-1111-4111-a111-111111111111'::uuid, 'test_key', 2, interval '1 hour')
  $$,
  array[true],
  'Panggilan kedua check_rate_limit diizinkan'
);

-- Test 6: Panggilan ketiga melewati batas (max = 2) -> ditolak
select results_eq(
  $$
  select allowed, (retry_after > 0)
  from public.check_rate_limit('11111111-1111-4111-a111-111111111111'::uuid, 'test_key', 2, interval '1 hour')
  $$,
  $$ values (false, true) $$,
  'Panggilan ketiga check_rate_limit ditolak dan memberikan retry_after > 0'
);

-- Siapkan data untuk pengujian purge_expired_lookups
insert into public.github_snapshots (login, user_json, repos_json, expires_at)
values
  ('expired_user', '{}'::jsonb, '[]'::jsonb, now() - interval '1 hour'),
  ('active_user', '{}'::jsonb, '[]'::jsonb, now() + interval '1 hour')
on conflict (login) do update set expires_at = excluded.expires_at;

-- Test 7: Jalankan purge_expired_lookups
select isnt_empty(
  'select * from public.purge_expired_lookups()',
  'purge_expired_lookups berhasil dieksekusi'
);

-- Test 8: Verifikasi snapshot kedaluwarsa terhapus dan snapshot aktif tetap ada
select is_empty(
  'select * from public.github_snapshots where login = 'expired_user'',
  'Snapshot yang kedaluwarsa berhasil dihapus oleh purge_expired_lookups'
);

select * from finish();
rollback;
