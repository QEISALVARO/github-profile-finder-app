-- supabase/migrations/20261001000012_rpcs.sql
-- RPC (SECURITY INVOKER, validasi ketat, hanya untuk auth.uid())
-- PRD v2 §6 — alur onboarding dan pembaruan profil

-- ─── complete_onboarding ──────────────────────────────────────────────────────
create or replace function public.complete_onboarding(
  p_roles            public.user_role[],
  p_country_code     char(2)  default null,
  p_city             text     default null,
  p_company          text     default null,
  p_title            text     default null,
  p_target_countries char(2)[] default '{}'
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Validasi: harus login
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  -- Update roles
  update public.profiles
  set roles = p_roles
  where id = auth.uid();

  -- Developer: set negara (self, confidence 100)
  if 'developer' = any(p_roles) then
    update public.profiles
    set
      country_code       = p_country_code,
      city               = p_city,
      country_source     = case when p_country_code is not null then 'self' else null end,
      country_confidence = case when p_country_code is not null then 100 else null end
    where id = auth.uid();

    -- Buat baris developer_settings bila belum ada
    insert into public.developer_settings (user_id)
    values (auth.uid())
    on conflict (user_id) do nothing;
  end if;

  -- Recruiter: wajib company, buat recruiter_profiles
  if 'recruiter' = any(p_roles) then
    if p_company is null or trim(p_company) = '' then
      raise exception 'VALIDATION: company is required for recruiter role'
        using errcode = '22000';
    end if;

    insert into public.recruiter_profiles (user_id, company, title, target_countries)
    values (auth.uid(), trim(p_company), p_title, coalesce(p_target_countries, '{}'::char(2)[]))
    on conflict (user_id) do update set
      company          = excluded.company,
      title            = excluded.title,
      target_countries = excluded.target_countries;
  end if;
end;
$$;

comment on function public.complete_onboarding is
  'RPC onboarding: set roles, negara developer (self), recruiter_profiles. Hanya untuk auth.uid().';

-- ─── set_country ──────────────────────────────────────────────────────────────
create or replace function public.set_country(
  p_country_code char(2),
  p_city         text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  -- Validasi negara ada di tabel countries
  if p_country_code is not null and not exists (
    select 1 from public.countries where iso2 = p_country_code
  ) then
    raise exception 'VALIDATION: invalid country_code %', p_country_code
      using errcode = '22000';
  end if;

  update public.profiles
  set
    country_code       = p_country_code,
    city               = p_city,
    country_source     = case when p_country_code is not null then 'self' else null end,
    country_confidence = case when p_country_code is not null then 100 else null end
  where id = auth.uid();
end;
$$;

comment on function public.set_country is
  'RPC: developer menetapkan negara sendiri (country_source=self, confidence=100).';

-- ─── update_developer_settings ────────────────────────────────────────────────
create or replace function public.update_developer_settings(
  p_listed           boolean     default null,
  p_open_to_messages boolean     default null,
  p_availability     public.availability default null,
  p_headline         text        default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  insert into public.developer_settings (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  update public.developer_settings
  set
    listed           = coalesce(p_listed,           listed),
    open_to_messages = coalesce(p_open_to_messages, open_to_messages),
    availability     = coalesce(p_availability,     availability),
    headline         = coalesce(p_headline,         headline)
  where user_id = auth.uid();
  -- POL-9 dicheck oleh trigger developer_settings_pol9_check
end;
$$;

comment on function public.update_developer_settings is
  'RPC: update developer_settings. listed=true ditolak bila country_code NULL (POL-9 via trigger).';

-- ─── update_recruiter_profile ─────────────────────────────────────────────────
create or replace function public.update_recruiter_profile(
  p_company          text     default null,
  p_title            text     default null,
  p_hiring_status    text     default null,
  p_target_countries char(2)[] default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  if p_company is not null and trim(p_company) = '' then
    raise exception 'VALIDATION: company cannot be empty'
      using errcode = '22000';
  end if;

  update public.recruiter_profiles
  set
    company          = coalesce(p_company,          company),
    title            = coalesce(p_title,            title),
    hiring_status    = coalesce(p_hiring_status,    hiring_status),
    target_countries = coalesce(p_target_countries, target_countries)
  where user_id = auth.uid();
end;
$$;

comment on function public.update_recruiter_profile is
  'RPC: update recruiter_profiles. Hanya untuk auth.uid().';
