-- supabase/migrations/20261001000010_location_normalize.sql
-- Fungsi normalize_location: deterministik, menggunakan dataset lokal (tanpa geocoder pihak ketiga)

create or replace function public.normalize_location(p_location text)
returns table (
  country_code char(2),
  city         text,
  confidence   smallint
)
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_trimmed     text;
  v_parts       text[];
  v_last_token  text;
  v_first_token text;
  v_country_code char(2);
  v_city        text;
  v_confidence  smallint;
  v_country_cnt int;
begin
  -- Kasus null/kosong
  if p_location is null or trim(p_location) = '''' then
    return query select null::char(2), null::text, 0::smallint;
    return;
  end if;

  v_trimmed := trim(p_location);

  -- Pisah dengan koma
  v_parts := string_to_array(v_trimmed, '','');
  v_last_token  := trim(v_parts[array_length(v_parts, 1)]);
  v_first_token := trim(v_parts[1]);

  -- Langkah 1: coba cocokkan token terakhir ke negara (nama, alias, ISO2)
  -- Cek ISO2 exact
  select iso2 into v_country_code
  from public.countries
  where upper(v_last_token) = iso2
  limit 1;

  -- Cek nama negara (case-insensitive, unaccent)
  if v_country_code is null then
    select iso2 into v_country_code
    from public.countries
    where lower(unaccent(name)) = lower(unaccent(v_last_token))
    limit 1;
  end if;

  -- Cek alias negara
  if v_country_code is null then
    select iso2 into v_country_code
    from public.countries
    where lower(unaccent(v_last_token)) = any(
      select lower(unaccent(a)) from unnest(aliases) a
    )
    limit 1;
  end if;

  -- Langkah 2: jika negara ditemukan, coba cocokkan token pertama ke kota dalam negara itu
  if v_country_code is not null then
    v_confidence := 80;

    if array_length(v_parts, 1) > 1 then
      -- Cari kota di negara ini
      select c.name into v_city
      from public.cities c
      where c.country_code = v_country_code
        and (
          lower(unaccent(c.name)) = lower(unaccent(v_first_token))
          or lower(unaccent(v_first_token)) = any(
            select lower(unaccent(a)) from unnest(c.aliases) a
          )
        )
      limit 1;
    end if;

    return query select v_country_code, v_city, v_confidence;
    return;
  end if;

  -- Langkah 3: tidak ada koma — coba token tunggal sebagai kota unik secara global
  select count(*) into v_country_cnt
  from public.cities
  where lower(unaccent(name)) = lower(unaccent(v_trimmed));

  if v_country_cnt = 1 then
    -- Kota unik: inferensi negara dari kota
    select c.country_code, c.name into v_country_code, v_city
    from public.cities c
    where lower(unaccent(c.name)) = lower(unaccent(v_trimmed))
    limit 1;
    return query select v_country_code, v_city, 60::smallint;
    return;
  end if;

  -- Langkah 4: ambigu atau tidak dikenal → NULL (teks bebas seperti "Earth", "Remote", dll.)
  return query select null::char(2), null::text, 0::smallint;
end;
$$;

comment on function public.normalize_location(text) is
  'Normalisasi lokasi teks GitHub ke (country_code, city, confidence). Deterministik, dataset lokal. Ambigu → NULL.';
