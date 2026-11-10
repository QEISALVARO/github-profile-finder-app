-- supabase/seed/bench-talent.sql
-- DATA UJI LOKAL / BENCH SAJA — JANGAN PERNAH DIJALANKAN DI PRODUKSI
--
-- Melengkapi supabase/seed/bench.sql untuk BE-4: 5.200 developer `listed`
-- dengan profil (negara/kota terisi, POL-9) dan analisis `score_version = 2`
-- terbaru, supaya `discover_developers` punya populasi cukup untuk mengukur
-- p95 dan `bias_report_v0()` punya grup >= 10 per negara/bahasa/role.
--
-- Tidak dijalankan `make reset` (seed default hanya `supabase/seed.sql`);
-- muat manual:
--   docker exec -i supabase_db_<project> psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/seed/bench-talent.sql
-- atau `psql "$DATABASE_URL" -f supabase/seed/bench-talent.sql`.
--
-- Catatan metodologi (dipakai di evidence bench/bias):
-- * Negara, bahasa, role, dan skor dibuat saling independen supaya perbedaan
--   grup yang muncul murni derau, BUKAN bias buatan — kecuali satu grup
--   ('NG') yang sengaja digeser -14 poin untuk menguji apakah ambang tinjau
--   > 10 poin pada `bias_report_v0()` benar-benar menyala.
-- * 5% developer sengaja tidak `listed` dan ~1% tanpa `country_code`
--   (muncul sebagai 'UNKNOWN' di laporan bias, tidak muncul di Discover).
-- * Setiap 50 developer punya analisis v1 lama berskor 99 untuk membuktikan
--   Discover/bias memakai analisis TERBARU (v2), bukan skor tertinggi.

do $$
declare
  v_total int := 5200;
  v_languages text[] := array[
    'TypeScript','JavaScript','Python','Go','Kotlin','Java','Rust','PHP','C#','Ruby'
  ];
  v_roles text[] := array[
    'Front-End Developer','Back-End Developer','Mobile Developer',
    'AI / Data Engineer','Full-Stack Developer'
  ];
begin
  -- Idempoten: hapus run sebelumnya. `analyses` tidak punya FK ke profiles,
  -- jadi dibersihkan lewat pola login; sisanya ikut cascade dari auth.users.
  delete from public.analyses where github_login like 'bench\_dev\_%';
  delete from auth.users where email like 'bench-dev-%@bench.local';

  -- Populasi negara (bobot per-mille, total 1000) untuk simulasi sebaran.
  create temp table bench_country_pool on commit drop as
  select iso2, lo, hi
  from (
    select iso2::char(2) as iso2,
           coalesce(sum(w) over (order by ord rows between unbounded preceding and 1 preceding), 0) / 1000.0 as lo,
           sum(w) over (order by ord) / 1000.0 as hi
    from (values
      ('ID', 300, 1), ('IN', 100, 2), ('US', 100, 3), ('SG', 50, 4),
      ('GB', 50, 5), ('DE', 40, 6), ('BR', 40, 7), ('NO', 30, 8),
      ('JP', 30, 9), ('NG', 30, 10), ('PH', 20, 11), ('VN', 20, 12),
      ('MY', 20, 13), ('AU', 20, 14), ('CA', 20, 15), ('FR', 20, 16),
      ('NL', 20, 17), ('ES', 20, 18), ('PL', 20, 19), ('ZA', 10, 20),
      ('MX', 10, 21), ('TR', 10, 22), ('UA', 10, 23), ('EG', 10, 24)
    ) v(iso2, w, ord)
  ) s;

  -- Penugasan atribut lewat hash(i, salt) agar negara/bahasa/role/skor
  -- saling INDEPENDEN (modulo sederhana dulu membuat bahasa & skor
  -- berkorelasi karena periodenya berbagi faktor).
  create temp table bench_devs on commit drop as
  select
    g.i,
    gen_random_uuid() as id,
    format('bench_dev_%s', lpad(g.i::text, 5, '0')) as login,
    (2000000 + g.i)::bigint as github_id,
    case when g.i % 97 = 0 then null else cp.iso2 end as country_code,
    v_languages[1 + mod(abs(hashtext('lang:' || g.i)::bigint), array_length(v_languages, 1))] as primary_language,
    v_roles[1 + mod(abs(hashtext('role:' || g.i)::bigint), array_length(v_roles, 1))] as inferred_role,
    -- Skor dasar 55..94 murni dari hash, lalu NG sengaja digeser -14
    -- (cukup untuk melewati ambang tinjauan median > 10 poin).
    greatest(0, least(100,
      55 + mod(abs(hashtext('score:' || g.i)::bigint), 40)
      - case when cp.iso2 = 'NG' then 14 else 0 end
    ))::int as score
  from generate_series(1, v_total) g(i)
  join bench_country_pool cp
    on mod(abs(hashtext('country:' || g.i)::bigint), 1000) / 1000.0 >= cp.lo
   and mod(abs(hashtext('country:' || g.i)::bigint), 1000) / 1000.0 < cp.hi;

  -- 1. auth.users (agar profiles.id punya FK yang sah)
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  select
    b.id, 'authenticated', 'authenticated',
    format('bench-dev-%s@bench.local', b.i),
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"github","providers":["github"]}'::jsonb,
    jsonb_build_object(
      'user_name', b.login,
      'name', initcap(replace(b.login, '_', ' ')),
      'avatar_url', 'https://avatars.githubusercontent.com/u/' || b.github_id || '?v=4'
    ),
    now(), now()
  from bench_devs b
  on conflict (id) do nothing;

  -- 2. profiles (negara + kota sesuai countries/cities seed; POL-9)
  insert into public.profiles (
    id, github_id, login, github_login, name, avatar_url, bio, location_text,
    roles, country_code, city, country_source, country_confidence, created_at
  )
  select
    b.id,
    b.github_id,
    b.login,
    b.login,
    initcap(replace(b.login, '_', ' ')),
    'https://avatars.githubusercontent.com/u/' || b.github_id || '?v=4',
    'Synthetic developer profile for local benchmark',
    case when b.country_code is null then null
         else b.country_code::text || ', ' || coalesce(c.name, 'Synthetic City') end,
    '{developer}'::public.user_role[],
    b.country_code,
    c.name,
    'inferred',
    70,
    now() - ((b.i % 720) || ' days')::interval
  from bench_devs b
  left join public.countries c on c.iso2 = b.country_code
  on conflict (id) do nothing;

  -- 3. analyses v2 terbaru (dipakai Discover & bias_report_v0)
  insert into public.analyses (
    github_login, score_version, authenticity, created_at, confidence,
    breakdown, primary_language, inferred_role, metrics, heatmap,
    facts, is_lookup, expires_at
  )
  select
    b.login, 2, b.score, now() - ((b.i % 30) || ' hours')::interval, 80,
    jsonb_build_object('original', b.score, 'activity', b.score),
    b.primary_language, b.inferred_role,
    jsonb_build_object('originalCount', 5 + (b.i % 20), 'streakWeeks', b.i % 12),
    array_fill(1::smallint, array[84]),
    '{}'::jsonb, true, null
  from bench_devs b;

  -- 3b. analisis v1 lama berskor 99: harus DIABAIKAN karena bukan terbaru.
  insert into public.analyses (
    github_login, score_version, authenticity, created_at, confidence,
    breakdown, primary_language, inferred_role, metrics, heatmap,
    facts, is_lookup, expires_at
  )
  select
    b.login, 1, 99, now() - interval '400 days', 80,
    '{}'::jsonb, b.primary_language, b.inferred_role, '{}'::jsonb, null,
    '{}'::jsonb, true, null
  from bench_devs b
  where b.i % 50 = 0;

  -- 4. developer_settings: 95% listed, 5% tidak (tidak muncul di Discover).
  insert into public.developer_settings (user_id, listed, open_to_messages, availability, headline)
  select
    b.id,
    (b.i % 20 <> 0 and b.country_code is not null),
    (b.i % 3 <> 0),
    (array['open_to_work','freelance','not_available']::public.availability[])[1 + ((b.i - 1) % 3)],
    format('Synthetic %s engineer', b.primary_language)
  from bench_devs b
  on conflict (user_id) do nothing;

  raise notice 'bench-talent: % developer sintetis dimuat', v_total;
end $$;
