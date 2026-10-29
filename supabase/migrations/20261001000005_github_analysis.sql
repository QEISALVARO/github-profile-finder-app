-- supabase/migrations/20261001000005_github_analysis.sql
-- Tabel github_snapshots dan analyses

create table public.github_snapshots (
  login       text     primary key,
  github_id   bigint,
  user_json   jsonb    not null,
  repos_json  jsonb    not null,
  etag_user   text,
  fetched_at  timestamptz not null default now()
);
comment on table public.github_snapshots is 'Cache data publik GitHub. Tulis hanya service role (K4, POL-5).';

create table public.analyses (
  id               uuid    primary key default gen_random_uuid(),
  github_login     text    not null,
  score_version    int     not null,
  authenticity     int     not null check (authenticity between 0 and 100),
  confidence       int     not null check (confidence   between 0 and 100),
  breakdown        jsonb   not null,
  primary_language text,
  inferred_role    text,
  language_stats   jsonb,
  frameworks       text[],
  metrics          jsonb,
  heatmap          smallint[],
  created_at       timestamptz not null default now()
);
create index on public.analyses (github_login, created_at desc);
comment on table public.analyses is 'Hasil scoring v2. Tulis hanya service role (Edge Function analyze-developer).';
