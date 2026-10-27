-- supabase/seed/dev.sql
-- DATA UJI LOKAL / DEV SAJA — JANGAN PERNAH DIJALANKAN DI PRODUKSI
-- Menyiapkan akun developer dan recruiter lintas negara (ID, SG, US, NO, GB)

do $$
declare
  v_dev_id_id uuid := '11111111-1111-4111-a111-111111111111';
  v_dev_sg_id uuid := '22222222-2222-4222-a222-222222222222';
  v_dev_us_id uuid := '33333333-3333-4333-a333-333333333333';
  v_dev_no_id uuid := '44444444-4444-4444-a444-444444444444';
  v_rec_id_id uuid := '55555555-5555-4555-a555-555555555555';
  v_rec_gb_id uuid := '66666666-6666-4666-a666-666666666666';
begin
  -- 1. Buat auth.users dummy
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (v_dev_id_id, 'authenticated', 'authenticated', 'budi@dev.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"github","providers":["github"]}', '{"user_name":"budi_id","name":"Budi Santoso","avatar_url":"https://avatars.githubusercontent.com/u/101?v=4"}', now(), now()),
    (v_dev_sg_id, 'authenticated', 'authenticated', 'tan@dev.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"github","providers":["github"]}', '{"user_name":"tan_sg","name":"Tan Wei Ming","avatar_url":"https://avatars.githubusercontent.com/u/102?v=4"}', now(), now()),
    (v_dev_us_id, 'authenticated', 'authenticated', 'alex@dev.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"github","providers":["github"]}', '{"user_name":"alex_us","name":"Alex Rivers","avatar_url":"https://avatars.githubusercontent.com/u/103?v=4"}', now(), now()),
    (v_dev_no_id, 'authenticated', 'authenticated', 'lars@dev.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"github","providers":["github"]}', '{"user_name":"lars_no","name":"Lars Olsen","avatar_url":"https://avatars.githubusercontent.com/u/104?v=4"}', now(), now()),
    (v_rec_id_id, 'authenticated', 'authenticated', 'recruiter_id@co.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"github","providers":["github"]}', '{"user_name":"sari_rec","name":"Sari Talent Lead","avatar_url":"https://avatars.githubusercontent.com/u/105?v=4"}', now(), now()),
    (v_rec_gb_id, 'authenticated', 'authenticated', 'recruiter_gb@co.local', crypt('password123', gen_salt('bf')), now(), '{"provider":"github","providers":["github"]}', '{"user_name":"james_rec","name":"James Hunter","avatar_url":"https://avatars.githubusercontent.com/u/106?v=4"}', now(), now())
  on conflict (id) do nothing;

  -- 2. Update/Insert profiles
  insert into public.profiles (
    id, github_id, github_login, name, avatar_url, roles,
    country_code, city, country_source, country_confidence, location_raw
  ) values
    (v_dev_id_id, 100001, 'budi_id', 'Budi Santoso', 'https://avatars.githubusercontent.com/u/101?v=4', '{developer}', 'ID', 'Jakarta', 'self', 100, 'Jakarta, Indonesia'),
    (v_dev_sg_id, 100002, 'tan_sg', 'Tan Wei Ming', 'https://avatars.githubusercontent.com/u/102?v=4', '{developer}', 'SG', 'Singapore', 'self', 100, 'Singapore'),
    (v_dev_us_id, 100003, 'alex_us', 'Alex Rivers', 'https://avatars.githubusercontent.com/u/103?v=4', '{developer}', 'US', 'San Francisco', 'self', 100, 'San Francisco, CA'),
    (v_dev_no_id, 100004, 'lars_no', 'Lars Olsen', 'https://avatars.githubusercontent.com/u/104?v=4', '{developer}', 'NO', 'Oslo', 'self', 100, 'Oslo, Norway'),
    (v_rec_id_id, 100005, 'sari_rec', 'Sari Talent Lead', 'https://avatars.githubusercontent.com/u/105?v=4', '{recruiter}', 'ID', 'Jakarta', 'self', 100, 'Jakarta, Indonesia'),
    (v_rec_gb_id, 100006, 'james_rec', 'James Hunter', 'https://avatars.githubusercontent.com/u/106?v=4', '{recruiter}', 'GB', 'London', 'self', 100, 'London, UK')
  on conflict (id) do update set
    github_login = excluded.github_login,
    name = excluded.name,
    roles = excluded.roles,
    country_code = excluded.country_code,
    city = excluded.city,
    country_source = excluded.country_source,
    country_confidence = excluded.country_confidence;

  -- 3. Developer Settings
  insert into public.developer_settings (user_id, listed, open_to_messages, availability, headline) values
    (v_dev_id_id, true, true, 'open_to_work', 'Full-stack Go & React Engineer in Jakarta'),
    (v_dev_sg_id, true, true, 'freelance', 'Senior Backend Specialist (Python, Go, Cloud)'),
    (v_dev_us_id, true, false, 'not_available', 'Distributed Systems Architect'),
    (v_dev_no_id, true, true, 'open_to_work', 'Rust & Embedded Systems Developer')
  on conflict (user_id) do update set
    listed = excluded.listed,
    open_to_messages = excluded.open_to_messages,
    availability = excluded.availability,
    headline = excluded.headline;

  -- 4. Recruiter Profiles
  insert into public.recruiter_profiles (user_id, company, title, hiring_status, target_countries) values
    (v_rec_id_id, 'Nusantara Tech Ventures', 'Senior Tech Recruiter', 'actively_hiring', '{ID,SG}'),
    (v_rec_gb_id, 'Global Talent Partners Ltd', 'Principal Headhunter', 'actively_hiring', '{GB,US,NO,ID,SG}')
  on conflict (user_id) do update set
    company = excluded.company,
    title = excluded.title,
    hiring_status = excluded.hiring_status,
    target_countries = excluded.target_countries;

  -- 5. Contoh Projects
  insert into public.projects (
    id, owner_id, repo_id, repo_name, description, language,
    score, published, is_hidden, country_code, demo_url, demo_verified, stars
  ) values
    ('a0000000-0000-0000-0000-000000000001', v_dev_id_id, 9001, 'budi_id/tokoonline-core', 'High-throughput e-commerce microservices in Go', 'Go', 88, true, false, 'ID', 'https://demo.tokoonline.id', true, 142),
    ('a0000000-0000-0000-0000-000000000002', v_dev_sg_id, 9002, 'tan_sg/fintech-pipeline', 'Real-time financial transaction processor with Kafka and Rust', 'Rust', 92, true, false, 'SG', 'https://demo.fintech.sg', true, 310),
    ('a0000000-0000-0000-0000-000000000003', v_dev_no_id, 9003, 'lars_no/nordic-iot', 'Embedded firmware and telemetry for weather sensors', 'C++', 85, true, false, 'NO', null, false, 89)
  on conflict (id) do nothing;

end $$;
