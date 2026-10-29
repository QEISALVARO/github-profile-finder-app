-- supabase/migrations/20261001000018_be3_projects.sql
-- BE-3: skema feed proyek — kolom hasil perhitungan, search tsvector
-- berbobot (simple+unaccent), rank, featured, audit. Idempoten; aman rerun.
-- Kolom perhitungan (score, demo_verified, stars, rank_score, visible)
-- HANYA ditulis Edge Function (service role) / trigger — klien dikunci di 019.

-- ─── 1. Kolom baru projects ──────────────────────────────────────────
alter table public.projects add column if not exists city text;
alter table public.projects add column if not exists owner_listed boolean not null default false;
alter table public.projects add column if not exists visible boolean not null default false;
alter table public.projects add column if not exists rank_score numeric(8,6) not null default 0;
alter table public.projects add column if not exists github_repo_id bigint;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'projects_github_repo_id_unique') then
    -- kolom sudah unique sejak 006 bagi DB baru; kunci dgn nama stabil utk DB lama
    begin
      alter table public.projects add constraint projects_github_repo_id_unique unique (github_repo_id);
    exception when duplicate_object then null;
    end;
  end if;
end $$;
alter table public.projects add column if not exists demo_url text;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='description') then
    begin
      alter table public.projects add constraint projects_description_len check (char_length(description) <= 500);
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ─── 2. Search tsvector berbobot (simple + unaccent) ─────────────────
-- Bobot: A=nama, B=role+stack, C=deskripsi, D=nama developer.
-- setweight perlu leksem bertipe tsvector: bangun per-bagian lalu gabung.
create or replace function public.projects_search_update()
returns trigger
language plpgsql
security invoker
set search_path = public, extensions
as $func$
declare
  owner_name text;
  owner_login text;
  stack_text text;
begin
  select p.name, p.login into owner_name, owner_login
  from public.profiles p where p.id = new.owner_id;

  select coalesce(string_agg(s->>'name', ' '), '') into stack_text
  from jsonb_array_elements(coalesce(new.stack, '[]'::jsonb)) s;

  new.search :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.name, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.role, '') || ' ' || stack_text)), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.description, ''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(owner_name, '') || ' ' || coalesce(owner_login, ''))), 'D');
  return new;
end;
$func$;

drop trigger if exists projects_search_update_trigger on public.projects;
create trigger projects_search_update_trigger
  before insert or update of name, description, role, stack, owner_id on public.projects
  for each row execute function public.projects_search_update();

-- active + visible + rank dihitung satu trigger (konsisten, satu tempat)
create or replace function public.projects_computed_update()
returns trigger
language plpgsql
security invoker
set search_path = public, extensions
as $func$
declare
  v_listed boolean;
begin
  new.active := new.pushed_at is not null
    and new.pushed_at > now() - interval '30 days';

  select coalesce(ds.listed = true, false) into v_listed
  from public.developer_settings ds where ds.user_id = new.owner_id;
  if not found then v_listed := false; end if;
  new.owner_listed := v_listed;

  -- country_code/city mengikuti profil bila belum diisi eksplisit.
  -- (Edge Function selalu mengisi; trigger menjamin konsistensi.)
  if new.country_code is null or new.city is null then
    select p.country_code, p.city into new.country_code, new.city
    from public.profiles p where p.id = new.owner_id;
  end if;

  new.visible := coalesce(new.published, true)
    and not coalesce(new.is_hidden, false)
    and coalesce(new.owner_listed, false);

  new.rank_score := public.project_rank(new.score, new.pushed_at, new.stars);
  return new;
end;
$func$;

drop trigger if exists projects_computed_update_trigger on public.projects;
create trigger projects_computed_update_trigger
  before insert or update of pushed_at, score, stars, published, is_hidden, owner_id on public.projects
  for each row execute function public.projects_computed_update();

-- Sinkron profil -> projects (perluas 011): country, city, owner_listed,
-- visible, rank. Dijaga satu fungsi agar konsisten dengan insert.
create or replace function public.sync_projects_owner()
returns trigger
language plpgsql
security invoker
set search_path = public, extensions
as $func$
declare
  v_listed boolean;
begin
  if tg_op = 'UPDATE' and tg_name = 'profiles_sync_projects_owner' then
    select coalesce(listed = true, false) into v_listed
    from public.developer_settings where user_id = new.id;
    if not found then v_listed := false; end if;
    update public.projects
    set country_code = new.country_code,
        city = new.city,
        owner_listed = v_listed,
        visible = published and not is_hidden and v_listed,
        rank_score = public.project_rank(score, pushed_at, stars)
    where owner_id = new.id;
  elsif tg_op = 'UPDATE' and tg_name = 'settings_sync_projects_owner' then
    update public.projects
    set owner_listed = (new.listed = true),
        visible = published and not is_hidden and (new.listed = true),
        rank_score = public.project_rank(score, pushed_at, stars)
    where owner_id = new.user_id;
  end if;
  return new;
end;
$func$;

drop trigger if exists profiles_sync_projects_owner on public.profiles;
create trigger profiles_sync_projects_owner
  after update of country_code, city on public.profiles
  for each row execute function public.sync_projects_owner();

drop trigger if exists settings_sync_projects_owner on public.developer_settings;
create trigger settings_sync_projects_owner
  after update of listed on public.developer_settings
  for each row execute function public.sync_projects_owner();

-- ─── 3. project_rank + refresh harian ────────────────────────────────
create or replace function public.project_rank(p_score int, p_pushed_at timestamptz, p_stars int)
returns numeric
language sql
immutable
set search_path = public, extensions
as $$
  select round((
    0.5 * (coalesce(p_score, 0)::numeric / 100)
    + 0.3 * greatest(0, least(1, 1 - (extract(epoch from now() - coalesce(p_pushed_at, now() - interval '400 days'))) / 31536000))
    + 0.2 * least(1, ln(1 + greatest(0, coalesce(p_stars, 0))) / ln(100001))
  )::numeric, 6)
$$;

create or replace function public.refresh_rank_scores()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_n integer;
begin
  update public.projects
  set rank_score = public.project_rank(score, pushed_at, stars);
  get diagnostics v_n = row_count;
  return v_n;
end;
$func$;

-- ─── 4. Tabel featured + audit ───────────────────────────────────────
create table if not exists public.featured_projects (
  week_start date not null,
  rank int not null,
  project_id uuid not null references public.projects on delete cascade,
  primary key (week_start, rank)
);
alter table public.featured_projects enable row level security;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid,
  action text,
  target_type text,
  target_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;

create or replace function public.refresh_featured(p_n int default 10)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_week date := date_trunc('week', now())::date;
  v_n integer := 0;
begin
  delete from public.featured_projects where week_start = v_week;
  insert into public.featured_projects (week_start, rank, project_id)
  select v_week, row_number() over (order by rank_score desc, id desc), id
  from public.projects
  where visible = true and active = true
  order by rank_score desc, id desc
  limit greatest(1, least(50, coalesce(p_n, 10)));
  get diagnostics v_n = row_count;
  return v_n;
end;
$func$;

-- ─── 5. Indeks BE-3 ──────────────────────────────────────────────────
create index if not exists projects_visible_rank_idx on public.projects (rank_score desc, id desc) where visible = true;
create index if not exists projects_visible_country_idx on public.projects (country_code) where visible = true;
create index if not exists projects_visible_city_idx on public.projects (country_code, lower(city)) where visible = true;
create index if not exists projects_visible_role_idx on public.projects (role) where visible = true;
create index if not exists projects_name_trgm_idx on public.projects using gin (name extensions.gin_trgm_ops);
