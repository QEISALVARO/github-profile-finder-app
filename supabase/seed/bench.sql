-- supabase/seed/bench.sql
-- Seed benchmark BE-3: >= 10.000 proyek sintetis lintas >= 30 negara.
-- TIDAK otomatis dijalankan `make reset` (berkas bench.* dikecualikan dari seed
-- default); jalankan manual: psql $DATABASE_URL -f supabase/seed/bench.sql
-- atau target `make bench-seed` (lihat Makefile).
-- Campuran teks Indonesia/Inggris, stack/role/stars/pushed_at bervariasi,
-- ±5% tidak aktif, ±3% is_hidden, ±10% pemilik tidak listed.

do $$
declare
  v_countries char(2)[] := array[
    'ID','SG','US','GB','NO','DE','FR','NL','IN','BR','JP','KR','AU','CA','MY',
    'TH','VN','PH','ES','IT','SE','FI','DK','PL','UA','TR','AE','SA','ZA','NG',
    'EG','MX','AR','CL','NZ','CH'
  ];
  v_roles text[] := array['Front-End','Back-End','Mobile','Data'];
  v_stacks jsonb[] := array[
    '[{"name":"Go","percent":70},{"name":"React","percent":30}]'::jsonb,
    '[{"name":"Python","percent":80},{"name":"React","percent":20}]'::jsonb,
    '[{"name":"TypeScript","percent":90},{"name":"Node.js","percent":10}]'::jsonb,
    '[{"name":"Kotlin","percent":100}]'::jsonb,
    '[{"name":"Swift","percent":100}]'::jsonb,
    '[{"name":"Rust","percent":60},{"name":"Python","percent":40}]'::jsonb
  ];
  v_names text[] := array[
    'tokoonline-core','fintech-pipeline','nordic-iot','kopi-tracker','sawah-monitor',
    'ecommerce-search','chat-realtime','ml-pipeline','data-lake','api-gateway',
    'mobile-bank','web-dashboard','iot-sensor','cloud-sync','auth-service'
  ];
  v_descs text[] := array[
    'High-throughput e-commerce microservices in Go',
    'Realtime financial transaction processor with Kafka',
    'Sistem monitoring sawah berbasis IoT dan machine learning',
    'Aplikasi pelacak kopi nusantara dengan peta interaktif',
    'Realtime chat with end-to-end encryption',
    'Machine learning pipeline untuk prediksi harga',
    'Data lake untuk analitik penjualan ritel Indonesia',
    'API gateway dengan rate limiting dan caching Redis',
    'Mobile banking dengan biometric authentication',
    'Dashboard analitik penjualan dengan visualisasi realtime'
  ];
  v_owner uuid;
  v_n_owners int := 400;
  i int;
  r int;
  v_cc char(2);
  v_city text;
  v_role text;
  v_stack jsonb;
  v_pushed timestamptz;
  v_active boolean;
  v_hidden boolean;
  v_score int;
  v_stars int;
begin
  -- pemilik sintetis (400 akun; 10% tidak listed)
  for i in 1..v_n_owners loop
    v_owner := gen_random_uuid();
    v_cc := v_countries[1 + (i % array_length(v_countries, 1))];
    insert into public.profiles (id, github_id, login, github_login, name, roles, country_code, city, country_source)
    values (v_owner, 800000 + i, 'bench' || i, 'bench' || i, 'Bench ' || i, '{developer}', v_cc, 'Kota-' || i, 'self')
    on conflict (id) do nothing;
    insert into public.developer_settings (user_id, listed, open_to_messages)
    values (v_owner, (i % 10) <> 0, true)
    on conflict (user_id) do update set listed = excluded.listed;
  end loop;

  -- proyek: 10.000 baris
  for i in 1..10000 loop
    select id into v_owner from public.profiles where login = 'bench' || (1 + (i % v_n_owners)) limit 1;
    v_cc := v_countries[1 + (i % array_length(v_countries, 1))];
    v_role := v_roles[1 + (i % 4)];
    v_stack := v_stacks[1 + (i % 6)];
    r := (i * 7919) % 100;
    v_active := r >= 5;                    -- ±5% tidak aktif
    v_hidden := ((i * 104729) % 100) < 3;  -- ±3% hidden
    v_pushed := case when v_active
      then now() - ((i * 13) % 25 || ' days')::interval
      else now() - ((40 + (i % 300)) || ' days')::interval end;
    v_score := 40 + ((i * 37) % 58);
    v_stars := (i * 101) % 5000;
    v_city := 'Kota-' || (1 + (i % 120));
    insert into public.projects
      (owner_id, github_repo_id, name, description, role, stack, score, published, is_hidden,
       country_code, city, pushed_at, stars, demo_url, demo_verified)
    values
      (v_owner, 900000 + i,
       v_names[1 + (i % array_length(v_names, 1))] || '-' || i,
       v_descs[1 + (i % array_length(v_descs, 1))],
       v_role, v_stack, v_score, true, v_hidden,
       v_cc, v_city, v_pushed, v_stars, null, false)
    on conflict (github_repo_id) do nothing;
  end loop;

  -- refresh rank + featured agar bench mengukur kondisi produksi
  perform public.refresh_rank_scores();
  perform public.refresh_featured(10);
end $$;
