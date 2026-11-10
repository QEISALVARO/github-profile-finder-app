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

**Status verifikasi 5 Nov 2026 — HIJAU (lokal, Docker):**
27 berkas migrasi (001–028; nomor 0016 dilewati sesuai ADR-016) + 3 seed berhasil pada database baru (`migtest`) dengan `ON_ERROR_STOP=1`, 0 gagal. Rangkaian pgTAP: **14 berkas, 190 asersi, `Result: PASS`** lewat `npx supabase@2.122.0 test db` (rincian di `evidence/pgtap-local-2026-11-05.txt`). Commit ini **belum dijalankan di CI**; tidak ada URL run untuk klaim ini.

**Pembaruan 10 Nov 2026:** migrasi 0029 (`bias_report_v1`) + `14_be4_bias_v1.sql` (13 asersi) → **15 berkas, 203 asersi, `Result: PASS`** pada DB bersih (`npx supabase@2.122.0 db reset` + `test db`, exit 0). Transkrip: `evidence/pgtap-local-2026-11-10.txt` (15 berkas, 203 asersi, `Result: PASS`).

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
- [x] Rangkaian pgTAP 01–13 tersedia; 190 asersi (2+4+7+4+10+6+8+30+18+11+19+27+29+15) hijau lokal 5 Nov 2026 — `evidence/pgtap-local-2026-11-05.txt`.
- [x] RLS default-deny + kebijakan per tabel — **terbukti pgTAP lokal 5 Nov 2026** (01–03 hijau).
- [x] Kontrak SP-0 + Deno test 9/9 hijau 29 Okt 2026 — `deno-contracts-2026-10-29.txt`.
- [x] `database.types.ts` selaras statis dengan migrasi (drift penuh via `make types` + CI).
- [x] CI Workflow `backend.yml` terkonfigurasi (diperketat: deno check, izin minimal, drift gagal-bila-beda, secret+encoding scan).
- [x] Dokumentasi `README.md`, `policies.md`, `decisions.md` lengkap dan dicakup per fase.

### Gate BE-1 (= SP-1) — status verifikasi 29 Okt 2026
- [x] Konfigurasi GitHub OAuth lokal siap (scope `read:user` tanpa email; `config.toml`).
- [x] Trigger `auth.users → profiles` — migrasi 009 jalan di CI reset (guard metadata kosong ditambahkan 29 Okt).
- [x] `normalize_location` 10 kasus — **TERBUKTI via pgTAP CI** (05 hijau, termasuk cabang ambigu Paris).
- [x] POL-9 (tolak `listed=true`, auto-unlist) — **TERBUKTI via pgTAP CI** (04 hijau).
- [x] RPC onboarding (4 fungsi) — **TERBUKTI via pgTAP CI** (06 hijau).
- [x] `delete-account` — unit test Deno 3/3 hijau; migrasi reset CI hijau; cascade penuh menunggu smoke S1 (butuh JWT).
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

> Status 29 Okt 2026 pkl 07:00 UTC: **CI hijau penuh** — Backend CI
> (Static Checks + Database incl. pgTAP 41/41, drift, lint) dan Frontend CI
> (typecheck, lint, 88/88 jest) sukses di main. Rincian run:
> Backend `6545b2f` success, Frontend `6c6628b` success.
> Verifikasi lokal tambahan: Postgres 17 portable (tanpa Docker) —
> 16/16 migrasi + seed referensi OK (`evidence/pg17-portable-2026-10-29.txt`).
>
> **Koreksi 5 Nov 2026:** klaim pgTAP 41/41 pada kutipan 29 Okt di atas berasal
> dari langkah CI `tee | tail` tanpa `pipefail`, sehingga kegagalan pgTAP tidak
> menggagalkan job. Hasil sebenarnya yang terverifikasi ada di §D
> (`evidence/pgtap-local-2026-11-05.txt`).

- [x] Golden test scoring hijau (**G1 = 77**; 29 Okt 2026: 27/27 Deno fungsi offline OK — `deno-functions-2026-10-29.txt`); seluruh keluaran lolos validasi `AnalysisVM` (9/9 kontrak — `deno-contracts-2026-10-29.txt`).
- [x] Kegagalan hulu (403, 429, 404, 5xx, timeout) menghasilkan `stale`/error terstruktur — **terbukti di unit test offline** (`analyze-developer/index_test.ts`, tanpa data palsu).
- [x] Mitigasi **SSRF** 9/9 offline tanpa jaringan/DNS asli (privat/loopback/link-local/ULA/IPv4-mapped, A+AAAA campuran, tanpa alamat, redirect privat, >3 redirect, timeout) — `deno-functions-2026-10-29.txt`.
- [x] **Tidak ada email** / retensi `purge_expired_lookups` — **terbukti pgTAP lokal 5 Nov 2026** (02/07/13 hijau).
- [x] RLS default-deny (`analyses`, `github_snapshots`, `rate_limits`) — **terbukti pgTAP lokal 5 Nov 2026** (01–03/07 hijau).
- [x] Rate limit + ambang `force` — logika **terbukti pgTAP lokal 5 Nov 2026** (07 hijau); smoke S5-S7 tetap menunggu token.
- [ ] **p95 analisis segar < 6 dtk** BELUM DIUKUR (butuh token + Supabase lokal; jalankan `live-bench`).
- [x] Typecheck, pengujian frontend, dan lint tetap hijau bersih (PR #5: 88/88 jest).
- [x] Pemindai rahasia bersih 29 Okt 2026 (`sql-drift-secret-2026-10-29.txt`; `src/` + evidence tanpa token).
- [x] pgTAP `make test-db` — **HIJAU lokal 5 Nov 2026**: 190/190 asersi, `supabase test db` `Result: PASS`. Backend CI untuk commit ini BELUM DIJALANKAN (tanpa URL run).
- [x] Uji mutasi M1-M5 (BE-3: RLS, POL-9, grant liar, Paris ambigu, policy permisif) — **TERBUKTI di Postgres 17 portable** 30 Okt 2026; tiap mutasi efektif mengubah perilaku dan dikembalikan bersih. Bukti: `evidence/mutasi-be3-2026-10-30.txt`. Skrip CI: `scripts/backend/mutation-check.sh`.
- [ ] Smoke test S1-S9 — **TIDAK DIUJI** (tanpa Docker). Panduan: `docs/backend/evidence/SMOKE-TEST.md`).

---

## 5. Rencana Lanjutan (Menunggu Instruksi Fase BE-3)

Pekerjaan Fase BE-2 selesai penuh. Berhenti sesuai aturan kualitas (§6/§10) hingga terdapat instruksi resmi untuk melanjutkan ke **Fase BE-3 (Feed, Discover & Pipeline Engine)**.



---

# LAPORAN FASE BE-3: Proyek, Pencarian Feed & Filter Negara (status implementasi 29 Okt 2026)

**Branch PR:** `chore/contracts-projects` (merge dulu) -> `feat/be-3-projects-feed`.
**Status:** implementasi selesai. **CI hijau pada kode BE-3** (`dcf8049`): Backend CI https://github.com/QEISALVARO/github-profile-finder-app/actions/runs/40845759710 (static check, pgTAP 01–09, drift tipe, lint) dan Frontend CI https://github.com/QEISALVARO/github-profile-finder-app/actions/runs/40845759748. Verifikasi portable (non-CI): Postgres 17 + FUNCT 9/9. Commit dokumentasi sesudahnya (`84d13c4`, `387438a`) tidak memicu CI (0 run). Gate performa & smoke tetap belum terpenuhi.

## Berkas
- Kontrak (PR1): `contracts/src/projects.ts`, `types.ts`, fixtures city/my_repos/publish_result, schema_test +7, CHANGELOG v0.2.0.
- Migrasi 018 (skema: city, owner_listed, visible, rank_score, search berbobot, trigger, rank, featured, audit, indeks), 019 (hardening RLS + app_rate_limits), 020 (build_tsquery + search_projects), 021 (facets + featured + moderasi).
- Edge Functions: `list-my-repos`, `publish-project` (+test 11/11 offline).
- pgTAP: `08_be3_projects.sql` (30 asersi), `09_be3_facets_moderation.sql` (18 asersi).
- Bench: `seed/bench.sql` + `bench-feed.ts` + `make bench-seed`.
- Docs: `feed.md`, `publishing.md`, policies, decisions (ADR-009/014), bagian ini.

## Verifikasi lokal (Postgres 17 portable, tanpa Docker)
- 21/21 migrasi + seed referensi OK (`evidence/pg17-portable-2026-10-29.txt` diperbarui di PR ini).
- FUNCT 9/9: tokenisasi golang/ml/e-commerce, search keyword/filter/negara/active, kursor roundtrip tanpa duplikat, facet mask, rank bounds.
- Deno: kontrak 15/15 (PR1), fungsi 11/11 (BE-3), scoring/SSRF/analyze tetap hijau.
- FE: tsc + jest tidak tersentuh BE-3 (FE dikerjakan terpisah).

## Gate BE-3 (= SP-3) — status
- [x] Filter negara benar (ID / ID+SG / kosong / kota) — terbukti FUNCT + pgTAP 08 ditulis.
- [x] Facet konsisten + mask <5 — terbukti FUNCT + pgTAP 09 ditulis; fixture city ter-mask.
- [x] Hanya pemilik dapat publish; fork/privat/kosong ditolak; upsert idempoten; konflik pemilik ditolak — logika + Deno test; pgTAP via RLS.
- [x] Unlisted/is_hidden/unpublished tidak muncul (termasuk setelah perubahan status) — trigger + pgTAP 08.
- [x] golang dan ml mengembalikan hasil; e-commerce == e commerce; kursor stabil — terbukti FUNCT 9/9.
- [x] Klien tak dapat tulis kolom hitungan; RPC tolak anon; tanpa email — pgTAP 08/09 ditulis; RLS 019.
- [x] Demo SSRF-safe; hulu gagal tanpa karangan — reuse BE-2 (9/9 SSRF) + Deno 11/11.
- [ ] Feed p95 < 500 ms pada >= 10 rb proyek — **BELUM DIUKUR** (batuh runner + JWT; jalankan make bench-seed + bench-feed.ts). Tidak ada angka sampai `evidence/` berisi data mentah.
- [x] make reset && make test hijau + **CI hijau** — TERBUKTI CI pada `dcf8049`: https://github.com/QEISALVARO/github-profile-finder-app/actions/runs/40845759710 (pgTAP 01–09, drift, lint).
- [x] Pemindai rahasia bersih (tanpa token di repo).

## Paket A — Hardening & utang bukti (5 Nov 2026)

- **A1.** Bagian BE-3 di atas diselaraskan: klaim "menunggu CI" diganti tautan run nyata `dcf8049` (Backend run 40845759710). Bukti dipisah: **terbukti CI** vs **portable (non-CI)** vs **belum ada** (lihat `evidence/README.md`). Centang yang hanya berdasar "pgTAP ditulis" dihapus/dinilai ulang.
- **A2.** `publish-project` dan `list-my-repos` dipecah menjadi `handler.ts` (strict, dependensi disuntik) + `index.ts` (wiring). 26 test offline baru (13 + 10 test, termasuk sukses, 403 bukan pemilik, fork 400, privat/absen 404, kosong 400, demo terverifikasi, demo SSRF tidak disimpan, upsert idempoten, konflik 403, rate limit 429, input 400, hulu 502/429 tanpa data karangan, tanpa email, kontrak `PublishProjectResult`/`MyReposPage`, paginasi, login hanya dari profil).
- **A3.** Migrasi 022: `projects` **RPC-only**; kebijakan baca inert dihapus; pgTAP `10_be3_projects_rpc_only.sql` (11 asersi: grant, 0 kebijakan, RLS aktif, `service_role` tetap, error 42501, RPC tetap jalan). ADR-015.
- **A4.** Nomor migrasi 0016 dicatat sengaja dilewati (ADR-016).
- **A5.** `evidence/README.md` kini menyatakan eksplisit mana bukti CI, portable, dan belum ada.
- **A6.** Audit `main`: tidak ada `_shared/normalize-login.ts` maupun `_shared/scoring/role-map.ts`; tidak ada impor `contracts/` → `supabase/functions/`. Utilitas baru yang dipakai: `_shared/scoring/publish.ts` (murni, strict, diuji) dan `_shared/github/upstream.ts` (error hulu, strict).

## Paket B — BE-3b: `my_projects()` (5 Nov 2026)

- **Masalah:** layar "My Projects" butuh proyek milik sendiri (termasuk yang belum visible/unpublish) + `projectId`; klien tidak dapat membaca `projects` langsung (ADR-015).
- **Solusi:** migrasi 023 `public.my_projects(p_cursor, p_lim)` → `MyProjectsPage`. Hanya `owner_id = auth.uid()`, peran developer wajib, keyset `(created_at, id)`, maks 100 baris, rate limit `my_projects` 120/jam, tanpa email.
- **Kontrak:** `MyProject` + `MyProjectsPage` di contracts v0.3.0; fixture `my_projects.json`.
- **Test:** pgTAP `10_be3b_my_projects.sql` (15 asersi: kepemilikan, flag unpublished/hidden, orang lain, FORBIDDEN/UNAUTHORIZED, tanpa email, RPC-only, kursor, clamp, republish tidak mengubah kolom hitungan, rate limit).
- **Status verifikasi:** `deno check` + kontrak hijau lokal. pgTAP **BELUM DIJALANKAN di sini** (Docker tidak tersedia); wajib hijau di CI PR sebelum merge.
- `unpublish_project`/`republish_project` tetap `void`; FE me-refetch `my_projects()` (didokumentasikan di `publishing.md`).

## Paket C — BE-4: Discover, Pipeline, Compare, audit bias v0 (5 Nov 2026)

### Berkas
- Migrasi: `0024_be4_retention.sql` (retensi listed + purge aman + indeks + view internal + pembersihan pipeline saat akun dihapus), `0025_be4_discover.sql` (`feed_role`, `discover_developers`, `discover_country_facets`, rate limit), `0026_be4_pipeline_compare.sql` (hardening pipeline_entries + `pipeline_list/upsert/remove` + `compare_developers`), `0027_be4_bias.sql` (`bias_stats`, `bias_report_v0`).
- pgTAP: `11_be4_discover.sql` (27 asersi), `12_be4_pipeline_compare.sql` (29), `13_be4_retention_bias.sql` (15), `14_be4_bias_v1.sql` (13).
- Dokumen: `talent.md` (signature, D1–D6, kursor, masking, contoh, error), `bias-audit.md`, pembaruan `policies.md` (AIR-1/3/4/5, POL-3/5/8) dan `decisions.md` (ADR-017).
- Skrip: `scripts/backend/bias-format.ts` (+test), `bias-report.ts`, `bias-report-v1.ts` + `bias-v1.ts` (+test), `bench-discover.ts`.
- Migrasi v1: `0029_be4_bias_v1.sql` (`bias_group_stats`, `bias_report_v1`).
- Kontrak: v0.3.0 (`PipelineItem`, `PipelineList`, `CompareResult`, fixture).
- Perbaikan bug: `analyze-developer` kini menulis ke kolom `analyses` yang benar (`breakdown`, `metrics`, `heatmap`, …). Sebelumnya insert memakai kolom tidak ada dan gagal senyap sehingga Discover/Compare tidak akan punya data.

### Keputusan
D1–D6 dan riset Postgres dicatat di `decisions.md` (ADR-017). Ringkas: Discover = listed ∧ negara ∧ analisis terbaru v2; role via `feed_role`; recruiter-only + blokir + tanpa diri sendiri; akses login dibatasi D4; minimisasi data pipeline D5; RPC-only D6.

### Status verifikasi (jujur)
| Item | Status |
|---|---|
| `deno check` handler/modul strict + kontrak | **Lulus lokal** (5 Nov 2026) |
| Deno test kontrak (20), fungsi (64), formatter bias (5), statistik bias v1 (11) | **Lulus lokal** (10 Nov 2026): 20 + 64 + 5 + 11, 0 gagal |
| pgTAP 01–13 (190 asersi) | **HIJAU lokal + CI**: lokal 10 Nov 2026 pada DB bersih (`Result: PASS`, exit 0) — `evidence/pgtap-local-2026-11-10.txt`; Backend CI [#27](https://github.com/QEISALVARO/github-profile-finder-app/actions/runs/42754735980) sukses (commit `c1948cf`) |
| Migrasi 001–028 dijalankan | **Lulus lokal 10 Nov 2026** (27 migrasi + 3 seed, 0 gagal, DB baru) |
| p95 Discover < 500 ms | **LULUS 10 Nov 2026**: p50 34,2 ms / p95 66,8 ms / p99 84,3 ms / maks 99,3 ms pada 308 panggilan (DB bersih) — `evidence/discover-bench-2026-11-10.json` |
| Laporan bias v0 | **LULUS 10 Nov 2026** pada 5.200 skor sintetis — `evidence/bias-v0-2026-11-10.md` |
| Laporan bias v1 (impact ratio, CI, BH) | **LULUS 10 Nov 2026** pada 5.200 skor sintetis: 39 kelompok reportable, 1 adverse (`NG`, IR 0,42, q=2,5e-5) — `evidence/bias-v1-2026-11-10.md`; unit test 11 kasus |
| `make reset && make test` | `db reset` + pgTAP hijau 10 Nov (CLI 2.122.0; CLI 3.1.0 menolak `[inbucket]`), Deno test hijau 10 Nov. `make` tidak tersedia di mesin ini, perintah setara dijalankan langsung |

### Gate C
- [x] Discover listed/negara/v2 + filter + kursor — pgTAP 11 hijau pada DB bersih 10 Nov 2026; CI PR belum dijalankan.
- [x] Facet ter-mask, rate limit, tanpa email/breakdown — pgTAP 11 hijau pada DB bersih 10 Nov 2026; CI PR belum dijalankan.
- [x] Pipeline kepemilikan/batas/summary/tanpa grant tulis — pgTAP 12 hijau pada DB bersih 10 Nov 2026; CI PR belum dijalankan.
- [x] Compare memakai metrik nyata + D4 — pgTAP 12 hijau pada DB bersih 10 Nov 2026; CI PR belum dijalankan.
- [x] Retensi & purge aman — pgTAP 13 hijau pada DB bersih 10 Nov 2026; CI PR belum dijalankan.
- [x] Bias v0 tersedia (sintetis) — **teruji 10 Nov 2026**: 5.200 skor, kelompok n<10 dimasking, grup NG yang digeser -14 ter-flag `-12` (indikator tinjauan menyala).
- [x] p95 Discover < 500 ms — **terukur 10 Nov 2026**: p95 66,8 ms (308 panggilan, 4.889 developer listed).
- [x] `make reset && make test` hijau + drift nol + secret scan + CI hijau — Backend CI [#27](https://github.com/QEISALVARO/github-profile-finder-app/actions/runs/42754735980) sukses untuk commit `c1948cf`: pgTAP, drift types, db lint, secret scan, dan Deno check/test semua hijau.
- [x] L2 (regulasi AI rekrutmen & metodologi bias) — **tinjauan selesai 10 Nov 2026** di `l2-review.md`: klasifikasi AI Act, GDPR/UU PDP, LL 144/FEHA/Title VII, serta 7 temuan metodologi audit. Discover **tetap belum boleh** dibuka eksternal sampai aksi A1–A7 di dokumen itu selesai.

### Deviasi
- `DiscoverItem.role` di kontrak tetap `string` (Lampiran A); backend hanya mengeluarkan 4 nilai FeedRole.
- Retensi memakai trigger DB (bukan perubahan Edge `delete-account`) agar berlaku untuk semua jalur penghapusan; `delete-account` tetap memanggil delete profil sehingga trigger berjalan.
- `unpublish_project`/`republish_project` tetap `void`; FE me-refetch `my_projects`.
- Benchmark Discover memakai REST (bukan `EXPLAIN ANALYZE` otomatis); perintah EXPLAIN didokumentasikan di `bench-discover.ts`.

### Bukti pengukuran 10 Nov 2026
- Seed: `supabase/seed/bench-talent.sql` (5.200 developer `listed` + analisis v2; 5% tidak listed, ~1% tanpa negara, 104 analisis v1 lama berskor 99 untuk membuktikan aturan "analisis terbaru"). Dimuat manual, tidak ikut `db reset`.
- Bench (DB bersih: `db reset` → 3 seed referensi → `bench-talent.sql` → `dev.sql` untuk akun recruiter `sari_rec`): `deno run … scripts/backend/bench-discover.ts` → 308 panggilan (termasuk halaman dalam 2–5), p50 34,2 ms, p95 66,8 ms, p99 84,3 ms, maks 99,3 ms, `targetMet: true`. Batas laju dinaikkan khusus run ini agar 308 panggilan tidak kena `RATE_LIMITED`; pemeriksaan rate limit tetap dieksekusi tiap panggilan (dicatat di field `notes` evidence).
- Rencana kueri: `evidence/discover-explain-2026-11-10.txt` — `Execution Time: 52,6 ms`, 69.305 buffer hit untuk satu panggilan penuh 4.889 baris.
- Bias: `deno run … scripts/backend/bias-report.ts` → n=5200, median keseluruhan 74; tidak ada kelompok yang berbeda > 10 poin kecuali `NG` (median 62, selisih -12) yang **sengaja** digeser -14 di seed untuk menguji indikator tinjauan. Tidak ada login/nama pada keluaran.
- Batasan: angka hanya berlaku untuk data sintetis di mesin lokal (satu kontainer Postgres); bukan klaim produksi maupun klaim bias populasi nyata.
- pgTAP diulang pada DB bersih hasil `db reset` (27 migrasi + seed `countries`/`cities`/`keyword_aliases` yang kini terdaftar di `[db.seed]`): **14 berkas, 190 asersi, `Result: PASS`** — `evidence/pgtap-local-2026-11-10.txt`. Sebelum `[db.seed]` didaftarkan, reset tidak memuat seed dan suite gagal karena FK `profiles_country_code_fkey` (ini juga yang menggagalkan Backend CI #26). Seed `dev.sql` tetap tidak dimuat karena fixture-nya menggeser hitungan yang diharapkan tes.
- CI resmi: Backend CI run #27 (commit `c1948cf`) **success** — job *Database & Contracts Verification* hijau di langkah migrasi+seed, pgTAP, drift types, dan db lint; job *Static Checks* hijau (secret scan, encoding, Deno check/test). URL: https://github.com/QEISALVARO/github-profile-finder-app/actions/runs/42754735980

### Masalah terbuka / TODO
- Jalankan suite yang sama di CI PR agar ada URL run (bukti lokal 10 Nov sudah ada).
- Jalankan aksi A1–A7 dari `l2-review.md` (pendapat hukum AI Act, DPIA/LIA, ToS/privacy, audit bias v1, pembatasan pasar NYC/California, template notifikasi + retensi 4 tahun, system card) sebelum Discover dibuka eksternal.

## Deviasi
- Fallback fuzzy trigram DITUNDA (opsional setelah gate hijau) sesuai prompt.
- refresh-projects (cron) DITUNDA (opsional setelah gate hijau) — refresh_rank_scores/refresh_featured tersedia.
- Test 08 memakai role authenticated + data siapan sendiri (mandiri, rollback); test 02/03/04/06 diperbaiki mengikuti skema nyata (kolom fiktif -> nyata).
- Normalisasi: kontraksi kutip ganda-dua di 9 migrasi + 5 test (invalid di Postgres); generated active -> trigger; seed keyword_aliases + dev disesuaikan skema.
