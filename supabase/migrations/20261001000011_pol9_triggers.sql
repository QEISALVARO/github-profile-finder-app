-- supabase/migrations/20261001000011_pol9_triggers.sql
-- POL-9: listed=true hanya boleh bila country_code terisi
-- Trigger BEFORE INSERT/UPDATE pada developer_settings
-- Trigger AFTER UPDATE OF country_code pada profiles

-- ─── Trigger: tolak listed=true bila country_code NULL ───────────────────────
create or replace function public.enforce_pol9_listed()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_country_code char(2);
begin
  -- Cek hanya bila listed=true
  if new.listed = true then
    select p.country_code into v_country_code
    from public.profiles p
    where p.id = new.user_id;

    if v_country_code is null then
      raise exception using
        errcode = ''P0001'',
        message = ''POL9_COUNTRY_REQUIRED: developer cannot be listed without a confirmed country_code'';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.enforce_pol9_listed() is
  'POL-9: tolak listed=true bila profiles.country_code NULL. Error terstruktur POL9_COUNTRY_REQUIRED.';

create trigger developer_settings_pol9_check
  before insert or update of listed on public.developer_settings
  for each row execute function public.enforce_pol9_listed();

-- ─── Trigger: auto-unlist bila country_code dikosongkan ──────────────────────
create or replace function public.unlist_on_country_clear()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Hanya bila country_code berubah menjadi NULL
  if new.country_code is null and old.country_code is not null then
    update public.developer_settings
    set listed = false
    where user_id = new.id and listed = true;
  end if;
  return new;
end;
$$;

comment on function public.unlist_on_country_clear() is
  'POL-9: otomatis matikan listed bila country_code dikosongkan dari profiles.';

create trigger profiles_unlist_on_country_clear
  after update of country_code on public.profiles
  for each row execute function public.unlist_on_country_clear();

-- ─── Trigger: sinkronisasi projects.country_code saat profil berubah ─────────
create or replace function public.sync_projects_country()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Update country_code semua proyek pemilik
  if new.country_code is distinct from old.country_code then
    update public.projects
    set country_code = new.country_code
    where owner_id = new.id;
  end if;
  return new;
end;
$$;

comment on function public.sync_projects_country() is
  'Sinkronisasi projects.country_code saat profiles.country_code berubah (PRD v2 §11A).';

create trigger profiles_sync_projects_country
  after update of country_code on public.profiles
  for each row execute function public.sync_projects_country();
