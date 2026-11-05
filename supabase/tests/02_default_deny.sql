-- supabase/tests/02_default_deny.sql
-- pgTAP: Verifikasi default-deny untuk peran anon dan authenticated tanpa hak istimewa

begin;
set search_path = public, extensions;
select plan(4);

-- 1. Peran anon tidak boleh membaca data privat (mis. developer_settings, pipeline_entries, messages)
set local role anon;

select is_empty(
  'select * from public.developer_settings',
  'Anon tidak bisa membaca developer_settings (default-deny)'
);

select throws_ok(
  'select * from public.pipeline_entries',
  '42501',
  null,
  'Anon ditolak membaca pipeline_entries (RPC-only sejak BE-4)'
);

select is_empty(
  'select * from public.messages',
  'Anon tidak bisa membaca messages (default-deny)'
);

-- 2. Peran authenticated biasa tidak boleh menulis ke tabel analyses (hanya service_role).
-- Kolom memakai skema nyata (005+014): insert valid secara kolom sehingga
-- penolakan yang terjadi benar-benar dari RLS, bukan dari kolom tak dikenal.
set local role authenticated;
set local "request.jwt.claim.sub" to '99999999-9999-4999-a999-999999999999';

select throws_ok(
  $$
  insert into public.analyses (
    github_login, score_version, authenticity, confidence, breakdown, facts
  ) values (
    'testuser', 2, 85, 90, '{}', '{}'
  )
  $$,
  null,
  'Pengguna authenticated tidak bisa menulis langsung ke tabel analyses (hanya service_role)'
);

select * from finish();
rollback;
