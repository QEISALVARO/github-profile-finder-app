-- supabase/tests/05_location_normalize.sql
-- pgTAP: Verifikasi fungsi deterministik normalize_location
-- Kasus minimal: "Jakarta, Indonesia", "Jakarta", "Bandung, ID", "USA", "United Kingdom",
-- "Deutschland", "Paris" (ambigu), "Earth", "", NULL

begin;
select plan(10);

-- Test 1: "Jakarta, Indonesia" -> ID, Jakarta
select results_eq(
  'select country_code, city from public.normalize_location('Jakarta, Indonesia')',
  $$ values ('ID'::char(2), 'Jakarta'::text) $$,
  'Normalisasi "Jakarta, Indonesia" menghasilkan ID dan Jakarta'
);

-- Test 2: "Jakarta" -> ID, Jakarta (kota unik/dominan)
select results_eq(
  'select country_code, city from public.normalize_location('Jakarta')',
  $$ values ('ID'::char(2), 'Jakarta'::text) $$,
  'Normalisasi "Jakarta" menghasilkan ID dan Jakarta'
);

-- Test 3: "Bandung, ID" -> ID, Bandung
select results_eq(
  'select country_code, city from public.normalize_location('Bandung, ID')',
  $$ values ('ID'::char(2), 'Bandung'::text) $$,
  'Normalisasi "Bandung, ID" menghasilkan ID dan Bandung'
);

-- Test 4: "USA" -> US, null
select results_eq(
  'select country_code, city from public.normalize_location('USA')',
  $$ values ('US'::char(2), null::text) $$,
  'Normalisasi "USA" menghasilkan US'
);

-- Test 5: "United Kingdom" -> GB, null
select results_eq(
  'select country_code, city from public.normalize_location('United Kingdom')',
  $$ values ('GB'::char(2), null::text) $$,
  'Normalisasi "United Kingdom" menghasilkan GB'
);

-- Test 6: "Deutschland" -> DE, null
select results_eq(
  'select country_code, city from public.normalize_location('Deutschland')',
  $$ values ('DE'::char(2), null::text) $$,
  'Normalisasi "Deutschland" menghasilkan DE'
);

-- Test 7: "Paris" -> Ambigu (bisa FR, bisa US), harus NULL bila multi-match tanpa penentu negara
select results_eq(
  'select country_code from public.normalize_location('Paris')',
  $$ values (null::char(2)) $$,
  'Normalisasi "Paris" (ambigu lintas negara) menghasilkan NULL'
);

-- Test 8: "Earth" -> NULL
select results_eq(
  'select country_code, city from public.normalize_location('Earth')',
  $$ values (null::char(2), null::text) $$,
  'Normalisasi teks fiktif "Earth" menghasilkan NULL'
);

-- Test 9: "" (string kosong) -> NULL
select results_eq(
  'select country_code, city from public.normalize_location('')',
  $$ values (null::char(2), null::text) $$,
  'Normalisasi string kosong menghasilkan NULL'
);

-- Test 10: NULL -> NULL
select results_eq(
  'select country_code, city from public.normalize_location(null)',
  $$ values (null::char(2), null::text) $$,
  'Normalisasi input NULL menghasilkan NULL'
);

select * from finish();
rollback;
