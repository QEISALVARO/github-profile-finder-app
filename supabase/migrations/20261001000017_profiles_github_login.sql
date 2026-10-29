-- supabase/migrations/20261001000017_profiles_github_login.sql
-- Koreksi: tabel profiles tidak memiliki kolom github_login, padahal seluruh
-- kode BE membacanya (analyze-developer, authenticateCaller, refresh-stale)
-- dan pgTAP 03/06 menulisnya. Kode + test konsisten memakai github_login;
-- yang salah adalah skema 004 (hanya punya login + github_id).
-- Tambah kolom + backfill dari login, lalu NOT NULL + unique.

alter table public.profiles add column if not exists github_login text;

-- Backfill untuk baris lama (login sudah lowercase dari trigger).
update public.profiles set github_login = lower(login)
where github_login is null and login is not null;

alter table public.profiles alter column github_login set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_github_login_unique') then
    alter table public.profiles add constraint profiles_github_login_unique unique (github_login);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_github_login_lower_check') then
    alter table public.profiles add constraint profiles_github_login_lower_check check (github_login = lower(github_login));
  end if;
end $$;
