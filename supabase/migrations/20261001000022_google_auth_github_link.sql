-- supabase/migrations/20261001000022_google_auth_github_link.sql
-- Login Google + wajib menghubungkan GitHub sebelum onboarding.
--
-- Alur baru:
--   1. User masuk dengan GitHub (seperti sebelumnya) → profil lengkap, onboarding.
--   2. User masuk dengan Google → profil belum punya identitas GitHub. Sebelum
--      onboarding, app meminta user menghubungkan GitHub lewat `linkIdentity()`;
--      RPC `connect_github_identity()` menyalin identitas GitHub yang SUDAH
--      diverifikasi Supabase (auth.identities) ke profil.
--
-- Konsekuensi skema:
--   * Identitas GitHub di profiles boleh kosong (akun Google yang belum link).
--   * `auth_provider` mencatat metode login utama ('github' | 'google').
--   * Trigger auth membuat profil untuk kedua provider.
--   * `complete_onboarding` menolak sesi tanpa GitHub (guard server, bukan UI).
--
-- POL-2 tetap: tidak ada email di kolom publik profiles, dan scope GitHub tetap
-- `read:user` (tanpa email).

-- ─── 1. Identitas GitHub opsional ─────────────────────────────────────────────

alter table public.profiles alter column github_id   drop not null;
alter table public.profiles alter column login       drop not null;
alter table public.profiles alter column github_login drop not null;

comment on column public.profiles.github_login is
  'Login GitHub lowercase. NULL selama akun Google belum menghubungkan GitHub.';

-- ─── 2. Metode login ─────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists auth_provider text not null default 'github';

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_auth_provider_check'
  ) then
    alter table public.profiles
      add constraint profiles_auth_provider_check
      check (auth_provider in ('github', 'google'));
  end if;
end $$;

-- Baris lama tanpa identitas GitHub tidak mungkin ada sebelum migrasi ini,
-- tetapi backfill tetap aman dijalankan berulang.
update public.profiles
set auth_provider = case when github_id is null then 'google' else 'github' end
where auth_provider is distinct from case when github_id is null then 'google' else 'github' end;

comment on column public.profiles.auth_provider is
  'Metode login utama: github = OAuth GitHub, google = OAuth Google (GitHub dihubungkan setelah login).';

-- ─── 3. Trigger auth untuk GitHub + Google ───────────────────────────────────
-- Handle akun Google sengaja TIDAK memakai email (POL-2): profiles bisa dibaca
-- user lain lewat RLS chat/feed, jadi email tidak boleh masuk tabel publik.

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
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Trigger: buat profiles untuk user GitHub maupun Google. Akun Google belum punya identitas GitHub (POL-2: tanpa email di kolom publik).';

drop trigger if exists on_auth_user_created on auth.users;
-- Fungsi lama hanya menangani GitHub; sudah digantikan `handle_new_user`.
drop function if exists public.handle_new_github_user();
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── 4. Hubungkan identitas GitHub ke profil ─────────────────────────────────
-- Sumber data = auth.identities (hasil verifikasi Supabase), bukan kiriman
-- klien. Dengan begitu login GitHub tidak bisa dipalsukan dari app.

create or replace function public.connect_github_identity()
returns table (login text, github_id bigint, name text, avatar_url text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_data      jsonb;
  v_github_id bigint;
  v_login     text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  select i.identity_data into v_data
  from auth.identities i
  where i.user_id = auth.uid() and i.provider = 'github'
  order by i.created_at
  limit 1;

  if v_data is null then
    raise exception 'VALIDATION: GitHub identity not linked' using errcode = '22000';
  end if;

  v_github_id := nullif(v_data->>'provider_id', '')::bigint;
  v_login     := coalesce(v_data->>'user_name', v_data->>'preferred_username');

  if v_github_id is null or v_login is null then
    raise exception 'VALIDATION: GitHub identity data incomplete' using errcode = '22000';
  end if;

  -- Izinkan trigger penjaga identitas menerima perubahan dari fungsi ini.
  perform set_config('gitscope.github_link', 'on', true);

  begin
    update public.profiles p
    set
      github_id    = v_github_id,
      login        = v_login,
      github_login = lower(v_login),
      name         = coalesce(nullif(p.name, ''), v_data->>'full_name', v_login),
      avatar_url   = coalesce(nullif(v_data->>'avatar_url', ''), p.avatar_url),
      bio          = coalesce(p.bio, nullif(v_data->>'bio', ''))
    where p.id = auth.uid();
  exception when unique_violation then
    -- github_login / github_id sudah dipakai akun Gitscope lain.
    raise exception 'CONFLICT: GitHub account already linked to another user'
      using errcode = '23505';
  end;

  if not found then
    raise exception 'UNAUTHORIZED: profile missing' using errcode = '28000';
  end if;

  return query
    select p.login, p.github_id, p.name, p.avatar_url
    from public.profiles p
    where p.id = auth.uid();
end;
$$;

comment on function public.connect_github_identity() is
  'RPC: tautkan identitas GitHub yang sudah diverifikasi Supabase ke profil auth.uid(). Wajib sebelum onboarding untuk akun Google.';

-- Identitas GitHub hanya boleh berubah lewat connect_github_identity().
-- Tanpa trigger ini, klien bisa `update profiles set github_login = '...'`
-- langsung lewat PostgREST (policy owner update tidak membatasi kolom) dan
-- melewati kewajiban penautan. Panggilan service_role (auth.uid() null) dan
-- RPC di atas (flag transaksi `gitscope.github_link`) tetap lolos.
create or replace function public.protect_github_identity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if current_setting('gitscope.github_link', true) = 'on' then
    return new;
  end if;

  if new.github_id    is distinct from old.github_id
     or new.github_login is distinct from old.github_login
     or new.login        is distinct from old.login
     or new.auth_provider is distinct from old.auth_provider then
    raise exception 'VALIDATION: GitHub identity can only be changed via connect_github_identity()'
      using errcode = '22000';
  end if;

  return new;
end;
$$;

comment on function public.protect_github_identity() is
  'Trigger: kolom identitas GitHub di profiles hanya bisa ditulis RPC connect_github_identity().';

drop trigger if exists profiles_protect_github_identity on public.profiles;
create trigger profiles_protect_github_identity
  before update on public.profiles
  for each row execute function public.protect_github_identity();

revoke all on function public.connect_github_identity() from public;
grant execute on function public.connect_github_identity() to authenticated;

-- ─── 5. complete_onboarding: wajib GitHub ────────────────────────────────────
-- Body identik dengan 012 + dua guard: profil harus ada, dan sesi harus sudah
-- punya identitas GitHub. Guard ini yang membuat aturan "hubungkan GitHub
-- sebelum onboarding" berlaku di server, bukan hanya disembunyikan di UI.

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
declare
  v_github_login text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  select github_login into v_github_login
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'UNAUTHORIZED: profile missing' using errcode = '28000';
  end if;

  if v_github_login is null then
    raise exception 'VALIDATION: GitHub account must be linked before onboarding'
      using errcode = '22000';
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
  'RPC onboarding: set roles, negara developer (self), recruiter_profiles. Wajib sudah menghubungkan GitHub.';
