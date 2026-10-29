-- supabase/migrations/20261001000015_extensions_schema.sql
-- Koreksi BE-0: pastikan schema `extensions` ada SEBELUM ekstensi dipasang.
-- Latar: migrasi 001 memakai `create extension ... schema extensions` tanpa
-- membuat schema-nya. Di Supabase Cloud schema itu sudah ada (bawaan),
-- tetapi di database Postgres polos maupun citra CLI fresh, statement gagal
-- dengan `schema "extensions" does not exist`, sehingga `supabase db reset`
-- gagal total. Idempoten dan aman di-rerun.

create schema if not exists extensions;

-- Pastikan ekstensi terpasang di schema yang benar (berlaku untuk DB yang
-- terlanjur di-reset sebelum koreksi ini ada).
create extension if not exists "pgcrypto" schema extensions;
create extension if not exists "pg_trgm"  schema extensions;
create extension if not exists "unaccent"  schema extensions;
-- pgtap hanya tersedia di stack Supabase (citra DB bawaan); di Postgres
-- polos lewati agar reset tetap jalan (test pgTAP butuh stack Supabase).
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pgtap') then
    create extension if not exists "pgtap" schema extensions;
  end if;
end $$;
