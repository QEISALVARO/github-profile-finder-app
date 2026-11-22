-- supabase/migrations/20261001000023_recruiter_email_auth.sql
-- P0 — login email/password untuk recruiter + penghentian kewajiban GitHub
-- sebelum onboarding.
--
-- Alur baru:
--   1. User daftar/masuk dengan email & provider Email bawaan Supabase.
--   2. Trigger handle_new_user membuat baris profiles TANPA identitas GitHub
--      (login placeholder, github_login NULL, auth_provider = 'email').
--   3. Onboarding semua peran diizinkan tanpa GitHub. Kewajiban GitHub hanya
--      menempel pada fitur yang benar-benar butuh identitas/ownership GitHub:
--      saat ini mengaktifkan listing developer (update_developer_settings
--      dengan p_listed = true).
--   4. Login GitHub dan Google serta penautan manual (linkIdentity) TIDAK
--      berubah — migrasi 022 tetap berlaku.
--
-- POL-2 tetap: tidak ada email di kolom publik profiles; email hanya hidup di
-- auth.users dan sesi lokal klien.

-- ─── 1. auth_provider mengenal 'email' ────────────────────────────────────────

alter table public.profiles drop constraint if exists profiles_auth_provider_check;
alter table public.profiles
  add constraint profiles_auth_provider_check
  check (auth_provider in ('github', 'google', 'email'));

-- ─── 2. Trigger auth: cabang email/password ───────────────────────────────────
-- handle_new_user sudah menangani 'github' (022 §3) dan 'google' (022 §3).
-- Cabang email meniru pola Google: login placeholder tanpa data GitHub.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_github_id  bigint;
  v_login      text;
  v_name       text;
  v_avatar_url text;
  v_bio        text;
  v_location   text;
  v_provider   text;
begin
  v_provider := coalesce(new.raw_app_meta_data->>'provider', 'github');

  v_github_id := nullif(new.raw_user_meta_data->>'provider_id', '')::bigint;
  v_login     := coalesce(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'login'
  );

  -- GitHub OAuth — perilaku lama, idempoten.
  if v_provider = 'github' and v_login is not null and v_github_id is not null then
    v_name       := new.raw_user_meta_data->>'full_name';
    v_avatar_url := new.raw_user_meta_data->>'avatar_url';
    v_bio        := new.raw_user_meta_data->>'description';
    v_location   := new.raw_user_meta_data->>'location';

    insert into public.profiles (
      id, github_id, login, github_login, name, avatar_url, bio, location_text, auth_provider
    ) values (
      new.id, v_github_id, v_login, lower(v_login), v_name, v_avatar_url, v_bio, v_location, 'github'
    )
    on conflict (id) do nothing;

    return new;
  end if;

  -- Google OAuth — profil tanpa identitas GitHub sampai user menautkannya.
  if v_provider = 'google' then
    insert into public.profiles (id, login, name, avatar_url, auth_provider)
    values (
      new.id,
      'user-' || substr(md5(new.id::text), 1, 6),
      nullif(coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name'
      ), ''),
      nullif(coalesce(
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'picture'
      ), ''),
      'google'
    )
    on conflict (id) do nothing;

    return new;
  end if;

  -- Email/password — profil tanpa identitas GitHub sama sekali. Login
  -- placeholder sama bentuknya dengan Google ('user-' + md5) supaya tidak ada
  -- yang salah mengira local-part email adalah login GitHub.
  if v_provider in ('email', 'password') then
    insert into public.profiles (id, login, name, avatar_url, auth_provider)
    values (
      new.id,
      'user-' || substr(md5(new.id::text), 1, 6),
      nullif(coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name'
      ), ''),
      nullif(coalesce(
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'picture'
      ), ''),
      'email'
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Trigger: buat profiles untuk user GitHub, Google, maupun email/password. Akun non-GitHub belum punya identitas GitHub (POL-2: tanpa email di kolom publik).';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── 3. complete_onboarding: tidak lagi mewajibkan GitHub ─────────────────────
-- Guard pindah ke fiturnya (lihat §4). Onboarding recruiter maupun developer
-- boleh tanpa GitHub; aturan "hubungkan GitHub" kini menempel pada fitur yang
-- butuh identitas GitHub, bukan pada gerbang masuk aplikasi.

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
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'UNAUTHORIZED: profile missing' using errcode = '28000';
  end if;

  update public.profiles
  set roles = p_roles
  where id = auth.uid();

  if 'developer' = any(p_roles) then
    update public.profiles
    set
      country_code       = p_country_code,
      city               = p_city,
      country_source     = case when p_country_code is not null then 'self' else null end,
      country_confidence = case when p_country_code is not null then 100 else null end
    where id = auth.uid();

    insert into public.developer_settings (user_id)
    values (auth.uid())
    on conflict (user_id) do nothing;
  end if;

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
  'RPC onboarding: set roles, negara developer (self), recruiter_profiles. Tanpa syarat GitHub — kewajiban GitHub menempel di fitur (lihat update_developer_settings).';

-- ─── 4. update_developer_settings: listing wajib identitas GitHub ─────────────
-- Listing membuat profil developer tampil ke publik dengan data GitHub, jadi
-- fitur ini (bukan onboarding) yang mewajibkan github_login. Toggle lain
-- (open_to_messages, availability) tetap terbuka untuk akun non-GitHub.

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
declare
  v_github_login text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  if coalesce(p_listed, false) then
    select github_login into v_github_login
    from public.profiles
    where id = auth.uid();

    if v_github_login is null then
      raise exception 'VALIDATION: GitHub account must be linked before enabling listing'
        using errcode = '22000';
    end if;
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
  'RPC: update developer_settings. listed=true ditolak bila country_code NULL (POL-9) atau profil belum punya GitHub.';
