-- supabase/migrations/20261001000025_be4_discover.sql
-- BE-4: Discover developer (recruiter-only).
--
-- D1: hanya developer ds.listed = true, profiles.country_code terisi (POL-9),
--     dan analisis TERBARU ber-score_version = 2.
-- D2: role keluaran memakai FeedRole (Front-End/Back-End/Mobile/Data).
-- D3: pemanggil harus recruiter; developer yang memblokir pemanggil tidak
--     muncul; pemanggil tidak melihat dirinya sendiri.
-- POL-3: tanpa endpoint ekspor; rate limit + batas halaman.
-- POL-8/AIR-5: tanpa filter/field atribut sensitif (tanpa email, breakdown).

-- Pemetaan satu tempat: inferred_role BE-2 -> FeedRole (D2).
create or replace function public.feed_role(p_inferred text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select case p_inferred
    when 'Front-End Developer' then 'Front-End'
    when 'Mobile Developer' then 'Mobile'
    when 'AI / Data Engineer' then 'Data'
    else 'Back-End'
  end
$$;

comment on function public.feed_role(text) is
  'D2 BE-4: inferred_role -> FeedRole (Front-End/Back-End/Mobile/Data). Murni, diuji pgTAP.';

-- ─── Konfigurasi laju (angka awal, terdokumentasi di talent.md) ──────
insert into public.app_rate_limits (key, max_count, window_len, description) values
  ('discover_developers', 300, '1 hour', 'Discover developer per recruiter (BE-4)'),
  ('discover_country_facets', 300, '1 hour', 'Facet negara Discover per recruiter (BE-4)')
on conflict (key) do update set
  max_count = excluded.max_count,
  window_len = excluded.window_len,
  description = excluded.description;

-- ─── discover_developers ─────────────────────────────────────────────
create or replace function public.discover_developers(
  p_role text default null,
  p_min_score int default null,
  p_countries char(2)[] default null,
  p_language text default null,
  p_availability public.availability default null,
  p_cursor text default null,
  p_lim int default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_lim int := greatest(1, least(50, coalesce(p_lim, 20)));
  v_role text;
  v_countries char(2)[];
  v_language text;
  v_s int;
  v_l text;
  v_allowed boolean;
  v_retry int;
  v_rows jsonb;
  v_total int;
  v_next text;
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
    'discover_developers',
    (select max_count from public.app_rate_limits where key = 'discover_developers'),
    (select window_len from public.app_rate_limits where key = 'discover_developers')
  );
  if not v_allowed then
    raise exception 'RATE_LIMITED: retry_after=%', v_retry using errcode = 'P0001';
  end if;

  -- Rentang skor yang diizinkan kontrak (DiscoverQuery 70..95).
  if p_min_score is not null and (p_min_score < 70 or p_min_score > 95) then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  v_role := lower(nullif(btrim(coalesce(p_role, '')), ''));
  if v_role is not null and v_role not in ('front-end', 'back-end', 'mobile', 'data') then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  if p_countries is not null and array_length(p_countries, 1) > 0 then
    v_countries := (select array_agg(upper(c)) from unnest(p_countries) c);
    if exists (select 1 from unnest(v_countries) c where c !~ '^[A-Z]{2}$') then
      raise exception 'VALIDATION' using errcode = 'P0001';
    end if;
  end if;

  v_language := lower(nullif(btrim(coalesce(p_language, '')), ''));

  if p_cursor is not null and p_cursor <> '' then
    declare
      v_std text := translate(p_cursor, '-_', '+/');
    begin
      v_std := v_std || repeat('=', (4 - length(v_std) % 4) % 4);
      select (convert_from(decode(v_std, 'base64'), 'utf8')::jsonb->>'s')::int,
             (convert_from(decode(v_std, 'base64'), 'utf8')::jsonb)->>'l'
      into v_s, v_l;
    exception when others then
      raise exception 'VALIDATION' using errcode = 'P0001';
    end;
    if v_s is null or v_l is null then
      raise exception 'VALIDATION' using errcode = 'P0001';
    end if;
  end if;

  -- totalCount eksak (listing opt-in; tanpa bulk endpoint — POL-3).
  with latest as (
    select distinct on (a.github_login)
      a.github_login, a.authenticity, a.score_version, a.inferred_role,
      a.primary_language
    from public.analyses a
    order by a.github_login, a.created_at desc
  ),
  base as (
    select p.id
    from latest
    join public.profiles p on lower(p.github_login) = latest.github_login
    join public.developer_settings ds on ds.user_id = p.id
    where latest.score_version = 2
      and ds.listed = true
      and p.country_code is not null
      and p.id <> auth.uid()
      and not exists (
        select 1 from public.blocks b
        where b.blocker_id = p.id and b.blocked_id = auth.uid()
      )
      and (v_role is null or lower(public.feed_role(latest.inferred_role)) = v_role)
      and (p_min_score is null or latest.authenticity >= p_min_score)
      and (v_countries is null or p.country_code = any (v_countries))
      and (v_language is null or lower(coalesce(latest.primary_language, '')) = v_language)
      and (p_availability is null or ds.availability = p_availability)
  )
  select count(*)::int into v_total from base;

  with latest as (
    select distinct on (a.github_login)
      a.github_login, a.authenticity, a.score_version, a.inferred_role,
      a.primary_language
    from public.analyses a
    order by a.github_login, a.created_at desc
  ),
  base as (
    select
      p.login,
      p.name,
      p.avatar_url,
      p.country_code,
      p.city,
      latest.authenticity,
      latest.primary_language,
      public.feed_role(latest.inferred_role) as role,
      ds.availability
    from latest
    join public.profiles p on lower(p.github_login) = latest.github_login
    join public.developer_settings ds on ds.user_id = p.id
    where latest.score_version = 2
      and ds.listed = true
      and p.country_code is not null
      and p.id <> auth.uid()
      and not exists (
        select 1 from public.blocks b
        where b.blocker_id = p.id and b.blocked_id = auth.uid()
      )
      and (v_role is null or lower(public.feed_role(latest.inferred_role)) = v_role)
      and (p_min_score is null or latest.authenticity >= p_min_score)
      and (v_countries is null or p.country_code = any (v_countries))
      and (v_language is null or lower(coalesce(latest.primary_language, '')) = v_language)
      and (p_availability is null or ds.availability = p_availability)
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'login', b.login,
      'name', coalesce(b.name, ''),
      'avatarUrl', coalesce(b.avatar_url, ''),
      'role', b.role,
      'primaryLanguage', coalesce(b.primary_language, ''),
      'countryCode', b.country_code,
      'city', b.city,
      'score', b.authenticity,
      'availability', b.availability
    ) order by b.authenticity desc, b.login asc
  ), '[]'::jsonb)
  into v_rows
  from (
    select base.*
    from base
    where (v_s is null or base.authenticity < v_s
           or (base.authenticity = v_s and base.login > v_l))
    order by base.authenticity desc, base.login asc
    limit v_lim + 1
  ) b;

  if jsonb_array_length(v_rows) > v_lim then
    v_rows := (
      select jsonb_agg(e order by ord)
      from jsonb_array_elements(v_rows) with ordinality a(e, ord)
      where ord <= v_lim
    );
    select encode(convert_to(
      jsonb_build_object('s', (v_rows->-1->>'score')::int, 'l', v_rows->-1->>'login')::text,
      'utf8'
    ), 'base64') into v_next;
    v_next := translate(rtrim(regexp_replace(v_next, '\s+', '', 'g'), '='), '+/', '-_');
  else
    v_next := null;
  end if;

  return jsonb_build_object(
    'items', v_rows,
    'nextCursor', v_next,
    'totalCount', v_total
  );
end;
$func$;

comment on function public.discover_developers(text, int, char(2)[], text, public.availability, text, int) is
  'BE-4 Discover: listed + country + analisis v2 terbaru, recruiter-only, kursor (authenticity,login), rate limit 300/jam.';

-- ─── discover_country_facets ─────────────────────────────────────────
create or replace function public.discover_country_facets(
  p_role text default null,
  p_min_score int default null,
  p_language text default null,
  p_availability public.availability default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_role text;
  v_language text;
  v_allowed boolean;
  v_retry int;
  v_out jsonb;
  v_min int := public.facet_min_count();
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
    'discover_country_facets',
    (select max_count from public.app_rate_limits where key = 'discover_country_facets'),
    (select window_len from public.app_rate_limits where key = 'discover_country_facets')
  );
  if not v_allowed then
    raise exception 'RATE_LIMITED: retry_after=%', v_retry using errcode = 'P0001';
  end if;

  if p_min_score is not null and (p_min_score < 70 or p_min_score > 95) then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  v_role := lower(nullif(btrim(coalesce(p_role, '')), ''));
  if v_role is not null and v_role not in ('front-end', 'back-end', 'mobile', 'data') then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  v_language := lower(nullif(btrim(coalesce(p_language, '')), ''));

  with latest as (
    select distinct on (a.github_login)
      a.github_login, a.authenticity, a.score_version, a.inferred_role,
      a.primary_language
    from public.analyses a
    order by a.github_login, a.created_at desc
  )
  select coalesce(jsonb_agg(
    case
      when f.n < v_min then jsonb_build_object('iso2', f.iso2, 'count', to_jsonb('<5>'::text))
      else jsonb_build_object('iso2', f.iso2, 'count', f.n)
    end
    order by f.n desc, f.iso2
  ), '[]'::jsonb)
  into v_out
  from (
    select p.country_code::text as iso2, count(*)::int as n
    from latest
    join public.profiles p on lower(p.github_login) = latest.github_login
    join public.developer_settings ds on ds.user_id = p.id
    where latest.score_version = 2
      and ds.listed = true
      and p.country_code is not null
      and p.id <> auth.uid()
      and not exists (
        select 1 from public.blocks b
        where b.blocker_id = p.id and b.blocked_id = auth.uid()
      )
      and (v_role is null or lower(public.feed_role(latest.inferred_role)) = v_role)
      and (p_min_score is null or latest.authenticity >= p_min_score)
      and (v_language is null or lower(coalesce(latest.primary_language, '')) = v_language)
      and (p_availability is null or ds.availability = p_availability)
    group by p.country_code
  ) f;

  return v_out;
end;
$func$;

comment on function public.discover_country_facets(text, int, text, public.availability) is
  'BE-4 facet negara Discover: filter selain countries; masking <5 (app.facet_min_count).';
