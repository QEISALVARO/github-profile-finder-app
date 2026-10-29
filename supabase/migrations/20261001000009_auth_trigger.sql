-- supabase/migrations/20261001000009_auth_trigger.sql
-- Trigger: buat baris profiles saat user baru login via GitHub OAuth

create or replace function public.handle_new_github_user()
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
begin
  -- Ambil data dari raw_user_meta_data (diisi Supabase Auth dari GitHub OAuth)
  v_github_id  := (new.raw_user_meta_data->'provider_id')::bigint;
  v_login      := coalesce(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'login'
  );
  v_name       := new.raw_user_meta_data->>'full_name';
  v_avatar_url := new.raw_user_meta_data->>'avatar_url';
  v_bio        := new.raw_user_meta_data->>'description';
  v_location   := new.raw_user_meta_data->>'location';

  -- Lewati bila metadata GitHub belum ada (mis. insert manual di test):
  -- profiles.login NOT NULL, jadi insert paksa akan selalu gagal.
  if v_login is null or v_github_id is null then
    return new;
  end if;

  -- Idempoten: gunakan ON CONFLICT (isi github_login sekalian, 017).
  insert into public.profiles (
    id, github_id, login, github_login, name, avatar_url, bio, location_text
  ) values (
    new.id, v_github_id, v_login, lower(v_login), v_name, v_avatar_url, v_bio, v_location
  )
  on conflict (id) do nothing;

  -- Tidak menyimpan email (POL-2)
  return new;
end;
$$;

comment on function public.handle_new_github_user() is
  'Trigger: buat baris profiles dari metadata GitHub OAuth. Idempoten. Tanpa email (POL-2).';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_github_user();
