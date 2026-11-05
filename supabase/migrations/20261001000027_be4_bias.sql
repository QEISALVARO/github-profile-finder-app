-- supabase/migrations/20261001000027_be4_bias.sql
-- BE-4 (AIR-4): laporan bias v0 — agregat tanpa identitas individu.
--
-- Hanya klaim admin (app_metadata.role = 'admin') atau service_role.
-- Kelompok dengan n < 10 dimasking ("<10"), tanpa statistik.
-- Skor yang diaudit: authenticity v2. Tidak ada login/nama pada keluaran.

create or replace function public.bias_stats(p_scores int[])
returns jsonb
language sql
immutable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'n', count(*),
    'mean', round(avg(x)::numeric, 1),
    'median', round((percentile_cont(0.5) within group (order by x::double precision))::numeric, 1),
    'p25', round((percentile_cont(0.25) within group (order by x::double precision))::numeric, 1),
    'p75', round((percentile_cont(0.75) within group (order by x::double precision))::numeric, 1)
  )
  from unnest(p_scores) x
$$;

comment on function public.bias_stats(int[]) is
  'AIR-4: n/mean/median/p25/p75 untuk sekelompok skor. Murni.';

create or replace function public.bias_report_v0()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_claim_role text;
  v_jwt_role text;
  v_out jsonb;
begin
  v_claim_role := coalesce(auth.jwt()->'app_metadata'->>'role', '');
  v_jwt_role := coalesce(auth.jwt()->>'role', '');

  if v_claim_role <> 'admin' and v_jwt_role <> 'service_role' then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  with latest as (
    select distinct on (a.github_login)
      a.github_login, a.authenticity, a.score_version, a.inferred_role,
      a.primary_language
    from public.analyses a
    order by a.github_login, a.created_at desc
  ),
  base as (
    select
      coalesce(p.country_code::text, 'UNKNOWN') as country,
      coalesce(nullif(latest.primary_language, ''), 'unknown') as language,
      public.feed_role(latest.inferred_role) as role,
      latest.authenticity as score
    from latest
    join public.profiles p on lower(p.github_login) = latest.github_login
    where latest.score_version = 2
  ),
  overall as (
    select public.bias_stats(coalesce(array_agg(score), '{}'::int[])) as stats
    from base
  ),
  by_country as (
    select country as key, count(*)::int as n,
           public.bias_stats(coalesce(array_agg(score), '{}'::int[])) as stats
    from base group by country
  ),
  by_language as (
    select language as key, count(*)::int as n,
           public.bias_stats(coalesce(array_agg(score), '{}'::int[])) as stats
    from base group by language
  ),
  by_role as (
    select role as key, count(*)::int as n,
           public.bias_stats(coalesce(array_agg(score), '{}'::int[])) as stats
    from base group by role
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'scoreVersion', 2,
    'minimumGroupSize', 10,
    'overall', (select stats from overall),
    'byCountry', coalesce((
      select jsonb_agg(
        case when g.n < 10
          then jsonb_build_object('key', g.key, 'n', to_jsonb('<10>'::text))
          else g.stats || jsonb_build_object('key', g.key, 'n', g.n)
        end order by g.n desc, g.key
      ) from by_country g
    ), '[]'::jsonb),
    'byLanguage', coalesce((
      select jsonb_agg(
        case when g.n < 10
          then jsonb_build_object('key', g.key, 'n', to_jsonb('<10>'::text))
          else g.stats || jsonb_build_object('key', g.key, 'n', g.n)
        end order by g.n desc, g.key
      ) from by_language g
    ), '[]'::jsonb),
    'byRole', coalesce((
      select jsonb_agg(
        case when g.n < 10
          then jsonb_build_object('key', g.key, 'n', to_jsonb('<10>'::text))
          else g.stats || jsonb_build_object('key', g.key, 'n', g.n)
        end order by g.n desc, g.key
      ) from by_role g
    ), '[]'::jsonb)
  )
  into v_out;

  return v_out;
end;
$func$;

comment on function public.bias_report_v0() is
  'AIR-4: agregat bias per negara/bahasa/role; admin/service_role saja; kelompok n<10 dimasking; tanpa identitas individu.';
