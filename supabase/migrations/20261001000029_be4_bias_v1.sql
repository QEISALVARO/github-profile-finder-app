-- supabase/migrations/20261001000029_be4_bias_v1.sql
-- BE-4 (AIR-4, audit L2): laporan bias v1 — impact ratio + ambang skor.
--
-- v0 hanya memberi n/mean/median/p25/p75 per grup, sehingga tidak bisa
-- dibandingkan dengan tolok ukur 4/5 (LL 144 / Title VII) dan tidak punya
-- ukuran ketidakpastian. v1 menambahkan hitungan skor >= ambang per grup;
-- interval kepercayaan, impact ratio, uji proporsi, dan koreksi
-- Benjamini-Hochberg dihitung di scripts/backend/bias-v1.ts agar dapat diuji
-- tanpa DB.
--
-- Tetap: admin/service_role saja, agregat tanpa identitas, kelompok kecil
-- dimasking (default n < 30).

create or replace function public.bias_group_stats(
  p_scores int[],
  p_threshold int,
  p_min_group int
)
returns jsonb
language sql
immutable
set search_path = public, extensions
as $$
  select case
    when coalesce(array_length(p_scores, 1), 0) < p_min_group
      then jsonb_build_object('n', to_jsonb(('<' || p_min_group || '>')::text))
    else public.bias_stats(p_scores) || jsonb_build_object(
      'n', coalesce(array_length(p_scores, 1), 0),
      'atOrAbove', (
        select count(*)::int from unnest(p_scores) x where x >= p_threshold
      )
    )
  end
$$;

comment on function public.bias_group_stats(int[], int, int) is
  'AIR-4 v1: statistik grup + jumlah skor >= ambang; grup n < p_min_group dimasking "<n>".';

create or replace function public.bias_report_v1(
  p_threshold int default 70,
  p_min_group int default 30
)
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

  if p_threshold is null or p_threshold < 0 or p_threshold > 100 then
    raise exception 'VALIDATION' using errcode = 'P0001';
  end if;

  if p_min_group is null or p_min_group < 5 or p_min_group > 1000 then
    raise exception 'VALIDATION' using errcode = 'P0001';
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
    select public.bias_stats(coalesce(array_agg(score), '{}'::int[]))
           || jsonb_build_object(
                'n', count(*)::int,
                'atOrAbove', count(*) filter (where score >= p_threshold)
              ) as stats
    from base
  ),
  by_country as (
    select country as key,
           public.bias_group_stats(array_agg(score), p_threshold, p_min_group) as stats
    from base group by country
  ),
  by_language as (
    select language as key,
           public.bias_group_stats(array_agg(score), p_threshold, p_min_group) as stats
    from base group by language
  ),
  by_role as (
    select role as key,
           public.bias_group_stats(array_agg(score), p_threshold, p_min_group) as stats
    from base group by role
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'scoreVersion', 2,
    'threshold', p_threshold,
    'minimumGroupSize', p_min_group,
    'overall', (select stats from overall),
    'byCountry', coalesce((
      select jsonb_agg(g.stats || jsonb_build_object('key', g.key) order by g.key)
      from by_country g
    ), '[]'::jsonb),
    'byLanguage', coalesce((
      select jsonb_agg(g.stats || jsonb_build_object('key', g.key) order by g.key)
      from by_language g
    ), '[]'::jsonb),
    'byRole', coalesce((
      select jsonb_agg(g.stats || jsonb_build_object('key', g.key) order by g.key)
      from by_role g
    ), '[]'::jsonb)
  )
  into v_out;

  return v_out;
end;
$func$;

comment on function public.bias_report_v1(int, int) is
  'AIR-4 v1: agregat per negara/bahasa/role + jumlah skor >= p_threshold; admin/service_role; masking n < p_min_group; tanpa identitas individu.';

-- Rate limit tidak dipakai (endpoint admin); tidak ada grant tabel baru.
