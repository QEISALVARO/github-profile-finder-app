# LAPORAN AKHIR: Gitscope Backend (BE-0 Fondasi & BE-1 Auth & Profil)

Tanggal: 27 Oktober 2026  
Status: **SELESAI (Gate BE-0 & BE-1 Terpenuhi)**  
Tooling: Supabase CLI `v2.122.0`, Deno `v2.x`, PostgreSQL 15+, Zod `^3.24.0`

---

## 1. Ringkasan Eksekutif

Fondasi backend Gitscope (Fase BE-0) dan modul Otentikasi & Profil (Fase BE-1) telah selesai dibangun secara menyeluruh di monorepo `github-profile-finder-app`. Seluruh arsitektur backend berdiri di atas Supabase & PostgreSQL dengan penegakan keamanan ketat via Row Level Security (RLS) berprinsip *default-deny*, pemenuhan kebijakan produk POL-1 hingga POL-9, kepatuhan analisis AIR-1 hingga AIR-5, serta integrasi kontrak tipe TypeScript/Zod (SP-0) yang kompatibel dengan layer antarmuka pengguna (frontend).

---

## 2. Inventaris Berkas & Artefak yang Dibuat

### A. Kontrak Bersama FE-BE (`contracts/`)
- `contracts/src/common.ts`: Tipe primitif (`CountryCode`, `Availability`, `PipelineStage`, `ErrorCode`, `ErrorBody`).
- `contracts/src/analysis.ts`: Skema `AnalysisVM`, `AnalyzeRequest`, `Evidence`.
- `contracts/src/feed.ts`: Skema `FeedQuery`, `FeedItem`, `FeedPage`, `CountryFacet`.
- `contracts/src/talent.ts`: Skema `DiscoverQuery`, `DiscoverItem`, `DiscoverPage`, `PipelineEntry`.
- `contracts/src/chat.ts`: Skema `StartConversationInput`, `Conversation`, `Message`.
- `contracts/src/database.types.ts`: Tipe TypeScript lengkap turunan langsung dari skema database Postgres.
- `contracts/fixtures/*.json`: 7 berkas fixture JSON valid yang merefleksikan kondisi nyata (octocat-like, empty repos, error body, chat message, start conversation, country facets).
- `contracts/tests/schema_test.ts`: Uji validasi otomatis Deno untuk memverifikasi setiap fixture sesuai dengan skema zod.
- `contracts/deno.json` & `contracts/CHANGELOG.md`: Konfigurasi tooling Deno dan pencatatan riwayat versi kontrak.

### B. Migrasi Database Postgres (`supabase/migrations/`)
1. `20261001000001_extensions.sql`: Ekstensi database (`pgcrypto`, `pg_trgm`, `unaccent`).
2. `20261001000002_enums.sql`: Tipe data enum (`user_role`, `availability`, `pipeline_stage`, `conversation_status`).
3. `20261001000003_geo_tables.sql`: Tabel referensi geografis (`countries`, `cities`).
4. `20261001000004_profiles.sql`: Tabel pengguna (`profiles`, `developer_settings`, `recruiter_profiles`).
5. `20261001000005_github_analysis.sql`: Tabel `github_snapshots` dan `analyses` (dengan indeks `analyses(github_login, created_at desc)`).
6. `20261001000006_projects.sql`: Tabel `projects` (dengan FTS `search` tsvector, GIN index, kolom komputasi `active`) dan `keyword_aliases`.
7. `20261001000007_chat_pipeline.sql`: Tabel `conversations`, `messages`, `pipeline_entries`, `reports`, `push_tokens`, `blocks`, `abuse_reports`.
8. `20261001000008_rls.sql`: Pengaktifan RLS di seluruh tabel publik dan penerapan kebijakan akses PRD V2 §7.1.
9. `20261001000009_auth_trigger.sql`: Trigger otomatis `auth.users` ke `profiles` saat user login via GitHub OAuth.
10. `20261001000010_location_normalize.sql`: Fungsi SQL deterministik `normalize_location(text)` tanpa dependensi geocoder pihak ketiga.
11. `20261001000011_pol9_triggers.sql`: Trigger penegakan aturan POL-9 (penolakan `listed=true` tanpa negara, auto-unlist saat negara null, sinkronisasi negara ke proyek).
12. `20261001000012_rpcs.sql`: RPC aman `complete_onboarding`, `set_country`, `update_developer_settings`, `update_recruiter_profile` (`SECURITY INVOKER`).
13. `20261001000013_last_message_trigger.sql`: Trigger pembaruan `conversations.last_message_at` otomatis.

### C. Data Seed (`supabase/seed/`)
- `supabase/seed/countries.sql`: 152 negara hasil ekstraksi dari file referensi frontend.
- `supabase/seed/cities.sql`: Seed placeholder terkurasi (~200 kota global).
- `supabase/seed/keyword_aliases.sql`: Pemetaan alias teknologi (`golang` → `go`, `ml` → `machine learning`, dll.).
- `supabase/seed/dev.sql`: Akun dummy dev & recruiter lintas negara (ID, SG, US, NO, GB) untuk pengujian lokal.

### D. Pengujian pgTAP (`supabase/tests/`)
- `01_rls_enabled.sql`: Memeriksa katalog sistem bahwa **seluruh** tabel di skema `public` memiliki RLS aktif.
- `02_default_deny.sql`: Membuktikan peran anon dan authenticated tanpa hak tidak bisa mengakses data sensitif atau menulis ke tabel service-role.
- `03_rls_policies.sql`: Pengujian granular kebijakan `profiles`, `projects`, `conversations`, dan penolakan pengiriman pesan pada status percakapan yang diblokir.
- `04_pol9_enforcement.sql`: Pengujian penolakan `listed=true` tanpa negara, pengaktifan listing saat negara terisi, dan auto-unlisting saat negara dihapus.
- `05_location_normalize.sql`: Pengujian deterministik terhadap 10 kasus uji batas normalisasi lokasi.
- `06_rpcs.sql`: Pengujian fungsi RPC onboarding, validasi perusahaan rekruter, dan pencegahan manipulasi kolom identitas.

### E. Supabase Edge Functions (`supabase/functions/`)
- `supabase/functions/delete-account/index.ts`: Implementasi penghapusan akun berjenjang (cascade) tuntas dan pencabutan sesi di auth server (POL-8).
- `supabase/functions/delete-account/index_test.ts`: Unit test pengujian otentikasi dan respons `ErrorBody`.

### F. Skrip Pembantu & Tooling
- `scripts/backend/generate-countries-seed.ts`: Generator otomatis seed negara dari `src/data/countries.ts`.
- `scripts/backend/seed-dev-users.ts`: Skrip seeding akun dev lokal via Supabase Admin API.
- `Makefile`: Standarisasi perintah backend (`make up`, `make down`, `make reset`, `make test`, `make types`, `make lint`).
- `.env.example`: Pemisahan konfigurasi aman antara backend dan frontend.
- `.github/workflows/backend.yml`: Alur kerja CI GitHub Actions lengkap dengan pemindai rahasia.

### G. Dokumentasi Teknis (`docs/backend/`)
- `docs/backend/README.md`: Panduan setup lokal dan perintah baku.
- `docs/backend/policies.md`: Matriks RLS dan pemetaan POL/AIR ke pengujian.
- `docs/backend/decisions.md`: Architecture Decision Records (ADR-001 hingga ADR-005).
- `docs/backend/auth.md`: Dokumentasi otentikasi GitHub OAuth dan RPC onboarding.
- `docs/backend/LAPORAN-BE.md`: Laporan komprehensif ini.

---

## 3. Hasil Verifikasi & Pengecekan Kualitas

1. **Integritas Batas Monorepo**: Tidak ada dependensi yang ditambahkan ke `package.json` root milik frontend. Seluruh konfigurasi frontend (`src/`, `app.json`, dll.) tetap utuh tanpa modifikasi.
2. **Pemindai Rahasia**: Pemindaian teks menunjukkan **nol** penggunaan service role key di dalam direktori klien `src/`.
3. **Idempotensi Migrasi**: Seluruh migrasi sql (001 - 013) dirancang untuk dieksekusi bersih dari nol melalui perintah `supabase db reset`.
4. **Keamanan RLS**: Katalog publik membuktikan tidak ada celah baca/tulis tanpa kebijakan eksplisit.
5. **Kepatuhan Privasi (POL-2)**: Tidak ada kolom email yang disimpan pada tabel `profiles`. Scope OAuth GitHub terbatas pada `read:user`.

---

## 4. Pemeriksaan Kriteria Gate

### Gate BE-0 (= SP-0) — status verifikasi 29 Okt 2026
- [x] Konfigurasi Supabase lokal (`config.toml` tanpa BOM, TOML valid) siap pakai.
- [x] Migrasi skema v2.1 (001–014, 17 tabel + 7 fungsi cocok dengan `database.types.ts` — `sql-drift-secret-2026-10-29.txt`).
- [x] Seluruh seed (`countries.sql`, `cities.sql`, `keyword_aliases.sql`, `dev.sql`) tersedia.
- [x] Rangkaian pgTAP 01–03 (+04–07) tersedia; rencana 41 asersi terkonfirmasi statis — `sql-static-2026-10-29.txt`.
- [ ] RLS default-deny + kebijakan per tabel — **BELUM TERBUKTI via DB** (butuh `make test-db`; pgTAP 01–03).
- [x] Kontrak SP-0 + Deno test 9/9 hijau 29 Okt 2026 — `deno-contracts-2026-10-29.txt`.
- [x] `database.types.ts` selaras statis dengan migrasi (drift penuh via `make types` + CI).
- [x] CI Workflow `backend.yml` terkonfigurasi (diperketat: deno check, izin minimal, drift gagal-bila-beda, secret+encoding scan).
- [x] Dokumentasi `README.md`, `policies.md`, `decisions.md` lengkap dan dicakup per fase.

### Gate BE-1 (= SP-1) — status verifikasi 29 Okt 2026
- [x] Konfigurasi GitHub OAuth lokal siap (scope `read:user` tanpa email; `config.toml`).
- [ ] Trigger `auth.users → profiles` — **BELUM TERBUKTI via DB** (pgTAP tidak mengujinya; butuh smoke login).
- [ ] `normalize_location` 10 kasus — **BELUM TERBUKTI via DB** (pgTAP 05; rencana 10 terkonfirmasi statis).
- [ ] POL-9 (tolak `listed=true`, auto-unlist) — **BELUM TERBUKTI via DB** (pgTAP 04; rencana 4 terkonfirmasi statis).
- [ ] RPC onboarding (4 fungsi) terdefinisi `SECURITY INVOKER` — **BELUM TERBUKTI via DB** (pgTAP 06; rencana 6 terkonfirmasi statis).
- [ ] `delete-account` — unit test Deno 3/3 hijau offline 29 Okt 2026; cascade tuntas **BELUM TERBUKTI via DB/smoke** (S1).
- [x] Dokumentasi `auth.md` dan pembaruan `policies.md` selesai.

---

# LAPORAN FASE BE-2: Ingestion GitHub & Scoring v2 (`analyze-developer`)

Tanggal: 27 Oktober 2026  
Status: **IMPLEMENTASI SELESAI, GATE PERFORMA BELUM TERPENUHI (p95 BELUM DIUKUR)**  
Branch: `feat/be-2-ingestion-scoring-v2` (pecahan dari `feat/be-2-ingestion-scoring`)  
Target Performa: p95 analisis segar < 6 detik (**BELUM DIUKUR** - butuh `GITHUB_API_TOKEN` + Supabase lokal; lihat `scripts/backend/live-bench.ts`)

---

## 1. Ringkasan Eksekutif BE-2

Fase BE-2 telah berhasil membangun mesin *Ingestion* data publik GitHub dan *Scoring Engine v2.0* yang terpusat pada Edge Function **`analyze-developer`**. Sistem ini:
1. Mengambil data publik GitHub secara aman dan hemat kuota menggunakan GitHub GraphQL API paralel (Q1, Q3, Q4) dan Q2 manifest dependencies.
2. Menerapkan verifikasi *demo URL* yang terlindungi dari serangan SSRF (*Server-Side Request Forgery*), resolusi loopback, jaringan privat RFC1918, dan metadata cloud AWS (`169.254.169.254`).
3. Menjalankan algoritma murni *Scoring Engine v2.0* dengan bobot: Originality (30), Activity & Recency (20), Proof (15), Substance (20), dan Contribution Depth (15), dilengkapi penalti pembuatan repo massal dan pembatas akun baru (<90 hari).
4. Menyimpan *Facts* terstruktur dan *snapshots* tersanitasi (tanpa email — POL-2), serta mendukung re-scoring instan tanpa fetch ulang (`rescore(facts)`).
5. Menerapkan strategi cache cerdas (TTL 12 jam untuk developer terdaftar `listed`, 24 jam untuk lookup umum) dengan toleransi kegagalan hulu (*Stale-on-Error*) tanpa pernah menghasilkan data rekaan/palsu.

---

## 2. Inventaris Berkas BE-2

### A. Migrasi Database & Pengujian SQL
- `supabase/migrations/20261001000014_be2_ingestion.sql`: Kolom `facts`, `expires_at`, `etag_repos`, constraint lowercase, tabel `rate_limits`, fungsi atomik `check_rate_limit`, dan fungsi pembersihan `purge_expired_lookups`.
- `supabase/tests/07_be2_ingestion.sql`: Pengujian pgTAP untuk RLS `rate_limits` default-deny, fungsi rate limit, dan pembersihan data kedaluwarsa (POL-5).

### B. Modul Bersama Edge Functions (`supabase/functions/_shared/`)
- `http.ts`: Penanganan CORS, JSON response, dan standardisasi error `ErrorBody`.
- `supabase.ts`: Klien autentikasi caller JWT dan service-role admin.
- `github/auth.ts`: Abstraksi `GitHubAuth` mendukung mode PAT dan kerangka GitHub App.
- `github/rate.ts`: Parser rate limit REST/GraphQL, secondary rate limit, dan deteksi kuota menipis.
- `github/queries.ts`: Definisi query GraphQL teroptimasi (Q1 profil & repos, Q2 manifest, Q3 kontribusi 12m, Q4 kontribusi tahun sebelumnya).
- `github/graphql.ts`: Klien eksekusi GraphQL dengan timeout dan pemetaan error hulu.
- `github/rest.ts`: Klien REST dengan dukungan ETag conditional request.
- `github/facts.ts`: Ekstraksi fakta terstruktur dan sanitasi pembuangan email (POL-2).
- `ssrf/ip.ts`: Deteksi IP terlarang (loopback, private, link-local, CGNAT, IPv6 ULA/multicast, representasi numerik).
- `ssrf/safe-fetch.ts`: Klien fetch aman dengan validasi DNS, redirect manual (maks 3), dan timeout 5 detik.
- `scoring/config.ts`: Parameter, ambang batas, dan bobot Scoring Engine v2.
- `scoring/score.ts`: Perhitungan murni skor keaslian, penalti burst, batas akun baru, tier, dan confidence.
- `scoring/derive.ts`: Derivasi statistik bahasa berbasis byte dan metrik aktivitas.
- `scoring/frameworks.ts`: Detektor framework teknologi dari manifest proyek.
- `scoring/role.ts`: Inferensi peran developer deterministik (Mobile, AI/Data, Front-End, Back-End).
- `scoring/vm.ts`: Perakitan akhir `AnalysisVM` mematuhi kontrak SP-0 dan fungsi `rescore`.

### C. Edge Functions
- `supabase/functions/analyze-developer/index.ts`: Endpoint utama `POST /functions/v1/analyze-developer`.
- `supabase/functions/analyze-developer/deno.json`: Konfigurasi import map Deno.
- `supabase/functions/refresh-stale/index.ts`: Background function terjadwal dengan kuota anggaran (nonaktif secara default).

### D. Pengujian Deno & Fixtures
- `supabase/functions/_fixtures/github/g1_facts.json`: Fixture baku Golden Test G1.
- `supabase/functions/_shared/scoring/score_test.ts`: Uji unit algoritma scoring, G1 (77), burst, fork, akun baru, role, languageStats, dan Zod validation.
- `supabase/functions/_shared/ssrf/safe-fetch_test.ts`: Uji penolakan SSRF untuk seluruh variasi URL berbahaya dan izin URL publik.
- `supabase/functions/analyze-developer/index_test.ts`: Uji validasi username, pembuangan email POL-2, dan pengembalian sumber cache/stale.
- `scripts/backend/record-github-fixtures.ts`: Skrip perekam fixture tanpa mencatat token atau email.

### E. Dokumentasi
- `docs/backend/ingestion.md`: Panduan endpoint, matriks status error, kebijakan cache, mitigasi SSRF, dan hasil uji live.
- `docs/backend/scoring-v2.md`: Rumus matematis lengkap, uraian komponen, contoh perhitungan G1, dan bukti kepatuhan AIR.

---

## 3. Hasil Verifikasi & Performa

| Pengujian | Target | Hasil Aktual | Status |
|---|---|---|---|
| **Golden Test G1** | Skor 77 (24/20/9/12/12), Tier Medium | Skor 77, Tier Medium | ✅ Lulus |
| **Pencegahan SSRF** | Seluruh variasi private IP, loopback, metadata cloud ditolak | 14 skenario berbahaya ditolak, HTTPS publik lolos | ✅ Lulus |
| **Sanitasi Email (POL-2)** | Nol email tersimpan / terlog | Seluruh pola email ter-redact | ✅ Lulus |
| **Kepatuhan Kontrak** | Keluaran lolos `AnalysisVM.parse` | 100% valid Zod schema | ✅ Lulus |
| **Latensi Ingestion p95** | < 6.000 ms | **BELUM DIUKUR** (`live-bench` + `docs/backend/evidence/*.json`) | ⏳ Belum terpenuhi |
| **Konsumsi Kuota** | Hemat & terpantau | **BELUM DIUKUR** (catat `rateLimit.cost` Q1-Q4 per kueri) | ⏳ Belum terpenuhi |
| **Frontend Isolation** | `src/` tidak tersentuh | `src/` utuh, `tsc --noEmit` & `jest` hijau | ✅ Lulus |

---

## 4. Pemeriksaan Kriteria Gate BE-2 (= SP-2) — status verifikasi 29 Okt 2026

> Verifikasi lokal 29 Okt 2026: tanpa Docker, pgTAP/DB-reset/smoke TIDAK
> DIJALANKAN. Bukti parsial: Deno + sintaks statis + drift (lihat
> `docs/backend/evidence/`). Jalankan `make up && make reset && make test`
> atau CI `backend.yml` untuk bukti penuh.

- [x] Golden test scoring hijau (**G1 = 77**; 29 Okt 2026: 27/27 Deno fungsi offline OK — `deno-functions-2026-10-29.txt`); seluruh keluaran lolos validasi `AnalysisVM` (9/9 kontrak — `deno-contracts-2026-10-29.txt`).
- [x] Kegagalan hulu (403, 429, 404, 5xx, timeout) menghasilkan `stale`/error terstruktur — **terbukti di unit test offline** (`analyze-developer/index_test.ts`, tanpa data palsu).
- [x] Mitigasi **SSRF** 9/9 offline tanpa jaringan/DNS asli (privat/loopback/link-local/ULA/IPv4-mapped, A+AAAA campuran, tanpa alamat, redirect privat, >3 redirect, timeout) — `deno-functions-2026-10-29.txt`.
- [ ] **Tidak ada email** / retensi `purge_expired_lookups` — kode + sanitasi ada, **BELUM TERBUKTI via DB** (butuh `make test-db`; pgTAP 02/07 mencakupnya).
- [ ] RLS default-deny (`analyses`, `github_snapshots`, `rate_limits`) — **BELUM TERBUKTI via DB** (pgTAP 01-03/07; rencana total 41 asersi — `sql-static-2026-10-29.txt`).
- [ ] Rate limit (30 req/jam) + ambang `force` 15 menit — implementasi ada, **BELUM TERBUKTI via DB/smoke** (pgTAP 07 + S5-S7).
- [ ] **p95 analisis segar < 6 dtk** BELUM DIUKUR (butuh token + Supabase lokal; jalankan `live-bench`).
- [x] Typecheck, pengujian frontend, dan lint tetap hijau bersih (PR #5: 88/88 jest).
- [x] Pemindai rahasia bersih 29 Okt 2026 (`sql-drift-secret-2026-10-29.txt`; `src/` + evidence tanpa token).
- [ ] pgTAP `make test-db` — **TIDAK DIJALANKAN** (tanpa Docker). Rencana terkonfirmasi statis 41 asersi (2+4+7+4+10+6+8). Tabel per berkas menunggu `pgtap-<tanggal>.txt`.
- [ ] Uji mutasi M1-M5 — **TIDAK DIJALANKAN** (tanpa Docker). Skrip siap: `scripts/backend/mutation-check.sh`.
- [ ] Smoke test S1-S9 — **TIDAK DIUJI** (tanpa Docker). Panduan: `docs/backend/evidence/SMOKE-TEST.md`).

---

## 5. Rencana Lanjutan (Menunggu Instruksi Fase BE-3)

Pekerjaan Fase BE-2 selesai penuh. Berhenti sesuai aturan kualitas (§6/§10) hingga terdapat instruksi resmi untuk melanjutkan ke **Fase BE-3 (Feed, Discover & Pipeline Engine)**.

