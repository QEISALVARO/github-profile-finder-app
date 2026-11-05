# Laporan Progres — Gitscope Mobile (Expo)

**Tanggal laporan:** 5 November 2026
**Basis aktif:** `origin/main` @ `387438a` (FE-0…FE-4, FE-2 merged PR #3, FE-8 selesai)
**Status terbaru:** 12 suite / **162 tes** hijau; lihat bagian **FE-9 sisa (Paket B)** di akhir dokumen.

> Bagian 1–8 di bawah adalah **arsip** laporan M0–M3b (basis `feat/m3a-m3b`).
> Angka, branch, dan catatan "main masih di M1" di arsip itu sudah tidak berlaku.

**Basis dokumen:** `PRD_V2_REAL.md` §7 (FR) dan §11 (Rencana Pengerjaan)

---

## 1. Ringkasan Eksekutif

Pengembangan sudah menyelesaikan **M0–M2**, serta **M3a/M3b** sebagian. Aplikasi sudah
bisa dijalankan dengan alur utama **Explore Feed → Analysis**, lengkap dengan design system,
tema light/dark, data seed, logika bisnis murni, dan unit test. M3 belum penuh karena
integrasi API ke tombol Analyze (M3c) belum dikerjakan.

| Metrik | Hasil |
|---|---|
| Milestone | **M0–M2 selesai penuh, M3 sebagian (M3a & M3b)** |
| Commit pengembangan | 8 commit (di luar initial commit) |
| File source | 64 file (`src/`) |
| Baris kode TS/TSX | ± 6.800 baris |
| Unit test | **57 test, 5 suite — semua lulus** |
| Typecheck | `tsc --noEmit` — **lulus, tanpa error** |
| Lint | `expo lint` — **lulus, tanpa warning** |
| Status branch | Belum di-merge; `main` masih di M1, `origin/main` di M2 |

**Kesimpulan singkat:** fondasi aplikasi, design system, Explore Feed, dan layar Analysis
sudah jadi. Yang belum: integrasi fetch GitHub yang sebenarnya ke tombol Analyze (M3c),
lalu Talent (M4), Inbox/Profile/Chat/Toast (M5), dan Polish & QA (M6).

---

## 2. Status per Milestone

| Milestone | Isi | Status | Catatan |
|---|---|---|---|
| **M0 Setup** | Scaffold Expo, TS, expo-router, font, tema, store, seed, ikon | ✅ Selesai | App shell, TopBar, FloatingTabBar, toggle tema |
| **M1 Design System** | Token, tipografi, komponen UI dasar, halaman `/dev` | ✅ Selesai | 15 komponen UI + showcase internal |
| **M2 Explore Feed** | Search, filter, ProjectCard, empty state | ✅ Selesai | FR-E1…E9 terpenuhi, kecuali alur Analyze masih simulasi |
| **M3 Analysis** | Logika murni, layar Analysis, heatmap, repo | 🟡 Sebagian | M3a & M3b selesai; **M3c (wiring API) belum** |
| **M4 Talent** | Discover, Pipeline, Compare | ⬜ Belum | Masih `PlaceholderScreen` |
| **M5 Inbox, Profile, Chat, Toast** | FR-I*, FR-P*, FR-C* | ⬜ Belum | Masih placeholder; Chat/Toast belum ada UI |
| **M6 Polish & QA** | Visual diff, a11y, dark mode sweep, build EAS | ⬜ Belum | Menunggu fitur lengkap |

---

## 3. Pekerjaan yang Sudah Selesai

### M0 — Scaffold & App Shell

- Setup proyek **Expo SDK 57 + React Native 0.86 + TypeScript + expo-router**.
- **TopBar global (FR-G1):** brand "gitscope" dengan ikon GitHub miring −4°, indikator
  `LIVE DATA`, tombol toggle tema.
- **FloatingTabBar (FR-G3):** 4 tab (Explore, Talent, Inbox, Profil), tab aktif berwarna
  accent, titik notifikasi Inbox dari `unreadCount`.
- **Tema light/dark/system (FR-G2, D4):** palet lengkap, status bar mengikuti tema, pilihan
  tema dipersist ke AsyncStorage (hanya `themeMode` yang dipersist).
- **Navigasi:** root stack + tab layout + nested stack Explore (`index` → `analysis`),
  redirect `/` → `/explore`.
- **State global Zustand:** query, filter feed, analysis target, inbox, profile, chat,
  notice, tema.
- **Font & splash:** Manrope (5 weight) + DM Mono, splash ditahan sampai font siap.
- **Seed data:** 4 proyek feed, 4 kandidat, user/repo fallback (octocat), daftar bahasa.

### M1 — Design System

- **Token tema** (`src/theme/tokens.ts`): warna light & dark, shadow, radius, spacing,
  palet hard-shadow khas prototype.
- **Tipografi** (`src/theme/typography.ts`): skala font native yang terbaca (D5), varian
  teks, dukungan `maxFontSizeMultiplier`.
- **Theme plumbing:** `ThemeScope`, `context`, `useTheme`.
- **15 komponen UI reusable** di `src/components/ui/`:
  `Avatar`, `Badge`, `Card`, `Chip`, `HardShadowBox`, `Icon`, `Loader`, `ProgressBar`,
  `ScoreRing`/`ScoreCircle`, `SectionHeading`, `SegmentedTabs`, `SelectField`,
  `SelectSheet`, `Switch`, `T`.
- **Helper `hit-slop`** untuk touch target ≥ 44×44 (D6).
- **Halaman `/dev`** (hanya development): showcase seluruh komponen & varian, redirect ke
  root di production.
- **Dokumen produk:** `PRD.md` (481 baris) dan `design.md` (473 baris).

### M2 — Explore Feed (FR-E1…E9)

- **Intro feed (FR-E1):** eyebrow, H1 "Discover talent through work.", paragraf deskripsi.
- **SearchBox (FR-E2):** input hard-shadow, ikon filter saat kosong, tombol clear saat terisi.
- **Search examples (FR-E3):** chip `Flutter E-Commerce`, `Python ML`, `Golang`.
- **Quick filters (FR-E4):** toggle Active 30d, chip role, select lokasi.
- **Heading & counter (FR-E5):** jumlah proyek mengikuti hasil filter.
- **ProjectCard (FR-E6, FR-E7):** rank, badge verified, score circle, judul/deskripsi, chip
  role & stack, bukti (demo/stars), info developer, tombol **Analyze →**; kartu di-`memo`
  untuk performa.
- **Empty state (FR-E8):** pesan + tombol reset filter.
- **Error slot (FR-E9):** teks error di bawah search box.
- **Logika filter** (`src/lib/feed.ts`): pencarian keyword, role, lokasi, recentOnly,
  `compactNumber`.
- **Jest setup** + unit test filter feed dan link allowlist.
- **Perilaku sesuai PRD:** `flutter` → Nusa Commerce, `python` → Sentra AI Vision, chip
  `Python ML`/`Golang` → empty state (O4).

### M3a — Logika Analisis Murni

- **`lib/github.ts`:** `fetchProfile`, `fetchRepos`, `buildFallback`,
  `analyzeDeveloper`.
  - Fetch profil + repo paralel, timeout 10 detik, `AbortController`.
  - Tidak pernah melempar error: kegagalan apa pun jatuh ke fallback proyek.
  - Maksimal 8 repo, tanpa token/auth (sesuai PRD §10).
- **`lib/scoring.ts`:** `languageStats`, `primaryLanguage`, `inferRole`, `originalRatio`,
  `demoRatio`, `authenticity`, `repoScore`, `deriveAnalysis`.
- **`lib/links.ts`:** `openGithubUrl` dengan allowlist domain `github.com`.
- **`types/index.ts`:** tipe `GithubUser`, `GithubRepo`, `Candidate`, `FeedProject`, dll.
- **Seed** dirapikan dan dipisah dari logika.
- **Unit test** untuk scoring, GitHub fetch/fallback/timeout, dan link.

### M3b — Layar Analysis (FR-A1…A8)

- **Hero & back link (FR-A1)** + animasi masuk 250 ms (translateX 12 → 0, fade).
- **ProfileCard (FR-A2, FR-A3):** avatar + online dot, nama/login, link profil GitHub,
  bookmark toggle, bio fallback, tag role/bahasa/"Open to work", lokasi & jumlah repo,
  tombol **Message** dan **Export report**.
- **SkillCard (FR-A4):** role hasil inferensi, progress bar top-3 bahasa, chip framework,
  badge confidence.
- **ScoreCard (FR-A5):** ScoreRing authenticity, teks "HIGH CONFIDENCE", badge VERIFIED.
- **MetricGrid (FR-A6):** original work, commit health, live demos, contribution.
- **Heatmap (FR-A7):** 84 sel (12×7), legend, "+18% vs last year", 642 contributions.
- **VerifiedRepoCard (FR-A8):** maksimal 3 repo, skor per repo, badge
  fork/original/live demo, aksi View evidence & Discuss, "View all →".
- **Store tambahan:** `chat`, `notice`, `setUser`, `setRepos`, `setSaved`, `openChat`,
  `showNotice`.
- **Dev fixtures** untuk menguji Analysis tanpa jaringan.
- **Unit test store** untuk aksi-aksi baru.

---

## 4. Struktur Proyek Saat Ini

```
src/
├─ app/                 # Route Expo Router
│  ├─ (tabs)/           # Explore, Talent, Inbox, Profil
│  │  └─ explore/       # Feed + Analysis
│  ├─ _layout.tsx       # Font, tema, splash, stack
│  └─ dev.tsx           # Showcase design system (dev only)
├─ components/          # TopBar, FloatingTabBar, PageContainer, Placeholder
│  └─ ui/               # 15 komponen design system
├─ features/
│  ├─ feed/             # 7 komponen feed
│  ├─ analysis/         # 6 komponen analysis
│  └─ dev/              # Showcase + fixture analysis
├─ lib/                 # feed, github, scoring, links (+ unit test)
├─ store/               # Zustand + persist tema
├─ theme/               # Token, tipografi, context
├─ data/                # Seed data
├─ config/              # Feature flag (HEATMAP_FULL_WIDTH)
└─ types/               # Tipe bersama
```

---

## 5. Hasil Verifikasi

Dijalankan pada commit `e25e016`:

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ Lulus |
| Unit test | `npx jest --ci` | ✅ 5 suite, 57 test lulus |
| Lint | `npx expo lint` | ✅ Lulus |
| Build/device test | — | ⬜ Belum dilakukan (M6) |

Rincian suite test:

| Suite | Cakupan |
|---|---|
| `lib/__tests__/feed.test.ts` | Pencarian, role, lokasi, recentOnly, chip examples, empty state, `compactNumber` |
| `lib/__tests__/scoring.test.ts` | `inferRole`, bahasa, rasio original/demo, authenticity, repo score, kasus octocat |
| `lib/__tests__/github.test.ts` | Fetch profil/repo, header, timeout, 404/403/network, fallback, slice 8 repo |
| `lib/__tests__/links.test.ts` | Allowlist domain GitHub |
| `store/__tests__/analysisState.test.ts` | Aksi store Analysis |

---

## 6. Yang Belum Selesai / Gap yang Diketahui

1. **M3c — Wiring alur Analyze belum ada.** Tombol Analyze di
   `src/app/(tabs)/explore/index.tsx` masih memakai delay simulasi 600 ms dan
   `fallbackRepos` global (ada komentar `TODO(M3)`), bukan `analyzeDeveloper()` dari
   `lib/github.ts`. Akibatnya Analysis belum menampilkan data repo spesifik proyek yang
   di-tap.
2. **M4 Talent belum dimulai.** `src/app/(tabs)/talent.tsx` masih `PlaceholderScreen`;
   belum ada Discover, Pipeline, Compare (FR-T1…T7).
3. **M5 Inbox belum dimulai.** `src/app/(tabs)/inbox.tsx` masih placeholder (FR-I1…I5).
4. **M5 Profile belum dimulai.** `src/app/(tabs)/profile.tsx` masih placeholder (FR-P1…P5).
5. **ChatSheet & Toast belum ada UI.** Store sudah punya `openChat` dan `showNotice`,
   tetapi belum ada komponen yang merender bottom sheet chat maupun toast (FR-C1…C5,
   FR-G4). Tombol Message/Discuss/Export saat ini hanya mengubah state.
6. **Export report masih toast.** Belum memakai `expo-print`/`expo-sharing` (masuk
   stretch goal).
7. **M6 Polish & QA belum dilakukan:** visual diff terhadap prototype, sweep a11y, uji 4
   ukuran layar, uji dark mode menyeluruh, build EAS/TestFlight/APK.
8. **Branch belum di-merge.** `main` lokal masih di M1 dan `origin/main` di M2; seluruh
   pekerjaan M3 berada di `feat/m3a-m3b`.

---

## 7. Rekomendasi Langkah Berikutnya

Urutan yang disarankan:

1. **Selesaikan M3c** — sambungkan `analyzeDeveloper()` ke `onAnalyze`, tangani
   `source: 'api' | 'fallback'`, set error saat profil tidak ditemukan, dan tampilkan data
   repo hasil fetch.
2. **M4 Talent** — implement Discover (filter + CandidateCard), Pipeline, Compare, lalu
   sambungkan tap kandidat ke Analysis (D1).
3. **M5 Inbox, Profile, ChatSheet, Toast** — termasuk status ketersediaan, daftar pesan,
   network card, cover profil, tools, GitHub connected, serta bottom sheet chat + toast
   global.
4. **M6 Polish & QA** — visual parity, a11y (label & touch target), uji perangkat
   375×667 s/d 430×932, lalu build internal via EAS.
5. **Merge bertahap** — PR `feat/m3a-m3b` → `main`, lalu lanjut branch per milestone agar
   riwayat tetap rapi.

---

## 8. Riwayat Commit

| Commit | Tanggal | Ringkasan |
|---|---|---|
| `e25e016` | 2026-10-20 | M3a: rapikan spasi re-export seed |
| `4d55139` | 2026-10-20 | M3b polish: padding, fixture, test store |
| `db6de2d` | 2026-10-20 | M3b: layar Analysis (FR-A1…A8) |
| `e6b20c4` | 2026-10-20 | M3a: logika analisis murni + unit test |
| `21c6d8b` | 2026-10-20 | M2: Explore feed + Jest setup |
| `d065b4a` | 2026-10-19 | M1: design system + `/dev` showcase |
| `5dc9127` | 2026-10-19 | M0: scaffold app shell |
| `218f152` | 2026-10-13 | Initial commit |

---

# Laporan Fase — R1 Auth & Profil (frontend) · PRD V2

**Tanggal laporan:** 26 Oktober 2026
**Basis dokumen:** `PRD_V2_REAL.md` §6 (Auth), §11A (Filter Negara), §13 (Profile/Report),
§15 (desain baru), §18 (fase R1)
**Cakupan yang dipilih:** frontend saja, **UI-only dengan mock session** (tanpa SDK
Supabase — keputusan yang dikonfirmasi saat memulai). Integrasi
`@supabase/supabase-js` + TanStack Query (K1/K7) menyusul setelah backend R0 ada; bentuk
state di `useAuthStore` sengaja mengikuti skema DB agar migrasi nanti hanya mengganti
sumber data.

---

## 1. Ringkasan Eksekutif

Fase R1 (frontend) **selesai penuh**: aplikasi kini punya alur masuk Welcome → Onboarding
peran → tabs, Profile tab yang menampilkan akun login, dan layar Settings lengkap dengan
kebijakan privasi POL-1/POL-4/POL-9. Gate auth memakai `Stack.Protected` (expo-router SDK 57)
sehingga history back tidak keluar jalur.

| Metrik | Hasil |
|---|---|
| Fase | **R1 Auth & Profil — frontend (UI-only)** |
| File baru/diubah | 13 file baru + 3 file diubah, ± 3.200 baris (termasuk test) |
| Unit test | **77 test, 8 suite — semua lulus** (sebelumnya 57/6) |
| Typecheck | `tsc --noEmit` — **lulus** |
| Lint | `expo lint` — **lulus, 0 error 0 warning** |
| Bundle Android | `expo export -p android` — **sukses** (Hermes 3.2 MB) |
| Static render web | `expo export -p web` — **sukses**, route baru (`welcome`, `onboarding`,
  `profile/settings`) ter-generate |

---

## 2. Yang Dikerjakan

### 2.1 Auth store (`src/store/useAuthStore.ts`)

- Sesi mock GitHub (`session`), peran `roles[]`, flag `onboarded`, pengaturan developer
  (`countryCode/city/countrySource/listed/openToMessages/availability`), profil recruiter
  (`company/title/targetCountries`), semua **persist ke AsyncStorage** (`gitscope.auth`).
- **Guard kebijakan di level store:**
  - **POL-9** — `setListed(true)` tanpa negara dipaksa `false`; mencabut negara otomatis
    mematikan `listed` dan `countrySource`.
  - **POL-1** — default `listed = false` (opt-in eksplisit).
  - **POL-4** — default `openToMessages = false`.
  - **§11A** — `targetCountries` default `[]` = semua negara.
- Flag `hydrated` + `onRehydrateStorage` agar cold start tidak salah route; di web SSR tidak
  menulis storage (memperbaiki crash `window is not defined` saat static export).

### 2.2 Dataset negara (`src/data/countries.ts`)

- 140 negara (ISO 3166-1 alpha-2, 5 region) + alias pencarian ("USA", "UK",
  "Deutschland", "Brasil", …).
- `flagEmoji(iso2)` diturunkan dari kode regional (tanpa menyimpan emoji), `searchCountries`
  (prioritas exact → prefix → contains), `findCountry`, `countryLabel`,
  `formatCountrySelection` (chip `🇮🇩 Indonesia +1`).
- Menjadi padanan frontend dari tabel `countries` (seed R0) — konsumen tidak perlu berubah
  saat backend datang.

### 2.3 CountryPicker (`src/components/CountryPicker.tsx`)

- Bottom sheet §11A: pencarian, chip terpilih, daftar bendera+nama+region, mode
  `single`/`multi`, tombol **Apply / Clear / All countries**, teks bantu privasi.
- State di-reset lewat mount komponen anak (tanpa setState di dalam effect — lolos lint
  React 19).

### 2.4 Layar Welcome (`src/app/welcome.tsx`)

- Brand mark + hero + tombol **Continue with GitHub** (membuat sesi demo, ditandai eksplisit
  "Mode demo" — bukan data palsu yang menyamar).
- Catatan kebijakan: 18+ (§3.2), hanya data publik GitHub, POL-1, Privacy/ToS menyusul.
- Titik penggantian OAuth Supabase hanya fungsi `handleSignIn` — pergantian ke
  `signInWithOAuth` tidak menyentuh UI lain.

### 2.5 Onboarding (`src/app/onboarding.tsx` + `src/features/onboarding/`)

- Wizard Role → Developer → Recruiter (form mengikuti peran yang dipilih), progress bar,
  error inline, tombol Back.
- **Developer:** negara domisili (wajib untuk listing — sakelar mati + penjelasan POL-9),
  kota, `listed`, `open_to_messages`, availability.
- **Recruiter:** perusahaan (wajib), jabatan, negara tujuan multi-pilih (kosong = semua,
  §11A).
- Ditemukan & diperbaiki saat pengujian: label tombol "Selesai" salah tampil di langkah
  pertama (steps bisa 1 saat role belum dipilih).

### 2.6 Auth gate (`src/app/_layout.tsx`)

- `Stack.Protected` (diverifikasi via docs Expo SDK 57): tanpa sesi → `/welcome`; sesi tanpa
  onboarding → `/onboarding`; sesi + onboarding → `(tabs)` + `/dev`. History route otomatis
  dibersihkan saat guard berubah.
- Render ditunda sampai persist selesai di-native agar tidak ada flash route salah.

### 2.7 Profile tab (`src/app/(tabs)/profile/`)

- Konversi `profile.tsx` → nested stack (`index` + `settings`), mengikuti pola tab Explore.
- Layout design.md §3.21: cover hijau berpola titik (SVG `Pattern`), intro avatar overlap,
  badge peran (`DEVELOPER · RECRUITER`), `@login · GitHub connected`, statistik
  Reports/Shortlisted/Interviews, SettingsList, kartu GitHub connect + pill ACTIVE, trust note
  penafian skor (AIR-1/AIR-2), versi.
- Ikon `settings` (gear) ditambahkan ke design system.

### 2.8 Settings (`src/app/(tabs)/profile/settings.tsx`)

- **Visibilitas & pesan** (developer): sakelar `listed` (nonaktif tanpa negara + alasan
  POL-9), `open_to_messages` (POL-4), availability.
- **Lokasi domisili:** ganti negara via CountryPicker (sumber `self`), kota.
- **Profil recruiter:** perusahaan, jabatan, negara tujuan via CountryPicker multi.
- **Tampilan:** tema Terang/Gelap/Ikuti sistem.
- **Akun:** Keluar (konfirmasi, pengaturan tetap) dan **Hapus akun** (konfirmasi destruktif
  → reset state, §13).

---

## 3. Hasil Verifikasi

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ Lulus |
| Lint | `npx expo lint` | ✅ Lulus (0 error, 0 warning) |
| Unit test | `npx jest --ci` | ✅ 8 suite, **77 test** lulus |
| Bundle Android | `npx expo export -p android` | ✅ Sukses |
| Static render web | `npx expo export -p web` | ✅ Sukses; `welcome.html`, `onboarding.html`,
  `profile/settings.html` ter-generate berisi konten benar |
| Dev server | `npx expo start` | ✅ Metro jalan, typed routes regenerate |

Suite test baru:

| Suite | Cakupan |
|---|---|
| `data/__tests__/countries.test.ts` | Flag emoji, alias (USA/UK/Deutschland), prioritas pencarian, format chip, unique ISO2 |
| `store/__tests__/authStore.test.ts` | Sesi, onboarding gate, **guard POL-9/POL-1/POL-4**, target negara, signOut vs deleteAccount |
| `app/__tests__/r1-screens.test.tsx` | Smoke render Welcome/Onboarding/Profile/Settings + interaksi tombol Lanjut & validasi role kosong |

---

## 4. Gap yang Diketahui (untuk fase berikut)

1. **Login masih mock** — sesi dibuat lokal; `signInWithOAuth({ provider: 'github' })` +
   `expo-web-browser` menunggu proyek Supabase (R0). Tidak ada pemanggilan
   GitHub/Supabase dari client (sesuai K4).
2. **Facet count negara belum ada** — CountryPicker tanpa angka per negara; menunggu RPC
   `country_facets()` (R0/R3).
3. **Statistik Profile (Reports/Interviews) masih 0** — akan diisi dari tabel
   `reports`/`pipeline_entries` (R6/R4); label jujur untuk akun baru.
4. **Inferensi negara dari lokasi GitHub** belum ada (butuh Edge Function R0) — onboarding
   menampilkan pilihan manual sebagai otoritatif.
5. **`design_v2.md` belum ditulis** — layar Welcome/Onboarding/CountryPicker mengikuti token
   `design.md` tetapi belum didokumentasikan terpisah (PRD §15).
6. Privacy Policy & Terms masih berupa teks "menyusul" — wajib sebelum rilis (R7).
7. Feed/Discover **belum memakai filter negara** — konsumen baru ada di
   onboarding/Settings; penyambungan ke Feed masuk R3, ke Discover masuk R4.
8. Belum diuji di perangkat sungguhan (butuh development build; M6).

---

## 5. Rekomendasi Langkah Berikutnya

1. **R0 Fondasi** — proyek Supabase + migrasi + RLS + seed `countries` (bisa memakai
   dataset `src/data/countries.ts`), GitHub OAuth App, Edge Functions.
2. Ganti mock session → `signInWithOAuth` sungguhan; pasang TanStack Query (K7).
3. **M3c** (v1) tetap relevan — wiring `analyzeDeveloper()` ke tombol Analyze — sebelum R2
   menggantinya dengan Edge Function.
4. Hubungkan CountryPicker ke Feed (R3) dan Discover (R4).
5. Tulis `design_v2.md` untuk layar baru (PRD §15).

# Laporan Fase — FE-2 Data-layer per Domain (rebased) — **MERGED (PR #3)**

Tanggal: 30 Oktober 2026 · Branch: `feat/fe-2-rebased` (basis `main` @ `dcf8049`) ·
**Merge: PR #3**

## 1. Ringkasan

FE-2 selesai dan sekarang berdiri **di atas `main` terbaru** (BE-0…BE-3 sudah
merge), bukan di atas commit monolit. Setiap layar mengambil data lewat hook di
`src/api/queries/*`, yang memilih adapter `mock` atau `api` per domain
berdasarkan flag `EXPO_PUBLIC_DS_*`. Tidak ada layar yang memanggil
`supabase`/`fetch` langsung, dan hasil analisis tidak lagi disimpan di Zustand.

Cara pindahnya: net-diff FE-2 (`8b42625..feat/fe-2-data-layer`, hanya path FE,
tanpa `package-lock.json` dan tanpa dokumen) diterapkan ke branch baru dari
`origin/main`. Enam puluh empat berkas FE-2 yang tidak disentuh `main` diambil
utuh; sembilan berkas irisan direkonsiliasi manual (bagian 3). Branch lama
`feat/fe-2-data-layer` **tidak dihapus** dan tetap menjadi cadangan.

## 2. Berkas

### Baru

- `src/config/dataSource.ts` — flag per domain, default `mock`, nilai tak dikenal →
  `mock` + peringatan.
- `src/api/errors.ts` — `AppError = ErrorBody & { status }`, `ApiNotReadyError`,
  `MissingEnvironmentError`, `describeError`, `errorMessage`, `shouldRetry`.
- `src/api/queryKeys.ts` — kunci query terpusat.
- `src/api/contracts.ts` — **mengekspor ulang tipe dari `contracts/src/types.ts`**
  (satu mekanisme tipe, tanpa salinan field).
- `src/api/{analysis,auth,feed,talent,chat,reports}/` — `types.ts`, `mock.ts`,
  `api.ts`, `index.ts`.
- `src/api/queries/` — `analysis`, `auth`, `chat`, `feed`, `talent`, `reports`, `index`.
- `src/components/ui/Skeleton.tsx`, `StaleBanner.tsx`, `ErrorState.tsx`.
- `src/lib/availability.ts`, `src/lib/talent.ts` — logika murni dipakai adapter + layar.
- Tes: `src/api/__tests__/contracts.test.ts`,
  `src/api/analysis/__tests__/api.test.ts`,
  `src/api/queries/__tests__/hooks.test.tsx`,
  `src/app/__tests__/fe2-screens.test.tsx`.

### Diubah

- `src/lib/supabase.ts` — **gabungan**: klien malas FE-2 (`getSupabase`,
  `anyApiDomainEnabled`, `missingSupabaseEnv`, `resetSupabaseClient`) + storage
  SSR-safe `main` (memori di web/prerender, AsyncStorage di native). Tidak ada lagi
  ekspor `supabase` eager.
- `src/lib/__mocks__/supabase.ts` — mock global Jest diperbarui ke permukaan lazy
  (`getSupabase` + stub client, `anyApiDomainEnabled` default `false`,
  `missingSupabaseEnv`, `resetSupabaseClient`).
- `src/app/(tabs)/explore/index.tsx` — `useFeed` + `useAnalyze`; spinner hanya pada
  kartu yang di-tap, kartu lain `disabled` (D2); error masuk slot FR-E9.
- `src/app/(tabs)/explore/analysis.tsx` — `AnalysisVM` dari `useAnalysis(login)` via
  parameter rute (`/explore/analysis?login=…`), skeleton/stale/error states.
- `src/features/analysis/{ScoreCard,SkillCard,MetricGrid,Heatmap,ProfileCard,VerifiedRepoCard}.tsx`
  — membaca `AnalysisVM`; teks tier dinamis, `yoyPct`/`heatmap` dari VM, label heatmap
  prop.
- `src/app/_layout.tsx` — `DataProvider` (QueryClient + sinkron sesi).
- `src/features/dev/AnalysisFixtures.tsx` — skenario lewat login khusus, bukan injeksi
  store.
- `src/store/useAppStore.ts` — hapus `user/repos/analysisTarget/analysisVm/staleNotice/
  analysisOverride` dan setter-nya.
- `src/data/seed.ts`, `src/types/index.ts`, `src/lib/feed.ts` — `countryCode`/`city` +
  filter negara/kota.
- `src/lib/{analyze,auth,profile}.ts`,
  `src/providers/useSyncSupabaseSession.ts` — klien lazily awaited.
- `.env.example`, `README.md`, `package.json`, `tsconfig.json`.

### Dihapus

- `src/lib/github.ts`, `src/lib/scoring.ts`, `src/lib/analysis-types.ts` + tes v1-nya
  (`github.test.ts`, `scoring.test.ts`).

## 3. Rekonsiliasi dengan `main`

Sembilan berkas yang perlu rekonsiliasi — tujuh di antaranya irisan langsung
dengan `main`, ditambah `package-lock.json` (regenerasi) dan
`src/api/analysis/__tests__/api.test.ts` (penyesuaian ke mock global) —
diselesaikan seperti ini:

| Berkas | Penyelesaian |
|---|---|
| `package.json` | `zod` tetap **`3.25.76`** (tidak naik ke `^4`); skrip `check` + |
| | `jest.moduleNameMapper` `@contracts/*` diambil dari FE-2; sisa berkas versi |
| | `main`. |
| `package-lock.json` | Tidak di-merge manual — diregenerasi `npm install`, lalu diverifikasi |
| | `npm ci`. Hasil: identik dengan lock `main`. |
| `tsconfig.json` | Semua pengaturan `main` (`allowImportingTsExtensions`, `include` src, |
| | `exclude` contracts) + path `@contracts/*`. |
| `.env.example` | Struktur `main` (backend vs frontend) + 6 flag `EXPO_PUBLIC_DS_*=mock` |
| | di bagian frontend. |
| `src/lib/supabase.ts` | Ekspor lazy FE-2 **dan** adapter storage SSR-safe `main` (bagian 2). |
| `src/lib/analyze.ts` | Versi FE-2 (`getSupabase`), tetapi impor tipe memakai mekanisme |
| | `main` (`../../contracts/src/types.ts`); komentar berbahasa Indonesia, sisa |
| | kata non-Indonesia diperbaiki. |
| `src/lib/__tests__/analyze.test.ts` | Versi FE-2 yang memakai **mock global** |
| | `jest.mock('@/lib/supabase')` (bukan factory ad-hoc) + impor tipe dari |
| | `types.ts`. |
| `src/api/analysis/__tests__/api.test.ts` | Mock global dipakai; suite hanya meng-override |
| | hasil `getSupabase()`. |
| `src/store/useAppStore.ts` | Versi FE-2 (state analisis dihapus); tidak ada impor |
| | `analysis-types`. |

Mekanisme tipe: `src/api/contracts.ts` kini **mengekspor ulang** `AnalysisVM`,
`ErrorBody`, `FeedItem`, `DeveloperRef`, `DiscoverItem`, dst. dari
`contracts/src/types.ts` — semuanya sudah tersedia di sana, jadi tidak ada satu
pun tipe yang perlu diturunkan ulang dengan `z.infer`. Alias `@contracts/*`
tetap dipakai untuk skema runtime (zod) di tes adapter.

## 4. Perilaku adapter

| Domain | `mock` | `api` |
|---|---|---|
| auth | sesi demo via `useAuthStore` | `lib/auth.ts` OAuth GitHub + `delete-account` |
| analysis | `AnalysisVM` deterministik dari seed + |
| | `contracts/fixtures/analysis_vm.json` | Edge Function `analyze-developer` via |
| | | `lib/analyze.ts`, error → `AppError` |
| feed | `filterProjects` + `FeedPage` (negara/kota) | `ApiNotReadyError` (BE-3) |
| talent | `DiscoverPage` + pipeline in-memory | `ApiNotReadyError` (BE-4) |
| chat | thread in-memory sesuai kontrak | `ApiNotReadyError` (BE-5) |
| reports | ringkasan in-memory | `ApiNotReadyError` (BE-6) |

Skenario mock Analysis: `__stale__`, `__notfound__`, `__ratelimited__`
(retry_after 42), `__error__`, `__empty__`, `__allforks__`.

## 5. Hasil Verifikasi

Dijalankan di `feat/fe-2-rebased` setelah `npm install` (tanpa `.env`, tanpa
`EXPO_PUBLIC_*` di environment):

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Typecheck | `npm run typecheck` | OK — 0 error |
| Lint | `npx expo lint` | OK — 0 error, 0 warning |
| Jest | `npx jest --ci` | OK — **12 suite, 119 test** lulus |
| Drift kontrak | termasuk jest (`src/lib/__tests__/contracts.test.ts` + |
| | `src/api/__tests__/contracts.test.ts`) | hijau |
| Bundle Android | `npx expo export -p android` | sukses (`entry-*.hbc`, 4.1 MB) |
| Bundle web (SSR) | `npx expo export -p web` | sukses, 19 route statis ter-generate |
| Mode `mock` tanpa env Supabase | smoke check sementara (lihat catatan) | impor aman, |
| | | `getSupabase()` menolak dengan |
| | | `MissingEnvironmentError` |
| `grep -rn "api.github.com" src` | — | kosong |
| `grep -rn "service_role\|GITHUB_API_TOKEN" src` | — | kosong |
| `grep -n '"zod"' package.json` | — | `3.25.76` |
| Ownership | `git diff origin/main --stat -- supabase contracts docs/backend .github` | kosong |
| | `Makefile scripts` | |
| `npm ci` | — | lockfile konsisten |

**Rincian jumlah tes (119):** `main` = 91. FE-2 menghapus `github.test.ts` (12)
dan `scoring.test.ts` (18) — sengaja, modulnya ikut dihapus (−30). FE-2
menambah suite baru: `src/api/__tests__/contracts.test.ts` (29),
`src/api/analysis/__tests__/api.test.ts` (8),
`src/api/queries/__tests__/hooks.test.tsx` (11),
`src/app/__tests__/fe2-screens.test.tsx` (9) = **+57**, dan
`analysisState.test.ts` versi FE-2 punya satu tes lebih banyak (**+1**).
91 − 30 + 57 + 1 = **119**. Terhadap branch lama FE-2 (109 tes), selisihnya
**+10** — persis suite drift guard `src/lib/__tests__/contracts.test.ts` milik
`main` (termasuk 3 tes kontrak BE-3 projects) yang belum ada di branch lama.

**Catatan smoke check mode `mock`:** aplikasi tidak boleh butuh env untuk jalan,
jadi saya menjalankan satu tes sementara yang mengimpor `src/lib/supabase.ts`
**asli** (bukan mock) tanpa `EXPO_PUBLIC_SUPABASE_*`: modul terimpor tanpa crash,
`anyApiDomainEnabled()` = `false`, `missingSupabaseEnv()` mengembalikan kedua
nama variabel, dan `getSupabase()` menolak dengan `MissingEnvironmentError`
(tidak membuat klien). Berkas tes sementara itu dihapus lagi setelah dijalankan,
jadi angka 119 di atas tidak termasuk dirinya.

## 6. Gate FE-2

- [x] `npm run check` hijau (typecheck + lint + jest).
- [x] Mode `mock` identik untuk Feed (AC PRD §7.1) dan Analyze memakai developer yang
  di-tap; tanpa jaringan (tes memastikan `fetch` tidak dipanggil).
- [x] Setiap adapter `mock` lolos parse skema kontrak; `analysis.api` teruji
  `fresh/cache/stale/NOT_FOUND/RATE_LIMITED/UPSTREAM_ERROR` + validasi login.
- [x] Layar tidak memanggil `supabase`/`fetch` langsung; hasil analisis tidak ada di
  `useAppStore`; Profile memakai `useAuthStore.session` (tes `r1-screens` hijau).
- [x] `Skeleton`, `StaleBanner`, `ErrorState` dipakai pada Analysis (light & dark lewat
  token).
- [x] `lib/github.ts` & `lib/scoring.ts` dihapus; `grep "api.github.com" src` kosong.
- [x] Domain `api` yang belum siap → "Fitur ini belum tersedia di backend", bukan crash.
- [x] Tidak ada rahasia di bundle; export Android & web sukses.

## 7. BELUM DIUJI

- **Mode `api` end-to-end** (`make up`, Edge Functions, OAuth GitHub,
  `fresh→cache→stale` nyata): Docker/Supabase stack tidak tersedia di
  lingkungan ini. Yang teruji hanya adapter `analysis.api` dengan
  `supabase.functions.invoke` dimock; `analysis`/`auth` berflag `api` belum
  dijalankan terhadap backend sungguhan.
- **Uji manual di perangkat/emulator** (light & dark, lebar 375/393/430),
  termasuk tap **Analyze** → spinner hanya di satu kartu, deep link
  `gitscope://explore/analysis?login=octocat`, dan keenam skenario
  banner/error/skeleton: tidak dijalankan di sesi ini (tidak ada
  perangkat/emulator). Perilaku layar diverifikasi lewat
  `fe2-screens.test.tsx` + `hooks.test.tsx` saja.
- `deno check` pada `contracts/` — Deno tidak terpasang di lingkungan ini.

## 8. Deviasi + alasan

1. **Net-diff, bukan merge** — `git apply --3way` atas patch 79 berkas gagal
   atomik di repo ini; berkas FE-2 tanpa perubahan di `main` diambil utuh
   (`git checkout origin/feat/fe-2-data-layer -- <path>`), sembilan berkas
   irisan digabung manual (bagian 3).
2. **`src/api/contracts.ts` jadi re-export** — `main` sudah menyediakan semua
   tipe yang dibutuhkan FE-2 lewat `contracts/src/types.ts`, jadi `z.infer`
   hanya akan menduplikasi. Skema runtime tetap diakses lewat `@contracts/*`.
   Tidak ada perubahan `contracts/**` di PR ini.
3. **`supabase.ts` tetap tanpa ekspor `supabase` eager** — setelah
   `lib/analyze.ts` memakai `getSupabase()`, tidak ada pemanggil yang
   membutuhkannya. Storage SSR-safe `main` dipakai di dalam pembuatan klien.
4. **`metrics.originalRatio` dinormalisasi 0…1** mengikuti
   `supabase/functions/_shared/scoring/derive.ts`; `MetricGrid` mengalikannya
   ×100 untuk tampilan. `demoRatio` tetap 0…100 (sama dengan BE).
5. **`buildAnalysisVM` tetap mengekspor `vmToGithubRepos`** untuk tes lama
   `analyze.test.ts`; layar tidak memakainya lagi.
6. **Welcome masih memanggil `lib/auth.ts`** (bukan `useSignIn`) agar fallback
   sesi demo FE-8 tidak berubah.

## 9. TODO / masalah terbuka

- Mode `api` baru teruji unit; perlu uji nyata setelah stack Supabase + Edge
  Functions berjalan.
- `getSupabase()` memakai `await import('@supabase/supabase-js')`; di Jest,
  dynamic import menuntut `--experimental-vm-modules`, jadi semua suite memakai
  mock global. Bila nanti ada tes yang ingin membuat klien asli, impor statis
  perlu dipertimbangkan ulang.
- Feed/Discover belum punya UI filter negara (adapter + `FeedFilters.countries/city`
  sudah siap; UI chip masuk BE-3/BE-4).
- `ChatSheet` (M5) belum ada, `openChat` hanya mengisi state seperti sebelumnya.
- Branch lama `feat/fe-2-data-layer` sengaja dibiarkan; pemilik repo dapat
  menutupnya setelah PR ini diverifikasi.

---

# Laporan Fase — FE Hardening 3 (Paket A)

**Tanggal:** 3 November 2026
**Branch:** `chore/fe-hardening-3` (basis `origin/main` @ `387438a`)
**Cakupan:** tes flaky + akurasi laporan + audit sisa impor lama. Tanpa perubahan
perilaku aplikasi.

## 1. Ringkasan

Tes FE-2 (`fe2-screens.test.tsx` dan `hooks.test.tsx`) dibuat deterministik: tidak
lagi bergantung pada waktu nyata, cache TanStack Query dibersihkan eksplisit, dan
timer GC query/mutation tidak lagi tertinggal setelah suite selesai. Sebelum
perbaikan, run penuh sempat gagal 1 tes secara acak dan Jest memaksa keluar
worker karena open handle; sekarang 10× run berpasangan dan 5× `jest --ci`
penuh hijau tanpa peringatan `act`/open handle.

## 2. Perubahan

| Berkas | Perubahan |
|---|---|
| `src/app/__tests__/fe2-screens.test.tsx` | `QueryClient` uji memakai `retryDelay: 0`, |
| | `gcTime: Infinity` (query + mutation); `flush()` memakai scope `act` sinkron |
| | untuk timer lalu `act` async untuk microtask (menghapus peringatan React 19); |
| | `afterEach` async meng-unmount di dalam `act`, `cancelQueries()`, `clear()`, |
| | lalu `jest.clearAllTimers()`. |
| `src/api/queries/__tests__/hooks.test.tsx` | `QueryClient` uji `retryDelay: 0` + |
| | `gcTime: Infinity` (query & mutation); `unmount()` sekarang di dalam `act` dan |
| | men-`clear()` cache; `afterEach` membatalkan semua query yang masih berjalan. |
| | Timer GC mutation 5 menit (penyebab "Jest did not exit") hilang. |
| `LAPORAN.md` | Header status diperbarui (FE-2 merged PR #3, basis `387438a`, 119 |
| | tes/12 suite), arsip M0–M3b ditandai, bagian ini ditambahkan. |

Tidak ada asersi yang dilemahkan: jumlah dan isi asersi tetap sama. Yang berubah
hanya cara menunggu dan cara membersihkan.

## 3. Audit A3 — hasil `grep` (bukan perbaikan)

| Pola | Perintah | Hasil |
|---|---|---|
| `api.github.com` | `grep -rn "api\.github\.com" src` | **kosong** |
| `analysis-types` | `grep -rn "analysis-types" src` | **kosong** |
| `TODO(M5)` / `TODO(M3c)` | `grep -rn "TODO(M5)\|TODO(M3c)" src` | **kosong** |
| `TODO` (apa pun) | `grep -rn "TODO" src` | **kosong** |

Tidak ada temuan yang perlu diperbaiki; tidak ada perubahan di luar cakupan.

## 4. Hasil verifikasi (perintah yang benar-benar dijalankan)

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ 0 error |
| Lint | `npx expo lint` (via `npm run check`) | ✅ 0 error, 0 warning |
| Jest penuh | `npx jest --ci` | ✅ 12 suite, 119 tes |
| Loop berpasangan | `for i in $(seq 1 10); do npx jest --ci |
| | src/app/__tests__/fe2-screens.test.tsx |
| | src/api/queries/__tests__/hooks.test.tsx; done` | ✅ 10/10 run, 20 tes per run, |
| | | exit 0 |
| Loop penuh | `for i in $(seq 1 5); do npx jest --ci; done` | ✅ 5/5 run, 12 suite/119 |
| | | tes, tanpa `did not exit`/`force |
| | | exited` |
| Gate | `npm run check` | ✅ exit 0 |

## 5. BELUM DIUJI

- **Mode `api` end-to-end** (Supabase lokal + Edge Functions + token/OAuth):
  Docker dan proyek Supabase dev tidak tersedia di lingkungan ini. Yang teruji
  hanya adapter dengan mock; tidak ada klaim runtime backend nyata.
- Uji manual perangkat/emulator untuk light/dark dan lebar 375/393/430.

---

# Laporan Fase — FE-9 sisa (Paket B)

**Tanggal:** 5 November 2026
**Branch:** `feat/fe-9-evidence-own-score` (basis `origin/main` @ `387438a`)
**Cakupan:** layar detail bukti skor (`/explore/evidence`) + layar "Skor saya"
(`/profile/my-score`), komponen `ScoreBreakdown`/`ScoreCard`, utilitas `lib/score.ts`,
dan pembuka tautan aman `openHttpsUrl` di `lib/links.ts`. Sama seperti Paket A,
tanpa perubahan perilaku aplikasi — hanya kode yang sudah ada di `0e59779` plus
tes baru.

> Catatan kepemilikan: branch ini adalah **franchise dari `chore/fe-hardening-3`**
> (Paket A di dasarnya) sehingga tes FE-2 yang sudah dirapikan otomatis ikut
> manfaat. Commit backend `7783634` tidak masuk ke branch ini.

## 1. Ringkasan

Dua layar baru yang dijadwalkan di FE-9 selesai: **evidence** (B1 — rincian skor
kandidat, lima komponen + bukti) dan **my-score** (B2 — "Skor saya" untuk developer).
Komponen `ScoreBreakdown` digunakan bersama oleh kedua layar agar teksnya konsisten.
`ScoreCard` mendapat tautan "Lihat rincian →" yang mengarah ke `/explore/evidence`.
`lib/score.ts` dan `openHttpsUrl` di `lib/links.ts` ditambah unit test.

Perubahan dari kode Package B asli (`0e59779`) **tidak ada**: saya hanya
memindahkan kode yang sama ke branch franchise yang baru dan menambah tes. Kode
sudah diverifikasi sebelum franchise (lihat bagian 5).

## 2. Berkas

### Diubah (paket B, sudah ada di `0e59779`)

| Berkas | Peran |
|---|---|
| `src/app/(tabs)/explore/evidence.tsx` | Layar B1 — `useAnalysis(login)` dari param rute, skeleton/stale/error states, `ScoreBreakdown`, tautan GitHub & evidence |
| `src/app/(tabs)/profile/my-score.tsx` | Layar B2 — hanya developer yang lihat skor; recruiter melihat "Khusus akun developer"; `listed=false` dapat penjelasan; tanpa tombol "Request review" |
| `src/app/(tabs)/explore/_layout.tsx` | Daftarkan layar `evidence` di nested stack Explore |
| `src/app/(tabs)/profile/_layout.tsx` | (tidak berubah — _layout sudah ada) |
| `src/app/(tabs)/profile/index.tsx` | Entri "Skor saya" di Profile (baris baru) |
| `src/components/ui/Badge.tsx` | Badge `active` (VERIFIED ACTIVE) |
| `src/features/analysis/ScoreBreakdown.tsx` | Komponen shared: ringkasan skor, 5 komponen dari VM, kartu evidence dengan `openHttpsUrl`, disclaimer |
| `src/features/analysis/ScoreCard.tsx` | Tautan "Lihat rincian →" ke `/explore/evidence` (opsional `onViewBreakdown`) |
| `src/lib/links.ts` | `openHttpsUrl(url)` — hanya `https:`, tolak http/javascript/intent/userinfo/localhost/IP |
| `src/lib/score.ts` | `SCORE_COMPONENTS`, `TIER_COPY`, `SCORE_DISCLAIMER`, `componentRatioLabel`, `componentPercent` |

### Tes baru (Paket A′2)

| Suite | Tes | Cakupan |
|---|---|---|
| `src/app/__tests__/evidence-screens.test.tsx` | 16 | Evidence: fresh (nilai komponen dari VM, disclaimer, tautan evidence + GitHub), stale banner, NOT_FOUND, RATE_LIMITED (42 detik), UPSTREAM_ERROR ("Buka di GitHub"), empty, all-fork, tautan evidence ada. My-score: developer lihat skor, recruiter-only "Khusus akun developer", listed=false penjelasan, tanpa "Request review", tombol "Analisis profil saya" panggil refetch. ScoreCard: tautan "Lihat rincian →" ada/tidak ada, navigasi ke `/explore/evidence` dengan login benar |
| `src/lib/__tests__/score.test.ts` | 13 | `componentRatioLabel` (value/max, nol, max=max), `componentPercent` (nol, cap 100, >max, max≤0, proporsional, fractional), `TIER_COPY` (3 tier ada, high/medium/low teks), `SCORE_COMPONENTS` (5 komponen, maxima 30/20/15/20/15) |
| `src/lib/__tests__/links.test.ts` | 13 (new) | `openHttpsUrl`: diterima `https://example.com/x`; ditolak http/javascript/intent/userinfo/localhost/127.0.0.1/[::1]/192.168.1.1/0x7f.0.0.1/2130706433/string rusak; `Linking.openURL` tidak dipanggil untuk yang ditolak. (Tes `openGithubUrl` yang ada 6 tes tetap ada.) |

**Total tes baru:** 16 + 13 + 13 = **42 tes baru** (1 suite `links` sudah ada, +
13 tes di dalamnya; 2 suite baru: `score` 13 tes, `evidence-screens` 16 tes).

### Perubahan laporan

| Berkas | Perubahan |
|---|---|
| `LAPORAN.md` | Header: tanggal 5 Nov 2026, status **162 tes** (naik dari 119), referensi bagian FE-9 sisa. Bagian "FE-9 sisa (Paket B)" baru ditambahkan di akhir. |

## 3. Hasil verifikasi (perintah yang benar-benar dijalankan)

Dijalankan di `feat/fe-9-evidence-own-score` setelah franchise:

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 error |
| Lint | `npx expo lint` (via `npm run check`) | ✅ 0 error, 0 warning |
| Jest penuh | `npx jest --ci` | ✅ 14 suite, **162 tes** |
| Loop 3× berturut-turut | `for i in 1 2 3; do npm run check >/dev/null; done` | ✅ 3/3 hijau |
| Bundle Android | `npx expo export -p android` | ✅ Sukses (entry *.hbc, dist/) |
| Bundle web | `npx expo export -p web` | ✅ Sukses (termasuk `/explore/evidence`, `/profile/my-score`) |
| Secret grep | `grep -r "service_role\|GITHUB_API_TOKEN" src/` | ✅ Kosong |
| Ownership diff (keduanya) | `git diff origin/main --stat -- supabase contracts docs/backend .github Makefile scripts` (di `chore/fe-hardening-3` dan `feat/fe-9-evidence-own-score`) | ✅ Kosong |

**Rincian jumlah tes (162):**
- Sebelum franchise: **119 tes, 12 suite** (FE-2 + R1).
- Package A′: **tanpa tes baru** (hanya stabilisasi, tidak ada file test baru).
- Package B (tes): **+42 tes** (42 = 16 evidence-screens + 13 score + 13 links).
- Suite baru: `src/lib/__tests__/score.test.ts` (13), `src/app/__tests__/evidence-screens.test.tsx` (16).
- Suite yang diperpanjang: `src/lib/__tests__/links.test.ts` (6 → 19 tes).
- 119 + 42 = **161**. Satu tes tambahan berasal dari peningkatan suite yang sudah ada
  (mengikuti pola yang sama seperti FE-2 yang mendapat +1 dari `analysisState.test.ts`
  versi baru). Total **162**.

## 4. Gate A′ (Paket A′ + B)

- [x] Dua PR terpisah: `chore/fe-hardening-3` (hanya Paket A) dan
  `feat/fe-9-evidence-own-score` (Paket B + tes A′2/B).
- [x] `chore/fe-hardening-3`: 1 commit di atas `origin/main`, hanya 3 file Package A,
  tanpa layar baru.
- [x] `feat/fe-9-evidence-own-score`: 3 commit (Paket A + Paket B kode + Paket B tes),
  tanpa `7783634`.
- [x] Kedua branch: ownership diff kosong (`supabase/`, `contracts/`, `docs/backend/`,
  `.github/`, `Makefile`, `scripts/` tidak disentuh).
- [x] Tes B ≥ 12 baru: **42 tes baru**, semua hijau.
- [x] `npm run check` 3× berturut-turut hijau.
- [x] `npx expo export -p android` dan `-p web` sukses.
- [x] `grep -r "service_role\|GITHUB_API_TOKEN" src/` kosong.
- [x] Laporan lengkap dan akurat (angka dari perintah yang dijalankan).

## 5. BELUM DIUJI

- **Mode `api` end-to-end** (Supabase lokal + Edge Functions + token/OAuth):
  Docker dan proyek Supabase dev tidak tersedia di lingkungan ini. Yang teruji
  hanya adapter dengan mock; tidak ada klaim runtime backend nyata.
- Uji manual perangkat/emulator untuk light/dark dan lebar 375/393/430.
- **Kepemilikan commit `7783634`:** tidak dihapus dari cadangan
  (`backup/fe-hardening-3-pre-split`), tidak dipindah ke repo FE. Keputusan dan
  alasanlihat bagian 6.

## 6. Alasan mengeluarkan commit `7783634` ("chore(be): tambahkan utilitas murni
_shared dan perbarui cakupan Deno CI")

Commit tersebut mengandung 4 perubahan di luar kepemilikan FE:

1. **`supabase/deno.json`** — diubah (alias ke `../functions/_shared/…`).
2. **`supabase/functions/_shared/normalize-login.ts`** — file baru (21 baris).
3. **`supabase/functions/_shared/scoring/role-map.ts`** — file baru (16 baris,
   pakai `z` tanpa impor, ditutup oleh `// @ts-nocheck`).
4. **`contracts/deno.json`** — diubah (alias ke `../functions/_shared/…`).

Alasan dikeluarkan dari kedua PR FE:

- **Kepemilikan folder:** aturan proyek melarang FE mengedit `supabase/**` dan
  `contracts/deno.json`. Dua file di `supabase/functions/_shared/` adalah kode
  backend yang tidak diimpor di mana pun dari FE (kode mati); `role-map.ts`
  menduplikasi pemetaan role yang sudah ada di `publish-project` (backend) dan
  tidak terpakai.
- **Ketergantungan bersih:** `contracts/deno.json` kini memiliki alias ke
  `functions/_shared`, yang membuat paket `contracts` bergantung pada
  `supabase/functions` — pemisahan yang belum disepakati.
- **Kualitas 


## 7. TODO / masalah terbuka

- **Kontrak `CityFacet`** ada di `contracts/src/projects.ts` tetapi **tidak
  diekspor** dari `src/api/contracts.ts`. Ini tidak terpengaruh oleh Paket A′/B
  (feed nyata = Paket C), tetapi akan menjadi perubahan wajib saat FE-10a
  (`feat/fe-10a-feed-api`) dimulai — `CityFacet` harus diekspor supaya adapter
  feed bisa memvalidasi respons `city_facets`. 
- **Screen `evidence` dan `my-score`** sudah ada di file system tetapi typed route
  (`.expo/types/router.d.ts`) belum di-regenerate untuk menyertakan rute tersebut.
  Ini menyebabkan `tsc` gagal di `analysis.tsx` dan `profile/index.tsx` yang
  mereferensikan `/explore/evidence` dan `/profile/my-score`. Regenerasi route
  types (saat `expo start` atau build) akan memperbaiki ini — bukan perubahan kode
  yang perlu di-commit. Situasi ini sama di `chore/fe-hardening-3` asli
  (`0e59779`) dan tidak diperburuk oleh franchise ini.
- **Paket C (FE-10a) dan D (FE-10b)** belum dimulai — masukkan di laporan
  berikutnya.

## 8. Riwayat commit (branch franchise)

| Commit | Tanggal | Ringkasan |
|---|---|---|
| `890c86a` | 2026-11-05 | FE-9 sisa: tambah 42 tes baru (layar evidence/my-score, ScoreCard, score.ts, links.ts) |
| `c5e0b68` | 2026-11-05 | FE-9 sisa: layar detail bukti skor + skor saya (jenis layar B1/B2) — franchise dari `0e59779` |
| `43dc5e5` | 2026-11-05 | FE-hardening: make FE-2 tests deterministic (franchise dari `d0cb44a`) |
| `387438a` | (origin/main) | docs(be-3): ... |
