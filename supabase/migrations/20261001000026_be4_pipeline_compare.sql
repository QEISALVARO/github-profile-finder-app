-- supabase/migrations/20261001000026_be4_pipeline_compare.sql
-- BE-4: Pipeline recruiter & Compare (recruiter-only).
--
-- D4: login hanya dapat diakses bila developer `listed` ATAU sudah ada di
--     pipeline pemanggil (mencegah membaca analisis lookup orang lain).
-- D5: data pihak ketiga diminimalkan — github_login + stage + note (<= 1000).
--     Nama/avatar/role/skor hanya bila login itu developer listed.
-- D6: seluruh akses lewat RPC definer; tidak ada grant tulis langsung.
-- Rate limit: pipeline_upsert 120/jam, pipeline_list 300/jam,
-- compare_developers 120/jam (angka awal, terdokumentasi).

-- ─── 1. Hardening pipeline_entries ───────────────────────────────────
revoke all on public.pipeline_entries from anon, authenticated;

drop policy if exists "pipeline_entries: owner read/write" on public.pipeline_entries;
drop policy if exists "pipeline_entries: owner read" on public.pipeline_entries;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pipeline_entries_note_len') then
    alter table public.pipeline_entries
      add constraint pipeline_entries_note_len
      check (note is null or char_length(note) <= 1000);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'pipeline_entries_login_lower') then
    alter table public.pipeline_entries
      add constraint pipeline_entries_login_lower
      check (github_login = lower(github_login));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'pipeline_entries_login_format') then
    alter table public.pipeline_entries
      add constraint pipeline_entries_login_format
      check (github_login ~ '^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$' and github_login !~ '--');
  end if;
end $$;

comment on table public.pipeline_entries is
  'Pipeline rekrutmen per recruiter. RPC-only (D6); maks 500 entri/recruiter, note <= 1000, login lowercase tervalidasi.';

insert into public.app_rate_limits (key, max_count, window_len, description) values
  ('pipeline_upsert', 120, '1 hour', 'Tambah/ubah entri pipeline (BE-4)'),
  ('pipeline_list', 300, '1 hour', 'Daftar pipeline per recruiter (BE-4)'),
  ('compare_developers', 120, '1 hour', 'Bandingkan 2 developer (BE-4)')
on conflict (key) do update set
  max_count = excluded.max_count,
  window_len = excluded.window_len,
  description = excluded.description;

-- ─── 2. pipeline_list ────────────────────────────────────────────────
create or replace function public.pipeline_list(
  p_stage public.pipeline_stage default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_allowed boolean;
  v_retry int;
  v_out jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles cp
    where cp.id = auth.uid() and 'recruiter' = any (cp.roles)
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select allowed, retry_after into v_allowed, v_retry
  from public.check_rate_limit(
    auth.uid(),
    'pipeline_list',
    (select max_count from public.app_rate_limits where key = 'pipeline_list'),
    (select window_len from public.app_rate_limits where key = 'pipeline_list')
  );
  if not v_allowed then
    raise exception 'RATE_LIMITED: retry_after=%', v_retry using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'entries', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'githubLogin', i.github_login,
        'stage', i.stage,
        'note', i.note,
        'updatedAt', i.updated_at,
        'name', case when i.listed then i.raw_name else null end,
        'avatarUrl', case when i.listed then i.raw_avatar else null end,
        'role', case when i.listed then i.raw_role else null end,
        'score', case when i.listed then i.raw_score else null end
      ) order by i.stage, i.updated_at desc
    ), '[]'::jsonb),
    'summary', (
      select jsonb_build_object(
        'saved', count(*) filter (where stage = 'saved'),
        'interviewing', count(*) filter (where stage = 'interviewing'),
        'hired', count(*) filter (where stage = 'hired')
      )
      from public.pipeline_entries
      where recruiter_id = auth.uid()
    )
  )
  into v_out
  from (
    select
      pe.id, pe.github_login, pe.stage, pe.note, pe.updated_at,
      coalesce(ds.listed, false) as listed,
      p.name as raw_name,
      p.avatar_url as raw_avatar,
      public.feed_role(la.inferred_role) as raw_role,
      la.authenticity as raw_score
    from public.pipeline_entries pe
    left join public.profiles p on lower(p.github_login) = pe.github_login
    left join public.developer_settings ds on ds.user_id = p.id
    left join public.latest_analysis_v2 la
      on la.github_login = pe.github_login and la.score_version = 2
    where pe.recruiter_id = auth.uid()
      and (p_stage is null or pe.stage = p_stage)
    order by pe.stage, pe.updated_at desc
    limit 500
  ) i;

  return v_out;
end;
$func$;

comment on function public.pipeline_list(public.pipeline_stage) is
  'BE-4: entri pipeline pemanggil; identitas hanya untuk developer listed (D5); summary dihitung dari data.';

-- ─── 3. pipeline_upsert ──────────────────────────────────────────────
create or replace function public.pipeline_upsert(
  p_login text,
  p_stage public.pipeline_stage default 'saved',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_login text;
  v_note text;
  v_stage public.pipeline_stage := coalesce(p_stage, 'saved');
  v_allowed boolean;
  v_retry int;
  v_listed boolean;
  v_existing boolean;
  v_item jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles cp
    where cp.id = auth.uid() and 'recruiter' = any (cp.roles)
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select allowed, retry_after into v_allowed, v_retry
  from public.check_rate_limit(
    auth.uid(),
    'pipeline_upsert',
    (select max_count from public.app_rate_limits where key = 'pipeline_upsert'),
    (select window_len from public.app_rate_limits where key = 'pipeline_upsert')
  );
  if not v_allowed then
    raise exception 'RATE_LIMITED: retry_after=%', v_retry using errcode = 'P0001';
  end if;

  v_login := lower(btrim(coalesce(p_login, '')));
  if v_login = '' or v_login !~ '^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$' or v_login ~ '--' then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if v_note is not null and char_length(v_note) > 1000 then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  -- D4: login baru hanya boleh bila developer listed atau sudah ada di pipeline.
  v_listed := exists (
    select 1
    from public.profiles p
    join public.developer_settings ds on ds.user_id = p.id
    where lower(p.github_login) = v_login and ds.listed = true
  );
  v_existing := exists (
    select 1 from public.pipeline_entries
    where recruiter_id = auth.uid() and github_login = v_login
  );

  if not v_listed and not v_existing then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Batas 500 entri per recruiter.
  if not v_existing and (
    select count(*) from public.pipeline_entries where recruiter_id = auth.uid()
  ) >= 500 then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  insert into public.pipeline_entries (recruiter_id, github_login, stage, note, updated_at)
  values (auth.uid(), v_login, v_stage, v_note, now())
  on conflict (recruiter_id, github_login) do update set
    stage = excluded.stage,
    note = excluded.note,
    updated_at = now();

  select jsonb_build_object(
    'id', pe.id,
    'githubLogin', pe.github_login,
    'stage', pe.stage,
    'note', pe.note,
    'updatedAt', pe.updated_at,
    'name', case when coalesce(ds.listed, false) then p.name else null end,
    'avatarUrl', case when coalesce(ds.listed, false) then p.avatar_url else null end,
    'role', case when coalesce(ds.listed, false)
                 then public.feed_role(la.inferred_role) else null end,
    'score', case when coalesce(ds.listed, false) then la.authenticity else null end
  )
  into v_item
  from public.pipeline_entries pe
  left join public.profiles p on lower(p.github_login) = pe.github_login
  left join public.developer_settings ds on ds.user_id = p.id
  left join public.latest_analysis_v2 la
    on la.github_login = pe.github_login and la.score_version = 2
  where pe.recruiter_id = auth.uid() and pe.github_login = v_login;

  return v_item;
end;
$func$;

comment on function public.pipeline_upsert(text, public.pipeline_stage, text) is
  'BE-4: upsert idempoten per (recruiter, login); validasi login/note; batas 500; D4; identitas hanya bila listed.';

-- ─── 4. pipeline_remove ──────────────────────────────────────────────
create or replace function public.pipeline_remove(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $func$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  delete from public.pipeline_entries
  where id = p_id and recruiter_id = auth.uid();

  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$func$;

comment on function public.pipeline_remove(uuid) is
  'BE-4: hapus entri pipeline milik pemanggil saja (NOT_FOUND bila bukan miliknya).';

-- ─── 5. compare_developers ───────────────────────────────────────────
create or replace function public.compare_developers(p_logins text[])
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_logins text[];
  v_allowed boolean;
  v_retry int;
  v_out jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles cp
    where cp.id = auth.uid() and 'recruiter' = any (cp.roles)
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select allowed, retry_after into v_allowed, v_retry
  from public.check_rate_limit(
    auth.uid(),
    'compare_developers',
    (select max_count from public.app_rate_limits where key = 'compare_developers'),
    (select window_len from public.app_rate_limits where key = 'compare_developers')
  );
  if not v_allowed then
    raise exception 'RATE_LIMITED: retry_after=%', v_retry using errcode = 'P0001';
  end if;

  if p_logins is null or array_length(p_logins, 1) <> 2 then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  v_logins := (
    select array_agg(lower(btrim(x)))
    from unnest(p_logins) x
  );

  if v_logins[1] is null or v_logins[2] is null or v_logins[1] = v_logins[2] then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from unnest(v_logins) l
    where l !~ '^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$' or l ~ '--'
  ) then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  -- D4: setiap login harus listed ATAU sudah ada di pipeline pemanggil.
  if exists (
    select 1 from unnest(v_logins) l
    where not exists (
      select 1
      from public.profiles p
      join public.developer_settings ds on ds.user_id = p.id
      where lower(p.github_login) = l and ds.listed = true
    )
    and not exists (
      select 1 from public.pipeline_entries pe
      where pe.recruiter_id = auth.uid() and pe.github_login = l
    )
  ) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'login', u.login,
      'name', coalesce(p.name, ''),
      'avatarUrl', coalesce(p.avatar_url, ''),
      'role', public.feed_role(la.inferred_role),
      'primaryLanguage', coalesce(la.primary_language, ''),
      'score', coalesce(la.authenticity, 0),
      'originalCount', coalesce((la.metrics->>'originalCount')::int, 0),
      'streakWeeks', coalesce((la.metrics->>'streakWeeks')::int, 0),
      'availability', case when coalesce(ds.listed, false) then ds.availability else null end,
      'countryCode', case when coalesce(ds.listed, false) then p.country_code else null end,
      'city', case when coalesce(ds.listed, false) then p.city else null end
    ) order by u.ord
  ), '[]'::jsonb)
  into v_out
  from unnest(v_logins) with ordinality as u(login, ord)
  left join public.profiles p on lower(p.github_login) = u.login
  left join public.developer_settings ds on ds.user_id = p.id
  left join public.latest_analysis_v2 la
    on la.github_login = u.login and la.score_version = 2;

  return v_out;
end;
$func$;

comment on function public.compare_developers(text[]) is
  'BE-4: tepat 2 login; D4; metrik dari analisis v2 terbaru; tanpa email/breakdown.';
