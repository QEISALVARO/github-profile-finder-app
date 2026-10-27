# PRD V2 — Gitscope "Nyata" (Backend + Database + Data Asli)

> **Versi:** 2.1 (draft) · **Tanggal:** 20 Oktober 2026
> **Perubahan 2.1:** cakupan pasar diubah menjadi **GLOBAL** (default) dan ditambahkan **Filter Negara** agar recruiter dapat menargetkan developer dari negara tujuan (lihat §3.2–3.3, §11A).
> **Hubungan dengan dokumen lain:** `PRD.md` (v1) tetap menjadi fondasi **UI/UX**. Dokumen ini **menggantikan lapisan data dan logika** v1 yang bersifat mock/statis. `design.md` tetap berlaku; layar baru perlu penambahan desain (lihat §15).
> **Keputusan produk:** Gitscope tidak lagi berhenti sebagai prototype. Feed, skor, pipeline, chat, dan report harus berasal dari data dan proses asli.

---

## 1. Ringkasan Perubahan Arah

| | v1 (prototype) | v2 (nyata) |
|---|---|---|
| Akun | Tidak ada | Login GitHub (OAuth); peran **Developer** dan/atau **Recruiter** |
| Feed proyek | 4 proyek statis | Proyek yang **dipublikasikan developer**, diverifikasi server, bisa dicari dan di-paginate |
| Skor keaslian | Rumus sederhana di client | Analisis server (**scoring v2**) dengan rincian dan bukti yang bisa dibuka |
| Heatmap, "642 contributions", "Consistent", "Deep" | Dekoratif/statis | Dihitung dari contribution calendar GitHub |
| Talent Discover | 4 kandidat statis | Pencarian atas developer yang **opt-in** |
| Lokasi / negara | 4 kota statis (Jakarta, Bandung, Surabaya, "Indonesia") | **Filter negara (multi-pilih) + kota**, target negara tersimpan per recruiter, cakupan global |
| Pipeline, Compare | Memori lokal | Tersimpan di database per recruiter |
| Chat | Lokal, tanpa lawan bicara | Realtime antar dua akun + push notification |
| Export report | Toast mock | PDF sungguhan dari snapshot analisis |
| Profile tab | Menampilkan developer terakhir dianalisis | Akun pengguna yang login + statistik asli |
| Fallback saat API gagal | Data palsu dari proyek | **Dihapus.** Diganti cache lama (stale) atau error dengan tombol retry |

> ⚠️ **Perubahan penting terhadap v1 §5.2:** fallback yang menyajikan data karangan sebagai data asli tidak boleh ada di produk nyata. Itu menipu pengguna yang mengambil keputusan rekrutmen.

---

## 2. Keputusan Arsitektur & Produk (default — bisa diubah)

| # | Keputusan | Default yang dipilih | Alasan |
|---|---|---|---|
| K1 | Backend | **Supabase** (Postgres, Auth, Realtime, Storage, Edge Functions, cron) | Satu platform mencakup auth GitHub, RLS, realtime chat, dan fungsi server; SDK matang untuk Expo |
| K2 | Auth | **GitHub OAuth** via Supabase, scope minimal `read:user` (tanpa email) | Identitas = akun GitHub; memverifikasi kepemilikan repo |
| K3 | Model dua sisi | Developer **opt-in** untuk tampil di Feed dan Discover; recruiter mendaftar dengan profil perusahaan | Persetujuan dan kepatuhan kebijakan (lihat §3) |
| K4 | Data GitHub | Diambil **server-side** (Edge Function) dengan token milik layanan, di-cache di DB | Token tidak boleh ada di client; hemat rate limit |
| K5 | Pencarian | Postgres full-text + `pg_trgm` + tabel alias keyword | Tanpa layanan search tambahan di awal |
| K6 | Chat | Supabase Realtime + tabel `messages` + Expo Push | Realtime native ke Postgres |
| K7 | Client data layer | **TanStack Query** (wajib) + `supabase-js` | Cache, retry, infinite query |
| K8 | PDF | `expo-print` di perangkat dari snapshot analisis (opsional upload ke Storage) | Tanpa server render |
| K9 | Monetisasi | Di luar scope v2 ("PRO WORKSPACE" tetap label kosmetik) | Fokus pada nilai inti dulu |
| K10 | Cakupan pasar | **Global** (bukan Indonesia saja) | Keputusan produk 2.1 |
| K11 | Negara developer | `country_code` ISO 3166-1 alpha-2: **dinyatakan sendiri** (otoritatif) atau **diinferensi** dari lokasi GitHub (dengan confidence); wajib terisi agar boleh `listed` | Kualitas filter negara dan kepatuhan |

---

## 3. Kebijakan, Privasi, dan Risiko Hukum (WAJIB dibaca sebelum membangun)

### 3.1 Kebijakan GitHub
Kebijakan penggunaan yang dapat diterima GitHub (Acceptable Use Policies) melarang penggunaan informasi dari layanan GitHub — baik hasil scraping, API, maupun cara lain — untuk spam, termasuk mengirim email massal yang tidak diminta kepada pengguna atau menjual data pribadi kepada recruiter, headhunter, dan job board. Penggunaan informasi juga harus mengikuti GitHub Privacy Statement. Sumber: `docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies`. Karena Gitscope adalah **produk untuk recruiter**, ini adalah risiko utama, bukan catatan kaki.

**Konsekuensi desain (menjadi requirement):**
| ID | Requirement |
|---|---|
| POL-1 | Developer hanya muncul di **Feed dan Discover bila `listed = true`** (opt-in eksplisit, bisa dicabut kapan saja). |
| POL-2 | Komunikasi hanya lewat **chat dalam aplikasi**; **tidak** menampilkan atau mengekspor email developer (termasuk dari metadata commit). |
| POL-3 | **Tidak ada ekspor massal** data developer (tanpa CSV/daftar kontak). Report PDF hanya per-kandidat untuk penggunaan recruiter itu sendiri. |
| POL-4 | Pesan pertama ke developer **dibatasi laju** dan harus memuat konteks (perusahaan, posisi); developer bisa menolak, memblokir, atau melaporkan. Developer harus `open_to_messages = true`. |
| POL-5 | Analisis untuk username yang **belum bergabung** (lookup oleh recruiter) hanya berupa cache sementara (TTL 24 jam), **tidak** diindeks di Feed/Discover. |
| POL-6 | Gunakan **hanya API resmi**; tanpa scraping halaman. Hormati rate limit dan secondary rate limit. |
| POL-7 | Syarat GitHub dapat berubah — jadwalkan **tinjauan ulang kebijakan** berkala dan minta **tinjauan hukum** sebelum rilis publik. |
| POL-8 | "Negara" berarti **lokasi domisili yang dinyatakan developer**, bukan kewarganegaraan. **Tidak ada** filter berdasarkan kewarganegaraan, etnis, agama, usia, atau gender. |
| POL-9 | Developer **tidak bisa `listed` / mempublikasikan proyek tanpa negara terisi**. Negara hasil inferensi dengan confidence rendah **tidak** dipakai oleh filter sampai dikonfirmasi pemiliknya. |

### 3.2 Privasi data pribadi (cakupan global)
Karena produk **global**, pengguna datang dari banyak yurisdiksi. Rencanakan kepatuhan **berlapis**, bukan satu negara:

| Rezim (contoh, bukan daftar lengkap) | Implikasi umum |
|---|---|
| GDPR / UK GDPR (EU/UK) | Dasar pemrosesan sah, hak akses/hapus/koreksi/portabilitas, DPA dengan vendor, mekanisme transfer lintas negara (mis. SCC), penunjukan perwakilan/DPO bila diwajibkan |
| UU PDP No. 27/2022 (Indonesia) | Persetujuan eksplisit, hak subjek data, ketentuan transfer lintas negara |
| CCPA/CPRA (California) dan hukum negara bagian AS lain | Pemberitahuan pengumpulan, hak opt-out atas "sale/share", permintaan hapus |
| LGPD (Brasil), PDPA (Singapura/Thailand), dan hukum setempat lain | Persetujuan/kepentingan sah, notifikasi pelanggaran, hak subjek data |

**Requirement lintas rezim:**
- Privacy Policy + Terms of Service; persetujuan eksplisit saat onboarding; **hapus akun in-app** (disyaratkan toko aplikasi); ekspor/akses data atas permintaan; retensi terdefinisi (§14).
- **Batas usia 18+** (konteks ketenagakerjaan) pada onboarding.
- **Strategi wilayah data:** mulai dari satu region Supabase yang dekat dengan mayoritas pengguna; catat transfer lintas negara di Privacy Policy dan rencanakan opsi region tambahan (mis. EU) saat basis pengguna di sana bertumbuh. **Konsultasikan dengan penasihat hukum** untuk dasar hukum, DPA, dan mekanisme transfer.
- Pengiriman data ke pihak ketiga (analytics, error tracking, push) harus tercantum dan mematuhi persetujuan (termasuk ATT di iOS bila ada pelacakan).
- **Data pihak ketiga** (login yang disimpan recruiter di pipeline): minimal (login, stage, catatan) dan dihapus bila developer meminta.
- **Skor bukan keputusan otomatis final.** Tampilkan rincian dan bukti ("Transparent scoring" v1) serta penafian bahwa skor hanyalah sinyal bantu.

### 3.3 Regulasi perekrutan berbasis algoritma, anti-diskriminasi, dan sanksi
- **EU AI Act:** sistem yang digunakan untuk menyaring atau mengevaluasi kandidat termasuk kategori **risiko tinggi** (Annex III, ketenagakerjaan). Menurut laporan hukum per Juni 2026, penerapan kewajiban risiko tinggi ditunda dari 2 Agustus 2026 ke **2 Desember 2027** lewat *Digital Omnibus on AI* (disetujui Parlemen Eropa 16 Juni 2026; persetujuan formal Dewan dan publikasi saat itu masih menunggu). **Verifikasi status adopsi final.** Apakah scoring berbasis aturan Gitscope termasuk "sistem AI" harus dinilai oleh penasihat hukum; sambil menunggu, terapkan mitigasi di bawah. Sumber: remoteworkeurope.eu (16 Jun 2026); knowledge.dlapiper.com (29 Apr 2026).
- **Hukum alat keputusan ketenagakerjaan otomatis** di yurisdiksi lain (mis. aturan kota/negara bagian AS yang mewajibkan notifikasi dan audit bias) perlu ditinjau per pasar target.
- **Mitigasi bawaan produk (menjadi requirement):**
  | ID | Requirement |
  |---|---|
  | AIR-1 | **Human-in-the-loop:** skor tidak pernah menolak/meloloskan kandidat otomatis; tidak ada fitur auto-reject |
  | AIR-2 | **Transparansi:** rincian komponen skor, bukti, versi skor (`score_version`), dan keterbatasan ditampilkan |
  | AIR-3 | **Hak developer:** dapat melihat skor dan bukti miliknya, meminta koreksi/tinjauan ulang, dan opt-out (`listed = false`) |
  | AIR-4 | **Audit bias berkala:** uji distribusi skor per kelompok negara/wilayah dan per bahasa pemrograman untuk mendeteksi bias sistematis; dokumentasikan hasilnya |
  | AIR-5 | Tidak ada fitur yang menyimpulkan atribut sensitif (etnis, agama, gender, usia) |
- **Anti-diskriminasi:** filter negara adalah filter **lokasi domisili** (POL-8). ToS menegaskan bahwa recruiter bertanggung jawab atas kepatuhan hukum ketenagakerjaan dan anti-diskriminasi di yurisdiksinya.
- **Sanksi dan kontrol perdagangan:** GitHub memiliki kebijakan Trade Controls sendiri; layanan global perlu meninjau sanksi/ekspor dan ketersediaan di App Store/Google Play per negara sebelum rilis.

---

## 4. Peta Mock → Nyata (per fitur v1)

| Fitur v1 | Status v1 | Implementasi v2 | Bagian |
|---|---|---|---|
| FR-G1…G5 shell global | UI | Tetap; tambah state auth/sesi | §6 |
| FR-E1–E6, E8, E9 Feed | Seed statis | Query `projects` + paginasi, filter server-side | §10 |
| Select lokasi (FR-E4) & tag lokasi (FR-T3) | 5 opsi statis / tag dekoratif "Any location" | **CountryPicker** multi-pilih + kota + target negara recruiter | §11A |
| FR-E7 Analyze | GitHub API + fallback palsu | Edge Function `analyze-developer`; stale/error, **tanpa data palsu** | §8, §9 |
| FR-A1–A8 Analysis | Rumus client | Hasil `analyses` (scoring v2), framework & heatmap asli | §9 |
| FR-T3–T5 Discover | 4 kandidat statis | Pencarian `developers` opt-in | §11 |
| FR-T6 Pipeline | Memori; ringkasan 7/3/1 statis | Tabel `pipeline_entries`; hitungan nyata | §11 |
| FR-T7 Compare | Nilai statis (184/72, 28/19 wks) | Metrik nyata dari `analyses` | §11 |
| FR-I1–I5 Inbox | Statis | `conversations` + `messages`, unread asli | §12 |
| FR-C1–C5 Chat | Lokal | Realtime, presence, read receipt | §12 |
| FR-P1–P5 Profile | Developer terakhir; statistik statis | Akun login; statistik dari DB | §13 |
| Export report | Toast | PDF dari snapshot; daftar report | §13 |

---

## 5. Arsitektur

```
┌────────────────────────── Expo App (RN) ──────────────────────────┐
│ UI (M0–M6)  →  TanStack Query  →  src/api/*  →  supabase-js        │
│                                   │      │                          │
│               expo-notifications  │      └── Realtime (messages,   │
│               expo-print          │          presence)              │
└───────────────────────────────────┼────────────────────────────────┘
                                    ▼
┌────────────────────────────── Supabase ───────────────────────────┐
│ Auth (GitHub OAuth)   Postgres + RLS   Realtime   Storage          │
│ Edge Functions: analyze-developer · publish-project ·              │
│   refresh-stale (cron) · notify-message (DB webhook) ·             │
│   delete-account · moderate                                        │
└───────────────────────────────┬───────────────────────────────────┘
                                ▼
                   GitHub REST + GraphQL API (token layanan)
```

**Aturan:**
- Client memakai **anon key** (aman karena dilindungi **RLS**). **Service role key hanya di Edge Functions**; tidak pernah di bundle.
- Semua panggilan ke GitHub lewat Edge Function; client tidak memanggil `api.github.com` lagi.
- Variabel env client: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Rahasia server via Supabase secrets.

### 5.1 Struktur repo tambahan
```
supabase/
  migrations/         # skema, RLS, index, cron
  functions/          # analyze-developer, publish-project, refresh-stale, notify-message, delete-account
  seed.sql            # data demo untuk DEV saja (pengganti src/data/seed.ts di runtime)
  tests/              # pgTAP untuk RLS
src/
  api/                # fungsi tipis per domain (projects, developers, analysis, chat, pipeline, reports)
  api/queries/        # hooks TanStack Query
  types/database.ts   # hasil `supabase gen types typescript`
```
`src/data/seed.ts` **tidak dipakai di runtime**; hanya untuk fixture test dan dev.

---

## 6. Autentikasi & Peran

### 6.1 Alur
1. **Welcome** → "Continue with GitHub" → `signInWithOAuth({ provider: 'github', options: { redirectTo: 'gitscope://auth/callback', skipBrowserRedirect: true, scopes: 'read:user' } })` + `expo-web-browser`.
2. Sesi disimpan aman (adapter penyimpanan terenkripsi / `expo-secure-store` untuk kunci enkripsi).
3. **Onboarding peran**: pilih Developer, Recruiter, atau keduanya.
   - Recruiter: isi perusahaan dan jabatan (`recruiter_profiles`).
   - Developer: pilih **negara domisili** (dan kota; negara dari lokasi GitHub ditawarkan sebagai saran untuk dikonfirmasi), visibilitas (`listed` — hanya bisa aktif bila negara terisi, POL-9), `open_to_messages`, `availability`.
   - Recruiter: pilih **negara tujuan** (`target_countries`, boleh kosong = semua negara).
4. Trigger DB membuat baris `profiles` dari data GitHub saat user pertama kali muncul di `auth.users`.

### 6.2 Aturan akses ringkas
| Aksi | Syarat |
|---|---|
| Lihat Feed/Discover | Login |
| Analyze username (lookup) | Login sebagai recruiter; dibatasi laju |
| Publish proyek | Login sebagai developer; pemilik repo terverifikasi |
| Kirim pesan pertama | Recruiter → developer dengan `open_to_messages` |
| Balas pesan | Peserta percakapan |
| Pipeline/Reports | Pemilik (recruiter) |

---

## 7. Model Data (Postgres)

```sql
create type user_role      as enum ('developer','recruiter');
create type availability   as enum ('open_to_work','freelance','not_available');
create type pipeline_stage as enum ('saved','interviewing','hired');

create table countries (
  iso2 char(2) primary key,                         -- ISO 3166-1 alpha-2
  name text not null, name_local text, region text, -- region: benua/subregion untuk pengelompokan
  aliases text[] not null default '{}'              -- "USA", "United States", "Deutschland", ...
);
create table cities (                               -- dataset terbuka (cek lisensi/atribusi, mis. GeoNames)
  id bigint primary key, country_code char(2) not null references countries,
  name text not null, aliases text[] not null default '{}', population int
);
create index on cities (country_code);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  github_id bigint unique not null,
  login text not null, name text, avatar_url text, bio text,
  location_text text,                               -- teks asli dari GitHub
  country_code char(2) references countries,        -- domisili (K11)
  city text,
  country_source text check (country_source in ('self','inferred')),
  country_confidence smallint check (country_confidence between 0 and 100),   -- 100 untuk 'self'
  roles user_role[] not null default '{}',
  created_at timestamptz not null default now()
);

create table developer_settings (
  user_id uuid primary key references profiles on delete cascade,
  listed boolean not null default false,            -- opt-in Feed/Discover (POL-1)
  open_to_messages boolean not null default false,  -- (POL-4)
  availability availability not null default 'not_available',
  headline text
);

create table recruiter_profiles (
  user_id uuid primary key references profiles on delete cascade,
  company text not null, title text,
  verified boolean not null default false,
  hiring_status text not null default 'open_for_hiring',   -- open_for_hiring | open_for_freelance | paused
  target_countries char(2)[] not null default '{}'   -- negara tujuan (kosong = semua)
);

-- Cache data publik GitHub (juga untuk username yang belum bergabung; TTL, POL-5)
create table github_snapshots (
  login text primary key, github_id bigint,
  user_json jsonb not null, repos_json jsonb not null,
  etag_user text, fetched_at timestamptz not null default now()
);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  github_login text not null,
  score_version int not null,
  authenticity int not null check (authenticity between 0 and 100),
  confidence   int not null check (confidence   between 0 and 100),
  breakdown jsonb not null,            -- komponen skor + evidence[] (§9)
  primary_language text, inferred_role text,
  language_stats jsonb,                -- [{name,value}] top 3 berdasarkan byte
  frameworks text[],                   -- terdeteksi dari manifest
  metrics jsonb,                       -- original_ratio, demo_ratio, original_count, commit_health,
                                       -- contribution_depth, streak_weeks, contributions_12m, yoy_pct
  heatmap smallint[],                  -- 84 level 0..4 (12 minggu terakhir)
  created_at timestamptz not null default now()
);
create index on analyses (github_login, created_at desc);

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  github_repo_id bigint unique not null,
  name text not null, description text,
  role text not null,                  -- Front-End | Back-End | Mobile | Data (dapat diubah developer)
  country_code char(2) references countries,   -- denormalisasi dari pemilik (trigger) untuk filter cepat
  stack jsonb not null,                -- [{name,percent}]
  demo_url text, demo_verified boolean not null default false,
  stars int not null default 0, pushed_at timestamptz,
  active boolean generated always as (pushed_at > now() - interval '30 days') stored,
  score int,                           -- skor proyek (analisis repo)
  published boolean not null default true, is_hidden boolean not null default false,  -- moderasi
  search tsvector,                     -- diisi trigger (nama, deskripsi, role, stack, nama developer)
  created_at timestamptz not null default now()
);
create index projects_search_idx on projects using gin (search);
create index projects_rank_idx   on projects (published, is_hidden, score desc);

create table keyword_aliases (alias text primary key, expands text[] not null);   -- golang→{go}, ml→{pytorch,tensorflow,machine learning}

create table conversations (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references profiles, developer_id uuid not null references profiles,
  project_id uuid references projects, context_label text,        -- "DISCUSSING PROJECT"
  status text not null default 'active',                          -- active | declined | blocked
  last_message_at timestamptz, created_at timestamptz not null default now(),
  unique (recruiter_id, developer_id, project_id)
);
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations on delete cascade,
  sender_id uuid not null references profiles, body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(), delivered_at timestamptz, read_at timestamptz
);
create index on messages (conversation_id, created_at);

create table pipeline_entries (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references profiles on delete cascade,
  github_login text not null, stage pipeline_stage not null default 'saved', note text,
  updated_at timestamptz not null default now(),
  unique (recruiter_id, github_login)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references profiles on delete cascade,
  analysis_id uuid not null references analyses, storage_path text,
  created_at timestamptz not null default now()
);

create table push_tokens (user_id uuid references profiles on delete cascade, token text, platform text, primary key (user_id, token));
create table blocks      (blocker_id uuid references profiles on delete cascade, blocked_id uuid references profiles on delete cascade, primary key (blocker_id, blocked_id));
create table abuse_reports (id uuid primary key default gen_random_uuid(), reporter_id uuid references profiles, target_type text, target_id text, reason text, created_at timestamptz default now());
```

### 7.1 RLS (semua tabel `enable row level security`; default tolak)
| Tabel | Aturan inti |
|---|---|
| `profiles` | Baca diri sendiri; baca profil lain **hanya jika** developer `listed` atau lawan bicara di percakapan aktif |
| `developer_settings` | Pemilik tulis/baca; recruiter hanya baca lewat view publik (`listed = true`) |
| `projects` | Baca jika `published and not is_hidden`; tulis hanya pemilik |
| `analyses`, `github_snapshots` | **Hanya Edge Function (service role)** yang menulis; client membaca lewat fungsi/RPC |
| `conversations`/`messages` | Hanya peserta; kirim hanya bila `status = 'active'` (kontrak di bawah) |
| `pipeline_entries`, `reports`, `push_tokens` | Hanya pemilik |
| `blocks`, `abuse_reports` | Pemilik / admin |

```sql
create policy "participants read" on messages for select using (
  exists (select 1 from conversations c
          where c.id = conversation_id and auth.uid() in (c.recruiter_id, c.developer_id)));
create policy "participants send" on messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from conversations c
          where c.id = conversation_id and auth.uid() in (c.recruiter_id, c.developer_id) and c.status = 'active'));
```
Semua kebijakan **wajib diuji** dengan pgTAP (§17).

---

## 8. Integrasi GitHub (server-side)

| Topik | Rancangan |
|---|---|
| Kredensial | **GitHub App** (disarankan) atau token layanan di Supabase secrets; scope baca data publik saja |
| Endpoint | REST: `/users/{login}`, `/users/{login}/repos`, `/repos/{o}/{r}/languages`; GraphQL: `contributionsCollection` (kalender kontribusi, PR/review/issue), isi root repo (deteksi README/CI/tests/manifest) |
| Cache | `github_snapshots` + `analyses`; TTL **12 jam** (developer terdaftar), **24 jam** (lookup); gunakan **ETag/If-None-Match** (respons 304 tidak menambah beban) |
| Refresh | On-demand dengan batas 1× / 15 menit / login; cron `refresh-stale` untuk developer `listed` |
| Rate limit | Pantau header `x-ratelimit-*`; backoff dan antrean saat mendekati batas; tangani secondary rate limit. **Verifikasi kuota terkini di dokumentasi GitHub** (per token terautentikasi jauh lebih besar dari 60/jam tanpa auth) dan rencanakan kapasitas |
| Keamanan | URL demo diperiksa server-side dengan **proteksi SSRF** (blok IP privat/loopback/metadata, batasi redirect, timeout 5 dtk, hanya `http(s)`) |
| Kegagalan | Kembalikan kode error terstruktur: `NOT_FOUND`, `RATE_LIMITED` (+`retry_after`), `UPSTREAM_ERROR`; bila ada analisis lama → kembalikan **stale** dengan `stale_since` |

### 8.1 Kontrak Edge Function `analyze-developer`
```
POST /functions/v1/analyze-developer   { login: string, force?: boolean }
200 AnalysisVM (datar: user, repos(≤8), authenticity, breakdown, metrics, heatmap[84], source: "fresh" | "cache" | "stale", staleSince?)
404 { code: "NOT_FOUND" }   429 { code: "RATE_LIMITED", retry_after: number }   502 { code: "UPSTREAM_ERROR" }
```
Dibatasi laju per pengguna (mis. 30 analisis/jam; sesuaikan).

---

## 9. Scoring v2 (menggantikan rumus §5.3 v1)

> Rumus v1 (`originalRatio·0.55 + demoRatio·0.2 + min(public_repos,25)`) tidak layak untuk keputusan nyata: `public_repos` mudah dimanipulasi, `homepage` tidak diverifikasi, dan tidak ada sinyal aktivitas. **Scoring v2** berbobot, transparan, dan versioned (`score_version = 2`).

### 9.1 Komponen (total 100, bobot dapat di-tune lewat konfigurasi)
| Komponen | Bobot | Cara hitung |
|---|---|---|
| **Originality** | 30 | Rasio repo milik sendiri yang **bukan fork** (maks. 30 repo terbaru, non-archived); fork dengan divergensi signifikan dihitung parsial |
| **Activity & recency** | 20 | Push ≤ 30 hari → penuh, meluruh hingga 0 pada 365 hari; ditambah jumlah minggu aktif dalam 52 minggu |
| **Proof (demo/rilis)** | 15 | Persentase repo teratas dengan **demo hidup terverifikasi** (HTTP 2xx) atau rilis/paket |
| **Substance** | 20 | Sampel ≤ 5 repo teratas: ada README, CI (`.github/workflows`), test, lisensi, ukuran wajar |
| **Contribution depth** | 15 | PR ter-merge ke repo orang lain, review, issue (dari `contributionsCollection`) |

**Penalti/penanda:** repo dibuat massal (≥ 10 repo dalam 24 jam) → −10 + flag; akun < 90 hari → skor maksimum 70.
**Keluaran `breakdown`:** nilai tiap komponen + `evidence[]` (URL repo/PR dan alasan) → tombol **"View evidence"** v1 menjadi nyata.

### 9.2 Turunan lain (menggantikan nilai statis v1)
| Elemen UI | Sumber nyata |
|---|---|
| `{n}% CONFIDENCE` | **Kelengkapan data** (0–100): jumlah repo teratas yang berhasil dianalisis, GraphQL sukses, dsb. — bukan angka tetap 94 |
| Teks `HIGH/MEDIUM/LOW CONFIDENCE` + "Original, active work" | Tier dinamis: ≥ 85 tinggi, 65–84 sedang, < 65 rendah; copy mengikuti tier |
| Language breakdown | **Byte** per bahasa dari endpoint `languages`, dijumlah lintas repo teratas, 3 teratas (bukan hitungan repo) |
| Primary role | Bahasa + topik repo + **manifest** (`pubspec.yaml`→Mobile; `package.json` berisi `react-native`/`expo`→Mobile, `react`/`vue`→Front-End; `go.mod`/`Cargo.toml`→Back-End; `requirements.txt`/notebook/`torch`→AI/Data) |
| Chip framework | Terdeteksi dari manifest (menggantikan `React · Vite · Node.js · +3 tools` statis) |
| Commit health | Minggu aktif dari 12 minggu terakhir: ≥ 9 `Consistent`, 5–8 `Irregular`, < 5 `Sporadic` |
| Contribution | Kontribusi ke repo orang lain: ≥ 20 `Deep`, 5–19 `Moderate`, < 5 `Light` |
| Live demos % | Persentase demo **terverifikasi**, bukan sekadar field `homepage` |
| Original work | Jumlah dan persentase repo non-fork nyata |
| Heatmap | `heatmap[84]` dari kalender (NONE→0 … FOURTH_QUARTILE→4), 84 hari terakhir |
| `642 contributions` / `+18% vs last year` | Total 12 bulan terakhir dan **YoY** vs 12 bulan sebelumnya (dua query GraphQL) |
| Compare: Original projects / Commit streak | Jumlah repo non-fork; **streak minggu berturut-turut** dengan ≥ 1 kontribusi |

> **Keputusan copy:** heatmap menampilkan **12 minggu** (84 hari) sementara label v1 berbunyi "12 month momentum". Default v2: ubah label menjadi **"12 week momentum"** dan tampilkan total 12 bulan sebagai angka terpisah.

---

## 10. Feed Proyek Nyata

### 10.1 Publikasi (developer)
1. Developer membuka **My Projects → Publish** dan memilih repo (daftar dari GitHub).
2. Edge Function `publish-project` memverifikasi: repo **publik**; `owner.id == github_id` pengguna (atau kontributor dengan porsi commit signifikan); bukan fork murni.
3. Server menghitung `stack` (persentase dari byte bahasa + deteksi framework: mis. **"Flutter 65% / Dart 35%"**), `role` awal (dapat diubah developer), `active`, dan cek `demo_url` (SSRF-safe).
4. Proyek tampil di Feed bila `published` dan developer `listed`.

### 10.2 Kueri & peringkat
- Filter v1 dipertahankan (keyword, role, lokasi, Active 30d) tetapi **di server**: tokenisasi `split(/[\s-]+/)` → `to_tsquery` AND dengan prefix `:*`, plus **alias** (`golang→go`, `ml→pytorch/tensorflow`) dari `keyword_aliases` — ini **menyelesaikan O4** (chip "Python ML" dan "Golang" kini menghasilkan hasil).
- Lokasi: filter berdasarkan `country_code` (multi-negara) dan `city` — detail di **§11A**. Semantik v1 "Indonesia = semua lokasi non-kosong" diganti oleh filter negara yang sebenarnya.
- Urutan default: `rank = 0.5·score + 0.3·recency + 0.2·log(stars)` (dinormalisasi). Bagian **"FEATURED THIS WEEK"** = N teratas yang di-refresh mingguan oleh cron.
- **Paginasi kursor** + infinite scroll. Counter `{n} PROJECTS` = `total_count`.
- Badge: `VERIFIED ACTIVE` bila `active`; bila tidak aktif tampil `VERIFIED` (menyelesaikan **O1/D7**; inaktif tidak lagi berlabel "ACTIVE").

### 10.3 Moderasi
Laporkan proyek (`abuse_reports`), `is_hidden` oleh admin, takedown cepat; developer dapat unpublish kapan saja.

---

## 11. Talent Nyata

| Sub-tab | Implementasi |
|---|---|
| **Discover** | Pencarian atas `developers` dengan `listed = true`: filter **negara (multi-pilih)** & kota (§11A), role, skor minimum (70–95), bahasa, availability; pagination; urut berdasarkan skor. Tap kandidat → Analysis (cache segar) |
| **Pipeline** | `pipeline_entries` per recruiter (Saved/Interviewing/Hired + catatan); ringkasan **nyata** (menggantikan 7/3/1 statis); pindah stage lewat aksi di baris |
| **Compare** | Maks. 2 kandidat (FIFO seperti v1); metrik dari `analyses` terbaru (language, original count, streak, availability); pilihan boleh lokal |

---

## 11A. Filter Negara (Fitur Inti Global)

**Tujuan:** recruiter dapat menargetkan developer dari negara yang dituju, di Feed maupun Talent Discover, dan menyimpan negara tujuan default.

### Sumber & kualitas data negara
| Sumber | `country_source` | Aturan |
|---|---|---|
| Dipilih developer saat onboarding/Settings | `self` | Otoritatif, confidence 100 |
| Inferensi dari `location` di profil GitHub | `inferred` | Hanya saran; confidence dihitung; **diminta konfirmasi** pada onboarding |
| Tidak diketahui | `null` | Tidak muncul di hasil filter negara; tidak bisa `listed` (POL-9) |

**Pipeline normalisasi lokasi (Edge Function, deterministik):** trim → pisah dengan koma → cocokkan token terakhir ke `countries.name/aliases/iso2` → cocokkan token kota ke `cities` (dalam negara yang ditemukan, atau ke kota unik secara global) → bila ambigu (mis. nama kota yang sama di beberapa negara, atau teks bebas seperti "Earth") → `country_code = null`, minta konfirmasi. **Jangan** mengirim teks lokasi pengguna ke geocoder pihak ketiga tanpa DPA dan dasar hukum; gunakan dataset lokal.

### Negara tujuan recruiter
- `recruiter_profiles.target_countries` (0..N negara; kosong = semua) tersimpan di DB (sinkron lintas perangkat) dan **mengisi awal** filter Feed dan Discover. Dapat diubah per sesi tanpa menimpa default, atau diperbarui permanen dari Settings.

### API & kinerja
- Feed dan Discover menerima `countries[]`, `city?`, `include_unknown=false` (default); kueri memakai `country_code = any($1)`.
- **Facet:** RPC `country_facets(filters…)` → `[{iso2, count}]` mengikuti filter lain (role, keyword, Active 30d, …); cache 5 menit.
- **Privasi facet:** hitungan kecil dapat mengidentifikasi individu — tampilkan `<5` untuk hitungan di bawah 5 (ambang dapat dikonfigurasi).
- Indeks: `profiles (country_code)`; `projects (country_code, published, is_hidden, score desc)`; trigger menyinkronkan `projects.country_code` saat profil pemilik berubah.

### UI (menggantikan select lokasi v1)
| Elemen | Perilaku |
|---|---|
| **CountryPicker** (bottom sheet) | Pencarian, daftar bendera emoji + nama + jumlah (facet), multi-pilih, chip terpilih di atas, tombol **Apply** dan **Clear**, "All countries" |
| Quick filters (Feed) | Chip ringkas: `🌍 All countries` / `🇮🇩 Indonesia` / `🇮🇩 +2`; tap membuka CountryPicker |
| Kota | Drill-down opsional hanya bila **tepat satu** negara dipilih; daftar kota dari facet |
| Talent FilterPanel | Tag statis "Any location" diganti filter negara nyata + chip "Target: …" |
| ProjectCard / CandidateCard | Menampilkan `kota, negara` dan bendera; badge kecil bila negara `inferred` belum dikonfirmasi (hanya terlihat oleh pemilik) |
| Teks bantu | "Filter berdasarkan lokasi domisili yang dinyatakan developer." |

**Pemetaan dari v1:** `All locations` → `All countries`; `Indonesia` → `ID`; `Jakarta/Bandung/Surabaya` → kota di bawah `ID`.

### Kriteria penerimaan
- Memilih hanya `ID` menghasilkan **hanya** proyek/developer dengan `country_code = 'ID'`; `ID` + `SG` menghasilkan gabungan; **Clear** mengembalikan semua.
- Jumlah pada CountryPicker konsisten dengan hasil daftar setelah filter lain diterapkan.
- Developer tanpa negara tidak dapat `listed`/publish; negara inferensi berconfidence rendah tidak muncul di hasil filter sampai dikonfirmasi.
- `target_countries` tersimpan, terisi ulang setelah restart dan di perangkat lain, dan tidak mengubah hasil bila dikosongkan.
- Tidak ada UI/endpoint untuk memfilter atribut sensitif (POL-8, AIR-5).
- Facet menampilkan `<5` untuk hitungan kecil.

---

## 12. Inbox & Chat Nyata

- **Percakapan:** recruiter memulai dari Analysis / ProjectCard / Pipeline ("Message" / "Discuss"). Pesan pertama memuat konteks (perusahaan, posisi; kartu "DISCUSSING PROJECT" bila dari proyek).
- **Realtime:** langganan `postgres_changes` pada `messages` per `conversation_id`; daftar Inbox diurutkan `last_message_at`; badge unread dihitung dari pesan lawan dengan `read_at is null`.
- **Presence:** "● Online now" dari channel presence.
- **Centang:** satu = terkirim; dua = `delivered_at`; dua berwarna aksen = `read_at`.
- **Push:** `expo-notifications` + tabel `push_tokens`; DB webhook → Edge Function `notify-message` → Expo Push. **Butuh development build** (bukan Expo Go) — verifikasi dukungan push pada SDK yang dipilih.
- **Perlindungan:** batas pesan baru/hari per recruiter, panjang maks 4000, blokir/laporkan/tolak (POL-4), tidak ada lampiran di v2.
- **Kartu "YOUR STATUS":** developer → `availability`; recruiter → `hiring_status`. Tersimpan di DB.

---

## 13. Profile, Report, dan Akun

- **Profile tab** menampilkan akun yang login (bukan "developer terakhir dianalisis"): avatar, nama, `@login · GitHub connected`, badge peran.
- **Statistik** dari DB: **Reports** (`reports`), **Shortlisted** (pipeline `saved`), **Interviews** (`interviewing`).
- **Export report:** PDF dibuat dengan `expo-print` dari snapshot `analyses` (skor, rincian, bukti, heatmap), diberi watermark "Untuk penggunaan internal recruiter · data publik GitHub · tanggal"; simpan di Storage (opsional) dan catat di `reports`. **Exported reports** menampilkan daftar nyata.
- **Pengaturan:** visibilitas (`listed`), `open_to_messages`, availability, notifikasi, blokir, tema, **hapus akun** (Edge Function `delete-account`: hapus profil, proyek, pesan, token, pipeline, laporan; cabut sesi).
- Kartu "GitHub API connected / ACTIVE" menampilkan status sesi nyata.

---

## 14. Retensi Data
| Data | Retensi |
|---|---|
| `github_snapshots` untuk non-user | 24 jam lalu dihapus (cron) |
| `analyses` developer `listed` | Disimpan; versi lama dipangkas (simpan 5 terakhir) |
| `analyses` lookup non-user | 7 hari (hanya untuk report yang dirujuk) |
| Pesan | Selama akun aktif; dihapus saat akun dihapus atau percakapan dihapus kedua pihak |
| Akun dihapus | Penghapusan cascade ≤ 30 hari termasuk backup (definisikan di Privacy Policy) |

---

## 15. Perubahan UI/UX (perlu desain tambahan)

Layar dan state baru yang **belum ada di Figma/`design.md`** (buat dalam sistem desain yang sama, lalu tambahkan sebagai `design_v2.md`):
1. **Welcome / Login GitHub**, **Onboarding peran** (Developer/Recruiter), form profil recruiter.
2. **My Projects** + alur **Publish** (pilih repo, role, demo URL, status verifikasi).
3. **Settings:** visibilitas, `open_to_messages`, availability, notifikasi, blokir, hapus akun, legal.
4. **Composer pesan pertama** (konteks perusahaan/posisi) dan layar **permintaan percakapan** (terima/tolak/blokir/laporkan) untuk developer.
5. **State data nyata:** skeleton loading, empty state (belum ada percakapan/pipeline/hasil), **banner data stale** ("Diperbarui X jam lalu · Muat ulang"), **error `RATE_LIMITED` / `NOT_FOUND`** dengan retry dan "Buka di GitHub".
6. **Detail bukti skor** (rincian komponen + daftar evidence) di balik "View evidence".
7. Penafian skor dan tautan Privacy/Terms.
8. **CountryPicker** (bottom sheet multi-pilih + pencarian + facet), chip filter negara di Feed dan Discover, drill-down kota.
9. **Pemilihan negara** pada onboarding developer (dengan saran inferensi dan konfirmasi) dan **negara tujuan** pada profil/Settings recruiter.
10. Bendera + `kota, negara` pada kartu proyek/kandidat; state "negara belum dikonfirmasi".

---

## 16. Keamanan & Anti-Penyalahgunaan
- RLS semua tabel + uji otomatis; tanpa service key di client; secrets hanya di Edge Functions/EAS secrets.
- Validasi input di Edge Functions (skema, panjang, rate limit per user/IP); proteksi SSRF untuk cek demo (§8).
- Anti-spam: batas pesan baru, deteksi duplikasi isi, blokir/laporkan, penangguhan akun; verifikasi recruiter bertahap (domain email perusahaan → lencana "verified").
- Log audit untuk aksi sensitif (publish, hapus akun, moderasi). Sanitasi teks pesan saat dirender (tanpa HTML).
- Lindungi dari scraping aplikasi sendiri: paginasi terbatas, batas kueri, tanpa endpoint ekspor massal (POL-3).

---

## 17. Non-Fungsional & Pengujian

| Area | Target |
|---|---|
| Latensi | Feed < 500 ms p95 (cache); Analyze segar < 6 dtk p95 (tampilkan skeleton + progres) |
| Ketersediaan | Degradasi anggun: tampilkan data stale bila GitHub down |
| Observabilitas | Log Edge Function terstruktur, metrik rate-limit GitHub, error tracking (mis. Sentry), dashboard biaya |
| Biaya | Mulai free tier; naik ke paket berbayar di produksi — **verifikasi harga/limit terkini** dan pantau pemakaian GitHub API |
| Pengujian | **pgTAP** untuk RLS; **Deno test** untuk Edge Function dengan fixture respons GitHub terekam; unit test scoring v2 (golden files); e2e (mis. Maestro) untuk login → analyze → pesan |
| Aksesibilitas, tema, font | Mengikuti v1 (`design.md`) |

---

## 18. Fase Pengerjaan V2

> Asumsi: UI v1 (M0–M6) menjadi basis. Fase **R2** dapat mulai paralel dengan M3; **R3–R5** menggantikan data layer layar yang sudah ada tanpa mengubah tampilan.

| Fase | Isi | Hasil | Estimasi* |
|---|---|---|---|
| **R0 Fondasi** | Proyek Supabase (dev/prod), migrasi skema + RLS dasar, CI migrasi, GitHub OAuth App, GitHub App/token layanan, secrets, `gen types`, pgTAP awal, kerangka `src/api` + TanStack Query, seed `countries` + dataset kota untuk normalisasi lokasi | Skema berjalan; test RLS hijau | 1 mgg |
| **R1 Auth & Profil** | Welcome, OAuth, sesi, onboarding peran, `profiles`/`developer_settings`/`recruiter_profiles`, Settings dasar, **pemilihan negara (wajib untuk listing) & negara tujuan recruiter**, **hapus akun** | Login nyata; Profile tab asli | 1 mgg |
| **R2 Ingestion & Analysis v2** | Edge Function `analyze-developer`, cache + ETag, GraphQL kontribusi, scoring v2 + golden test, state stale/error (**hapus fallback palsu**), layar Analysis memakai data nyata + heatmap/framework/evidence asli | Analysis 100% data nyata | 2 mgg |
| **R3 Publikasi & Feed** | `publish-project`, verifikasi kepemilikan & demo (SSRF-safe), FTS + alias + paginasi, **filter negara/kota + facet count (§11A)**, ranking, "featured", badge VERIFIED/ACTIVE, moderasi dasar | Feed nyata | 2,5 mgg |
| **R4 Talent** | Discover (opt-in) **+ filter negara**, Pipeline persisten, Compare dari metrik nyata | Talent nyata | 1,5 mgg |
| **R5 Chat** | Percakapan + RLS, realtime, presence, read receipt, push, batas laju, blokir/laporkan | Inbox & Chat nyata | 2 mgg |
| **R6 Report & Akun** | PDF `expo-print`, daftar report, statistik Profile nyata, notifikasi, pengaturan lengkap | Profile/Report nyata | 1 mgg |
| **R7 Hardening & Rilis** | Tinjauan keamanan, uji beban, tinjauan hukum multi-yurisdiksi (ToS/Privacy/GDPR/UU PDP/CCPA/AUP GitHub/trade controls/regulasi AI perekrutan), audit bias awal (AIR-4), kebijakan toko (hapus akun, data safety), observabilitas, beta tertutup, EAS submit | Siap rilis beta | 3 mgg |

\*Indikatif, 1–2 developer. Total ± **14 minggu** di atas M0–M6.

**Gate rilis beta:** semua POL-1…9 dan AIR-1…5 terpenuhi; seluruh RLS lolos pgTAP; tidak ada data mock di jalur runtime; hapus akun berfungsi; tinjauan hukum selesai.

---

## 19. Keputusan yang Perlu Dikonfirmasi

| # | Pertanyaan | Default di dokumen ini |
|---|---|---|
| Q1 | Backend: Supabase atau alternatif (Firebase / backend sendiri)? | Supabase (K1) |
| Q2 | Siapa pengguna utama v2: recruiter saja, atau marketplace dua sisi (developer ikut mendaftar)? | Dua sisi, developer opt-in (K3) |
| Q3 | Perlu verifikasi recruiter (domain email perusahaan) sebelum boleh mengirim pesan? | Bertahap: self-declared dulu, lencana verified kemudian |
| Q4 | Copy heatmap: "12 week momentum" atau tampilkan 52 minggu? | 12 minggu + total 12 bulan terpisah |
| Q5 | Apakah lookup username developer **di luar** platform diizinkan? | Ya, hanya cache sementara (POL-5) |
| Q6 | ~~Wilayah target~~ **(Diputuskan: GLOBAL)** — dengan filter negara untuk menargetkan developer per negara tujuan | Global + CountryPicker (§11A) |
| Q8 | Perlu atribut `remote_ok` (developer bersedia bekerja remote untuk perusahaan di negara lain) sebagai filter tambahan? | Belum (opsional pasca-v2) |
| Q9 | Apakah negara hasil inferensi boleh dipakai filter sebelum dikonfirmasi? | Tidak (POL-9) |
| Q10 | Ambang facet privasi (`<5`)? Strategi region data (satu region di awal)? | Ambang 5; satu region awal |
| Q7 | Monetisasi ("PRO WORKSPACE")? | Di luar scope v2 |

---

## 20. Dampak ke PRD v1
- **Dicabut/diganti:** §5.2 langkah 5 (fallback palsu), §5.3 (rumus skor), nilai statis di §5.4 dan semua angka dekoratif, seed sebagai sumber data runtime.
- **Tetap:** seluruh UI/UX, token, komponen (`design.md`), struktur layar, D2/D3/D5/D6/D8.
- **Terselesaikan:** O1 (badge), O4 (alias keyword), R1 (rate limit via server-side cache), R2 (seed username tak relevan lagi).
- **Baru:** POL-1…9, AIR-1…5, §11A (Filter Negara), §3.2–3.3 (kepatuhan global), §15 (desain tambahan), fase R0–R7.
- **Diubah di v1:** select lokasi 5 opsi (FR-E4) dan tag statis "Any location" (FR-T3) digantikan CountryPicker; semantik lokasi "Indonesia" (§5.1) digantikan filter `country_code`.
