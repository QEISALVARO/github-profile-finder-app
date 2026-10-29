-- supabase/migrations/20261001000001_extensions.sql
-- Ekstensi yang diperlukan

create extension if not exists "pgcrypto"   schema extensions;
create extension if not exists "pg_trgm"    schema extensions;
create extension if not exists "unaccent"   schema extensions;
create extension if not exists "pgtap"      schema extensions;
