-- supabase/migrations/20261001000004_profiles.sql
-- Tabel profiles, developer_settings, recruiter_profiles

create table public.profiles (
  id                  uuid     primary key references auth.users on delete cascade,
  github_id           bigint   unique not null,
  login               text     not null,
  name                text,
  avatar_url          text,
  bio                 text,
  location_text       text,
  country_code        char(2)  references public.countries,
  city                text,
  country_source      text     check (country_source in (''self'', ''inferred'')),
  country_confidence  smallint check (country_confidence between 0 and 100),
  roles               public.user_role[] not null default '{}',
  created_at          timestamptz not null default now()
);
comment on table public.profiles is 'Profil pengguna Gitscope. Tanpa email (POL-2).';
comment on column public.profiles.country_code   is 'Domisili ISO 3166-1 alpha-2 (K11)';
comment on column public.profiles.country_source is 'self=dipilih sendiri (confidence 100); inferred=dari lokasi GitHub';
create index on public.profiles (country_code);

create table public.developer_settings (
  user_id          uuid      primary key references public.profiles on delete cascade,
  listed           boolean   not null default false,   -- opt-in Feed/Discover (POL-1)
  open_to_messages boolean   not null default false,   -- (POL-4)
  availability     public.availability not null default ''not_available'',
  headline         text
);
comment on table public.developer_settings is 'Pengaturan developer. listed=false default (POL-1, POL-4).';

create table public.recruiter_profiles (
  user_id          uuid      primary key references public.profiles on delete cascade,
  company          text      not null,
  title            text,
  verified         boolean   not null default false,
  hiring_status    text      not null default ''open_for_hiring'',
  target_countries char(2)[] not null default '{}'
);
comment on table public.recruiter_profiles is 'Profil recruiter. target_countries kosong = semua negara.';
