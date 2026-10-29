-- supabase/migrations/20261001000021_be3_facets.sql
-- BE-3: country_facets, city_facets, featured_projects RPC.
-- Masking <5 (konstanta app.facet_min_count, default 5) untuk privasi (D6).

create or replace function public.facet_min_count()
returns int
language sql
immutable
as $$ select coalesce(nullif(current_setting('app.facet_min_count', true), '')::int, 5) $$;

-- Batas umum: filter yang SAMA dengan search KECUALI countries (facet
-- mencerminkan dimensi lain). Dibangun sebagai COUNT(*) per negara.
create or replace function public.country_facets(
  p_q text default null,
  p_role text default null,
  p_city text default null,
  p_active_only boolean default false,
  p_min_score int default null,
  p_include_unknown boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_ts tsquery;
  v_city text;
  v_min int;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  declare
    v_allowed boolean; v_retry int;
  begin
    select allowed, retry_after into v_allowed, v_retry
    from public.check_rate_limit(auth.uid(), 'country_facets',
      (select max_count from public.app_rate_limits where key = 'country_facets'),
      (select window_len from public.app_rate_limits where key = 'country_facets'));
    if not v_allowed then
      raise exception 'RATE_LIMITED: retry_after=%', v_retry using errcode = 'P0001';
    end if;
  end;

  v_ts := public.build_tsquery(p_q);
  v_city := nullif(btrim(coalesce(p_city, '')), '');
  v_min := coalesce(nullif(current_setting('app.facet_min_count', true), '')::int, 5);

  return coalesce((
    select jsonb_agg(jsonb_build_object('iso2', iso2, 'count', cnt) order by cnt desc, iso2)
    from (
      select p.country_code as iso2,
        case when count(*) < v_min then to_jsonb('<5>'::text) else to_jsonb(count(*)) end as cnt
      from public.projects p
      where p.visible = true
        and (v_ts is null or p.search @@ v_ts)
        and (p_role is null or p_role = '' or p.role = p_role)
        and (not coalesce(p_active_only, false) or p.active = true)
        and (p_min_score is null or coalesce(p.score, 0) >= p_min_score)
        and (v_city is null or unaccent(lower(coalesce(p.city, ''))) = unaccent(lower(v_city)))
      group by p.country_code
      having p.country_code is not null
    ) f
  ), '[]'::jsonb);
end;
$func$;

-- city_facets: drill-down bila tepat satu negara dipilih (FE menegakkan).
create or replace function public.city_facets(
  p_country char(2),
  p_q text default null,
  p_role text default null,
  p_active_only boolean default false,
  p_min_score int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_ts tsquery;
  v_min int;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;
  if p_country is null or upper(p_country) !~ '^[A-Z]{2}$' then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  declare
    v_allowed boolean; v_retry int;
  begin
    select allowed, retry_after into v_allowed, v_retry
    from public.check_rate_limit(auth.uid(), 'city_facets',
      (select max_count from public.app_rate_limits where key = 'city_facets'),
      (select window_len from public.app_rate_limits where key = 'city_facets'));
    if not v_allowed then
      raise exception 'RATE_LIMITED: retry_after=%', v_retry using errcode = 'P0001';
    end if;
  end;

  v_ts := public.build_tsquery(p_q);
  v_min := coalesce(nullif(current_setting('app.facet_min_count', true), '')::int, 5);

  return coalesce((
    select jsonb_agg(jsonb_build_object('city', city, 'count', cnt) order by cnt desc, city)
    from (
      select p.city as city,
        case when count(*) < v_min then to_jsonb('<5>'::text) else to_jsonb(count(*)) end as cnt
      from public.projects p
      where p.visible = true
        and p.country_code = upper(p_country)
        and p.city is not null and p.city <> ''
        and (v_ts is null or p.search @@ v_ts)
        and (p_role is null or p_role = '' or p.role = p_role)
        and (not coalesce(p_active_only, false) or p.active = true)
        and (p_min_score is null or coalesce(p.score, 0) >= p_min_score)
      group by p.city
    ) f
  ), '[]'::jsonb);
end;
$func$;

-- featured_projects: snapshot mingguan, filter ulang visible saat baca.
create or replace function public.featured_projects(p_lim int default 10)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_week date := date_trunc('week', now())::date;
  v_lim int := greatest(1, least(50, coalesce(p_lim, 10)));
  v_out jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.rk), '[]'::jsonb) into v_out
  from (
    select
      fp.rank as rk,
      p.id::text as id, p.name, p.description, p.role,
      (select coalesce(jsonb_agg(jsonb_build_object('name', s->>'name', 'percent', (s->>'percent')::int) order by (s->>'percent')::int desc), '[]'::jsonb)
       from jsonb_array_elements(coalesce(p.stack, '[]'::jsonb)) s) as stack,
      p.country_code as "countryCode", p.city,
      coalesce(p.score, 0) as score, p.active as active,
      p.demo_url as "demoUrl", p.demo_verified as "demoVerified", p.stars,
      jsonb_build_object(
        'login', pr.login, 'name', pr.name,
        'avatarUrl', pr.avatar_url, 'availability',
        coalesce((select ds.availability::text from public.developer_settings ds where ds.user_id = p.owner_id), 'not_available')
      ) as developer
    from public.featured_projects fp
    join public.projects p on p.id = fp.project_id
    join public.profiles pr on pr.id = p.owner_id
    where fp.week_start = v_week and p.visible = true
    order by fp.rank
    limit v_lim
  ) x;

  return jsonb_build_object(
    'items', v_out,
    'nextCursor', null,
    'totalCount', coalesce(jsonb_array_length(v_out), 0)
  );
end;
$func$;

-- ─── Moderasi ────────────────────────────────────────────────────────
-- report_project: unik per (reporter, target); rate limit 20/hari.
create or replace function public.report_project(p_project_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_allowed boolean; v_retry int;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;
  if p_project_id is null then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 1 or char_length(p_reason) > 500 then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;
  select allowed, retry_after into v_allowed, v_retry
  from public.check_rate_limit(auth.uid(), 'report_project',
      (select max_count from public.app_rate_limits where key = 'report_project'),
      (select window_len from public.app_rate_limits where key = 'report_project'));
  if not v_allowed then
    raise exception 'RATE_LIMITED: retry_after=%', v_retry using errcode = 'P0001';
  end if;

  insert into public.abuse_reports (reporter_id, target_type, target_id, reason)
  select auth.uid(), 'project', p_project_id::text, btrim(p_reason)
  where not exists (
    select 1 from public.abuse_reports
    where reporter_id = auth.uid()
      and target_type = 'project'
      and target_id = p_project_id::text
  );
end;
$func$;

-- unpublish / republish: hanya pemilik. republish tidak mengubah kolom
-- perhitungan (score dkk tetap) — visible dihitung ulang trigger.
create or replace function public.unpublish_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $func$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;
  update public.projects set published = false
  where id = p_project_id and owner_id = auth.uid();
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$func$;

create or replace function public.republish_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $func$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;
  update public.projects set published = true
  where id = p_project_id and owner_id = auth.uid();
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$func$;

-- admin_set_project_hidden: hanya klaim app_metadata.role = 'admin'.
create or replace function public.admin_set_project_hidden(
  p_project_id uuid, p_hidden boolean, p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;
  v_role := coalesce(auth.jwt()->'app_metadata'->>'role', '');
  if v_role <> 'admin' then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_project_id is null then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  update public.projects set is_hidden = coalesce(p_hidden, true)
  where id = p_project_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.audit_log (actor, action, target_type, target_id, meta)
  values (auth.uid(), case when coalesce(p_hidden, true) then 'project.hide' else 'project.unhide' end,
          'project', p_project_id::text,
          jsonb_build_object('reason', left(coalesce(p_reason, ''), 500)));
end;
$func$;
