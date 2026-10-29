# Catatan Keputusan Arsitektur (Architecture Decision Records)

Dokumen ini mencatat keputusan arsitektur dan teknis non-trivial yang diambil selama pengembangan Gitscope Backend.

---

## ADR-001: Supabase sebagai Fondasi Backend Monorepo

- **Konteks:** Aplikasi membutuhkan otentikasi OAuth GitHub, basis data relasional kuat dengan dukungan pencarian teks penuh (FTS) & Trigram, RLS multi-tenant, dan Edge Functions serverless.
- **Keputusan:** Mengadopsi Supabase (PostgreSQL 15+, Supabase Auth, Storage, Edge Functions Deno) dengan Docker lokal (`supabase start`) dan Supabase CLI `v2.122.0`.
- **Konsekuensi:** Pengembangan lokal sepenuhnya reproducible tanpa ketergantungan koneksi internet; migrasi skema terkelola dalam SQL idempoten; tipe TypeScript dapat diturunkan langsung ke kontrak bersama (`contracts/src/database.types.ts`).

---

## ADR-002: Pemisahan Folder & Kepemilikan Monorepo (FE vs BE)

- **Konteks:** Tim frontend dan backend bekerja pada repo yang sama namun harus terisolasi dari konflik dependensi package root.
- **Keputusan:**
  - Backend memiliki: `supabase/**`, `docs/backend/**`, `.github/workflows/backend.yml`, `.github/workflows/frontend.yml` (langkah encoding/secret bersama), `Makefile`, `scripts/backend/**`, `contracts/fixtures/**`, `contracts/src/database.types.ts`.
  - Frontend memiliki: `src/**`, `app.json`, `package.json` root.
  - Cakupan PR ini (BE-0): migrasi 001-008, seed, pgTAP 01-03, `database.types.ts`, workflow backend, `.env.example`, `Makefile`, skrip seed. Kontrak SP-0 dikunci di PR #1; BE-1/BE-2 menyusul di PR masing-masing.
  - Kontrak bersama (`contracts/src/*.ts` zod schemas) disepakati dan dikunci sebagai SP-0. Perubahan skema memerlukan PR yang ditinjau bersama dan pencatatan di `contracts/CHANGELOG.md`.

---

## ADR-003: Penegakan POL-9 di Level Database (Postgres Triggers) - RENCANA (implementasi di BE-1)

- **Konteks:** Kebijakan POL-9 mengharuskan profil developer memiliki negara terkonfirmasi sebelum dapat di-listing publik di feed / discover (`developer_settings.listed = true`). Mengandalkan validasi aplikasi rentan terhadap bypass melalui API PostgREST langsung.
- **Keputusan:**
  1. Trigger `BEFORE INSERT OR UPDATE ON developer_settings` memeriksa `profiles.country_code`. Jika kosong, transaksi digagalkan dengan kode error terstruktur `POL9_COUNTRY_REQUIRED`.
  2. Trigger `AFTER UPDATE OF country_code ON profiles` secara otomatis menurunkan `listed = false` pada `developer_settings` jika developer mengosongkan negaranya, serta menyinkronkan `projects.country_code`.
- **Status PR ini:** BELUM DIIMPLEMENTASIKAN - trigger + pgTAP `04_pol9_enforcement` menyusul di BE-1.

---

## ADR-004: Penanganan Dataset Kota (Cities Seed) sebagai Placeholder

- **Konteks:** Filter dan pencarian kota membutuhkan dataset geografis yang kaya, namun dataset global seperti GeoNames (mis. `cities5000.txt`) memiliki lisensi Creative Commons Attribution (CC BY 4.0) yang memerlukan atribusi formal, audit ukuran data (~15MB), dan strategi indexing khusus.
- **Keputusan:**
  - Untuk fase BE-0 / BE-1, disediakan seed terkurasi berisi ± 150-200 kota metropolitan utama dunia yang secara eksplisit **ditandai sebagai placeholder**.
  - Impor dan pipeline dataset penuh ditunda ke fase selanjutnya setelah verifikasi legalitas lisensi dan pembersihan data.

---

## ADR-005: Normalisasi Lokasi Deterministik Lokal Tanpa Geocoder Pihak Ketiga - RENCANA (implementasi di BE-1)

- **Konteks:** Alur pendaftaran GitHub mengimpor teks lokasi bebas (contoh: "Jakarta, Indonesia", "Bandung, ID", "USA", "Earth"). Panggilan geocoder eksternal (Google Maps, Mapbox) membutuhkan biaya API, dependensi jaringan eksternal, dan latensi.
- **Keputusan:** Mengimplementasikan fungsi SQL `normalize_location(text)` murni di Postgres:
  - Mengurai token berbasis koma dan spasi.
  - Mencocokkan token terhadap ISO2, nama negara, dan alias di tabel `countries`.
  - Mencocokkan kota dominan di tabel `cities`.
  - Jika terdapat ambiguitas (misalnya nama kota "Paris" tanpa penentu negara) atau teks tidak dikenal ("Earth"), fungsi secara aman mengembalikan `country_code = NULL` dengan confidence 0.
- **Konsekuensi:** Normalisasi bersifat instan, deterministik, tanpa biaya API, dan selaras dengan kebijakan POL-9 bahwa inferensi lokasi tidak otomatis mengaktifkan listing publik sebelum dikonfirmasi oleh pengguna.

---

## ADR-006: Ingestion Melalui GitHub GraphQL API & Anggaran Kuota - RENCANA (implementasi di BE-2)

- **Konteks:** Mengambil profil, puluhan repositori, manifest file, dan riwayat kontribusi 2 tahun menggunakan REST API membutuhkan 5–10 panggilan HTTP per analisis, menghabiskan kuota (5.000 req/jam) dengan sangat cepat dan meningkatkan latensi.
- **Keputusan:** Menggunakan GitHub GraphQL API sebagai jalur utama:
  - Menggabungkan kueri profil + 30 repo terbaru (Q1) dan kalender kontribusi (Q3, Q4) secara paralel dengan biaya kuota hanya 1 poin per kueri.
  - Memantau node `rateLimit { cost, remaining, resetAt }` pada setiap kueri. Jika kuota tersisa di bawah 5%, sistem otomatis menolak panggilan baru dan beralih ke cache/stale.
- **Status PR ini:** BELUM DIUKUR/DIBUKTIKAN - klaim "1 poin per kueri", "hemat 90%", dan "p95 < 3 detik" tanpa bukti mentah; pengukuran via `live-bench` menyusul di BE-2.

---

## ADR-007: Mitigasi Komprehensif SSRF pada Verifikasi Demo - RENCANA (implementasi di BE-2)

- **Konteks:** Pengecekan `homepageUrl` dari repositori pengguna berisiko membuka celah SSRF (Server-Side Request Forgery) terhadap jaringan internal Supabase, layanan metadata cloud (`169.254.169.254`), dan localhost.
- **Keputusan:**
  - Memvalidasi URL sebelum koneksi dibuka (hanya HTTP/HTTPS, port 80/443, tanpa userinfo, bukan nama host lokal/numerik).
  - Melakukan resolusi DNS (`Deno.resolveDns`) untuk memverifikasi bahwa alamat IP tujuan tidak berada pada rentang loopback, private (RFC1918), link-local, atau CGNAT.
  - Melakukan validasi ulang secara ketat pada setiap *redirect* (maksimal 3 *redirects*) dengan batas waktu (timeout) 5 detik.
- **Konsekuensi:** Verifikasi demo aman dari eksfiltrasi metadata cloud dan pemindaian port internal.

---

## ADR-008: Abstraksi Otentikasi GitHub Ganda (PAT Default & Kerangka App) - RENCANA (implementasi di BE-2)

- **Konteks:** Tim membutuhkan opsi otentikasi yang fleksibel antara PAT (Personal Access Token) untuk kemudahan lokal/CI dan GitHub App untuk skala organisasi produksi.
- **Keputusan:**
  - Menyediakan antarmuka `GitHubAuth` dengan implementasi `PatGitHubAuth` dan `AppGitHubAuth`.
  - Berdasarkan hasil spike, `PatGitHubAuth` dijadikan default runtime karena dapat membaca data publik dan kalender kontribusi user sembarang tanpa hambatan batasan instalasi organisasi.
  - Kerangka `AppGitHubAuth` (penukaran JWT RS256 ke installation token) tetap disediakan dan diuji secara modular untuk kebutuhan integrasi masa depan via `GITHUB_AUTH_MODE=app`.

