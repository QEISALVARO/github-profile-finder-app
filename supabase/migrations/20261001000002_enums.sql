-- supabase/migrations/20261001000002_enums.sql
-- Enum types untuk Gitscope

create type public.user_role      as enum ('developer', 'recruiter');
create type public.availability   as enum ('open_to_work', 'freelance', 'not_available');
create type public.pipeline_stage as enum ('saved', 'interviewing', 'hired');
