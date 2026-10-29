-- supabase/migrations/20261001000020_be3_search.sql
-- BE-3: build_tsquery + search_projects (jsonb bentuk FeedPage kontrak).
-- Tokenisasi persis v1 lib/feed.ts: lower -> split /[\s-]+/ -> buang kosong.
-- Tiap token diperluas via keyword_aliases menjadi grup OR prefix-term;
-- antar token AND. Contoh: golang -> go:* ; ml -> (pytorch|tensorflow|
-- machine|learning):* ; "e-commerce" == "e commerce" (split hyphen).
-- Kursor: base64url {"r": rank_score, "id": uuid}; halaman berikut
-- (rank_score, id) < (r, id). Kursor rusak -> VALIDATION (P0001).

create or replace function public.build_tsquery(p_q text)
returns tsquery
language plpgsql
immutable
set search_path = public, extensions
as $func$
declare
  v_lower text;
  v_tokens text[];
  v_parts text[] := '{}';
  v_tok text;
  v_exp text[];
  v_or text;
  v_out tsquery := null;
begin
  if p_q is null or btrim(p_q) = '' then
    return null;
  end if;

  -- lower + split spasi/hyphen + buang kosong (persis v1).
  -- Pola memakai kelas POSIX (bukan \s) agar valid dgn
  -- standard_conforming_strings=on.
  v_lower := lower(p_q);
  v_tokens := regexp_split_to_array(v_lower, '[[:space:]-]+');
  foreach v_tok in array v_tokens loop
    if v_tok is null or v_tok = '' then continue; end if;
    -- sanitasi: hanya huruf/angka; token tanpa alnum dilewati (anti-injeksi)
    v_tok := regexp_replace(v_tok, '[^a-z0-9]+', '', 'g');
    if v_tok = '' then continue; end if;

    -- perluasan alias: token + expands[] (bila ada)
    select coalesce(array_agg(distinct e), '{}') into v_exp
    from public.keyword_aliases ka, unnest(ka.expands) e
    where ka.alias = v_tok;
    v_exp := array_prepend(v_tok, v_exp);

    -- Token sudah disanitasi [a-z0-9] di atas, jadi aman tanpa quote;
    -- quote_literal justru merusak sintaks prefix (':*' di luar string).
    select string_agg(x || ':*', ' | ') into v_or
    from unnest(v_exp) x;
    v_parts := v_parts || ('(' || v_or || ')');
  end loop;

  if array_length(v_parts, 1) is null then
    return null;
  end if;

  -- antar token AND
  v_out := array_to_string(v_parts, ' & ')::tsquery;
  return v_out;
exception when others then
  raise exception 'VALIDATION' using errcode = 'P0001';
end;
$func$;

comment on function public.build_tsquery(text) is
  'Tokenisasi persis v1 + perluasan keyword_aliases. Murni (immutable), diuji pgTAP 08.';

-- ─── search_projects ─────────────────────────────────────────────────
-- SECURITY DEFINER terkunci: klien tak punya akses tabel langsung (019),
-- RPC satu-satunya jalur baca feed. Rate limit 300/jam per pengguna.
create or replace function public.search_projects(
  p_q text default null,
  p_role text default null,
  p_countries char(2)[] default null,
  p_city text default null,
  p_active_only boolean default false,
  p_min_score int default null,
  p_cursor text default null,
  p_lim int default 20,
  p_include_unknown boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_lim int := greatest(1, least(50, coalesce(p_lim, 20)));
  v_ts tsquery;
  v_r numeric;
  v_id uuid;
  v_countries char(2)[];
  v_city text;
  v_rows jsonb;
  v_total int;
  v_next text;
  v_allowed boolean;
  v_retry int;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  -- rate limit
  select allowed, retry_after into v_allowed, v_retry
  from public.check_rate_limit(auth.uid(), 'search_projects',
      (select max_count from public.app_rate_limits where key = 'search_projects'),
      (select window_len from public.app_rate_limits where key = 'search_projects'));
  if not v_allowed then
    raise exception 'RATE_LIMITED: retry_after=%', v_retry using errcode = 'P0001';
  end if;

  -- validasi countries (huruf besar, format ISO2)
  if p_countries is not null and array_length(p_countries, 1) > 0 then
    v_countries := array_agg(upper(c)) from unnest(p_countries) c;
    if exists (select 1 from unnest(v_countries) c where c !~ '^[A-Z]{2}$') then
      raise exception 'VALIDATION' using errcode = 'P0001';
    end if;
  end if;

  -- city case/accent-insensitive (samakan dgn normalisasi: lower+unaccent)
  v_city := nullif(btrim(coalesce(p_city, '')), '');

  -- tsquery (null bila q kosong -> tanpa filter teks)
  v_ts := public.build_tsquery(p_q);

  -- kursor (base64url dari pembuat: konversi balik ke base64 standar dulu;
  -- Postgres decode() hanya mengenal alfabet standar +/+/)
  if p_cursor is not null and p_cursor <> '' then
    declare
      v_std text := translate(p_cursor, '-_', '+/');
    begin
      v_std := v_std || repeat('=', (4 - length(v_std) % 4) % 4);
      select (convert_from(decode(v_std, 'base64'), 'utf8')::jsonb->>'r')::numeric,
             ((convert_from(decode(v_std, 'base64'), 'utf8')::jsonb)->>'id')::uuid
      into v_r, v_id;
    exception when others then
      raise exception 'VALIDATION' using errcode = 'P0001';
    end;
    if v_r is null or v_id is null then
      raise exception 'VALIDATION' using errcode = 'P0001';
    end if;
  end if;

  -- total (utk paginasi FE; POL-3: tetap dibatasi lim+filter, tanpa bulk endpoint)
  select count(*)::int into v_total
  from public.projects p
  where p.visible = true
    and (v_ts is null or p.search @@ v_ts)
    and (p_role is null or p_role = '' or p.role = p_role)
    and (not coalesce(p_active_only, false) or p.active = true)
    and (p_min_score is null or coalesce(p.score, 0) >= p_min_score)
    and (
      v_countries is null
      or p.country_code = any(v_countries)
      or (coalesce(p_include_unknown, false) and p.country_code is null)
    )
    and (v_city is null or unaccent(lower(coalesce(p.city, ''))) = unaccent(lower(v_city)))
    and (v_r is null or (p.rank_score, p.id) < (v_r, v_id));

  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank_score desc, x.id desc), '[]'::jsonb) into v_rows
  from (
    select
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
      ) as developer,
      p.rank_score, p.id as sort_id
    from public.projects p
    join public.profiles pr on pr.id = p.owner_id
    where p.visible = true
      and (v_ts is null or p.search @@ v_ts)
      and (p_role is null or p_role = '' or p.role = p_role)
      and (not coalesce(p_active_only, false) or p.active = true)
      and (p_min_score is null or coalesce(p.score, 0) >= p_min_score)
      and (
        v_countries is null
        or p.country_code = any(v_countries)
        or (coalesce(p_include_unknown, false) and p.country_code is null)
      )
      and (v_city is null or unaccent(lower(coalesce(p.city, ''))) = unaccent(lower(v_city)))
      and (v_r is null or (p.rank_score, p.id) < (v_r, v_id))
    order by p.rank_score desc, p.id desc
    limit v_lim + 1
  ) x;

  -- nextCursor: bila lebih dari lim -> ambil r+id baris terakhir halaman
  if jsonb_array_length(v_rows) > v_lim then
    v_rows := (select jsonb_agg(e order by ord) from jsonb_array_elements(v_rows) with ordinality a(e, ord) where ord <= v_lim);
    select encode(convert_to(jsonb_build_object('r', (v_rows->-1->>'rank_score')::numeric, 'id', (v_rows->-1->>'sort_id'))::text, 'utf8'), 'base64') into v_next;
    -- base64url (tanpa padding/newline, aman URL): encode() membungkus
    -- tiap 76 karakter, jadi buang whitespace dulu.
    v_next := translate(rtrim(regexp_replace(v_next, '\s+', '', 'g'), '='), '+/', '-_');
  else
    v_next := null;
  end if;

  -- buang kolom sort internal
  v_rows := (select coalesce(jsonb_agg(e - 'rank_score' - 'sort_id' order by ord), '[]'::jsonb)
             from jsonb_array_elements(v_rows) with ordinality a(e, ord));

  return jsonb_build_object('items', v_rows, 'nextCursor', v_next, 'totalCount', v_total);
end;
$func$;

comment on function public.search_projects(text, text, char(2)[], text, boolean, int, text, int, boolean) is
  'BE-3 RPC feed: visible saja, FTS+alias, filter role/active/score/negara/kota, keyset cursor, rate limit 300/jam. SECURITY DEFINER terkunci.';
