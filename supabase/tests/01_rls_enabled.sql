-- supabase/tests/01_rls_enabled.sql
-- pgTAP: Verifikasi bahwa SEMUA tabel di skema public memiliki Row Level Security (RLS) aktif

begin;
select plan(2);

-- Test 1: Pastikan tabel ada di skema public
select isnt_empty(
  'select tablename from pg_tables where schemaname = 'public'',
  'Tabel-tabel public harus ada'
);

-- Test 2: Tidak boleh ada tabel public yang RLS-nya nonaktif (rowsecurity = false)
select is_empty(
  $$
  select c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = false
  $$,
  'SEMUA tabel di skema public WAJIB mengaktifkan RLS (relrowsecurity = true)'
);

select * from finish();
rollback;
