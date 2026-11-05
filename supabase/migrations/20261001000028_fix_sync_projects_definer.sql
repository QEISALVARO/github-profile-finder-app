-- 20261001000028_fix_sync_projects_definer.sql
-- BE-3b/BE-4: perbaikan trigger sinkronisasi profil -> projects.
--
-- Sejak 022, tabel public.projects RPC-only: semua privilese dicabut dari
-- anon/authenticated. Dua fungsi trigger di bawah masih SECURITY INVOKER dan
-- menulis public.projects, sehingga onboarding (complete_onboarding) dan
-- update_developer_settings gagal 42501 untuk pengguna biasa.
--
-- Fungsi trigger dijalankan sebagai definer (pemilik tabel) agar sinkronisasi
-- tetap berjalan tanpa memberi grant tabel apa pun ke klien. search_path tetap
-- dikunci; execute dicabut dari klien karena hanya dipanggil lewat trigger.

create or replace function public.sync_projects_country()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
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

revoke all on function public.sync_projects_country() from public, anon, authenticated;

create or replace function public.sync_projects_owner()
returns trigger
language plpgsql
security definer
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

revoke all on function public.sync_projects_owner() from public, anon, authenticated;

comment on function public.sync_projects_country() is
  'Sinkronisasi projects.country_code saat profiles.country_code berubah (PRD v2 §11A). SECURITY DEFINER sejak 028 karena projects RPC-only.';
