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
create extension if not exists "pgtap"     schema extensions;
