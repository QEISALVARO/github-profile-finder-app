-- supabase/migrations/20261001000003_geo_tables.sql
-- Tabel countries dan cities

create table public.countries (
  iso2          char(2) primary key,
  name          text    not null,
  name_local    text,
  region        text,
  aliases       text[]  not null default '{}'
);
comment on table public.countries is 'ISO 3166-1 alpha-2 negara untuk filter lokasi (PRD v2 §11A)';

create table public.cities (
  id            bigint  primary key,
  country_code  char(2) not null references public.countries,
  name          text    not null,
  aliases       text[]  not null default '{}',
  population    int
);
create index on public.cities (country_code);
comment on table public.cities is 'Dataset kota terkurasi — lihat docs/backend/decisions.md §kota';
