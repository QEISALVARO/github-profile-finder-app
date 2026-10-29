-- supabase/migrations/20261001000006_projects.sql
-- Tabel projects dan keyword_aliases

create table public.projects (
  id               uuid      primary key default gen_random_uuid(),
  owner_id         uuid      not null references public.profiles on delete cascade,
  github_repo_id   bigint    unique not null,
  name             text      not null,
  description      text,
  role             text      not null,
  country_code     char(2)   references public.countries,
  stack            jsonb     not null default ''[]'',
  demo_url         text,
  demo_verified    boolean   not null default false,
  stars            int       not null default 0,
  pushed_at        timestamptz,
  active           boolean generated always as (pushed_at > now() - interval ''30 days'') stored,
  score            int,
  published        boolean   not null default true,
  is_hidden        boolean   not null default false,
  search           tsvector,
  created_at       timestamptz not null default now()
);
comment on table public.projects is 'Proyek developer. search diisi trigger; active = generated.';
comment on column public.projects.country_code is 'Denormalisasi dari pemilik — trigger sinkronisasi saat profil berubah.';
comment on column public.projects.active is 'Generated: pushed_at dalam 30 hari terakhir (VERIFIED ACTIVE badge).';

create index projects_search_idx on public.projects using gin (search);
create index projects_rank_idx   on public.projects (published, is_hidden, score desc);
create index projects_country_idx on public.projects (country_code, published, is_hidden, score desc);

-- Fungsi untuk update search tsvector
create or replace function public.projects_search_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner_name text;
  owner_login text;
begin
  select p.name, p.login into owner_name, owner_login
  from public.profiles p where p.id = new.owner_id;

  new.search := to_tsvector(''english'',
    coalesce(new.name, '''') || '' '' ||
    coalesce(new.description, '''') || '' '' ||
    coalesce(new.role, '''') || '' '' ||
    coalesce(owner_name, '''') || '' '' ||
    coalesce(owner_login, '''')
  );
  return new;
end;
$$;

create trigger projects_search_update_trigger
  before insert or update on public.projects
  for each row execute function public.projects_search_update();

create table public.keyword_aliases (
  alias    text    primary key,
  expands  text[]  not null
);
comment on table public.keyword_aliases is 'Alias pencarian: golang->{go}, ml->{pytorch,tensorflow,...}';
