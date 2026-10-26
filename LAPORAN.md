# Laporan Progres — Gitscope Mobile (Expo)

**Tanggal laporan:** 26 Oktober 2026
**Branch aktif:** `feat/m3a-m3b`
**Commit terakhir:** `e25e016` — *M3a: tidy seed re-export spacing*
**Basis dokumen:** `PRD.md` §7 (FR) dan §11 (Rencana Pengerjaan)

---

## 1. Ringkasan Eksekutif

Pengembangan sudah menyelesaikan **M0, M1, M2, serta M3a/M3b**. Aplikasi sudah bisa dijalankan dengan alur utama **Explore Feed → Analysis**, lengkap dengan design system, tema light/dark, data seed, logika bisnis murni, dan unit test. M3 belum penuh karena integrasi API ke tombol Analyze (M3c) belum dikerjakan.

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

**Kesimpulan singkat:** fondasi aplikasi, design system, Explore Feed, dan layar Analysis sudah jadi. Yang belum: integrasi fetch GitHub yang sebenarnya ke tombol Analyze (M3c), lalu Talent (M4), Inbox/Profile/Chat/Toast (M5), dan Polish & QA (M6).

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
- **TopBar global (FR-G1):** brand "gitscope" dengan ikon GitHub miring −4°, indikator `LIVE DATA`, tombol toggle tema.
- **FloatingTabBar (FR-G3):** 4 tab (Explore, Talent, Inbox, Profil), tab aktif berwarna accent, titik notifikasi Inbox dari `unreadCount`.
- **Tema light/dark/system (FR-G2, D4):** palet lengkap, status bar mengikuti tema, pilihan tema dipersist ke AsyncStorage (hanya `themeMode` yang dipersist).
- **Navigasi:** root stack + tab layout + nested stack Explore (`index` → `analysis`), redirect `/` → `/explore`.
- **State global Zustand:** query, filter feed, analysis target, inbox, profile, chat, notice, tema.
- **Font & splash:** Manrope (5 weight) + DM Mono, splash ditahan sampai font siap.
- **Seed data:** 4 proyek feed, 4 kandidat, user/repo fallback (octocat), daftar bahasa.

### M1 — Design System

- **Token tema** (`src/theme/tokens.ts`): warna light & dark, shadow, radius, spacing, palet hard-shadow khas prototype.
- **Tipografi** (`src/theme/typography.ts`): skala font native yang terbaca (D5), varian teks, dukungan `maxFontSizeMultiplier`.
- **Theme plumbing:** `ThemeScope`, `context`, `useTheme`.
- **15 komponen UI reusable** di `src/components/ui/`:
  `Avatar`, `Badge`, `Card`, `Chip`, `HardShadowBox`, `Icon`, `Loader`, `ProgressBar`, `ScoreRing`/`ScoreCircle`, `SectionHeading`, `SegmentedTabs`, `SelectField`, `SelectSheet`, `Switch`, `T`.
- **Helper `hit-slop`** untuk touch target ≥ 44×44 (D6).
- **Halaman `/dev`** (hanya development): showcase seluruh komponen & varian, redirect ke root di production.
- **Dokumen produk:** `PRD.md` (481 baris) dan `design.md` (473 baris).

### M2 — Explore Feed (FR-E1…E9)

- **Intro feed (FR-E1):** eyebrow, H1 "Discover talent through work.", paragraf deskripsi.
- **SearchBox (FR-E2):** input hard-shadow, ikon filter saat kosong, tombol clear saat terisi.
- **Search examples (FR-E3):** chip `Flutter E-Commerce`, `Python ML`, `Golang`.
- **Quick filters (FR-E4):** toggle Active 30d, chip role, select lokasi.
- **Heading & counter (FR-E5):** jumlah proyek mengikuti hasil filter.
- **ProjectCard (FR-E6, FR-E7):** rank, badge verified, score circle, judul/deskripsi, chip role & stack, bukti (demo/stars), info developer, tombol **Analyze →**; kartu di-`memo` untuk performa.
- **Empty state (FR-E8):** pesan + tombol reset filter.
- **Error slot (FR-E9):** teks error di bawah search box.
- **Logika filter** (`src/lib/feed.ts`): pencarian keyword, role, lokasi, recentOnly, `compactNumber`.
- **Jest setup** + unit test filter feed dan link allowlist.
- **Perilaku sesuai PRD:** `flutter` → Nusa Commerce, `python` → Sentra AI Vision, chip `Python ML`/`Golang` → empty state (O4).

### M3a — Logika Analisis Murni

- **`lib/github.ts`:** `fetchProfile`, `fetchRepos`, `buildFallback`, `analyzeDeveloper`.
  - Fetch profil + repo paralel, timeout 10 detik, `AbortController`.
  - Tidak pernah melempar error: kegagalan apa pun jatuh ke fallback proyek.
  - Maksimal 8 repo, tanpa token/auth (sesuai PRD §10).
- **`lib/scoring.ts`:** `languageStats`, `primaryLanguage`, `inferRole`, `originalRatio`, `demoRatio`, `authenticity`, `repoScore`, `deriveAnalysis`.
- **`lib/links.ts`:** `openGithubUrl` dengan allowlist domain `github.com`.
- **`types/index.ts`:** tipe `GithubUser`, `GithubRepo`, `Candidate`, `FeedProject`, dll.
- **Seed** dirapikan dan dipisah dari logika.
- **Unit test** untuk scoring, GitHub fetch/fallback/timeout, dan link.

### M3b — Layar Analysis (FR-A1…A8)

- **Hero & back link (FR-A1)** + animasi masuk 250 ms (translateX 12 → 0, fade).
- **ProfileCard (FR-A2, FR-A3):** avatar + online dot, nama/login, link profil GitHub, bookmark toggle, bio fallback, tag role/bahasa/"Open to work", lokasi & jumlah repo, tombol **Message** dan **Export report**.
- **SkillCard (FR-A4):** role hasil inferensi, progress bar top-3 bahasa, chip framework, badge confidence.
- **ScoreCard (FR-A5):** ScoreRing authenticity, teks "HIGH CONFIDENCE", badge VERIFIED.
- **MetricGrid (FR-A6):** original work, commit health, live demos, contribution.
- **Heatmap (FR-A7):** 84 sel (12×7), legend, "+18% vs last year", 642 contributions.
- **VerifiedRepoCard (FR-A8):** maksimal 3 repo, skor per repo, badge fork/original/live demo, aksi View evidence & Discuss, "View all →".
- **Store tambahan:** `chat`, `notice`, `setUser`, `setRepos`, `setSaved`, `openChat`, `showNotice`.
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

1. **M3c — Wiring alur Analyze belum ada.** Tombol Analyze di `src/app/(tabs)/explore/index.tsx` masih memakai delay simulasi 600 ms dan `fallbackRepos` global (ada komentar `TODO(M3)`), bukan `analyzeDeveloper()` dari `lib/github.ts`. Akibatnya Analysis belum menampilkan data repo spesifik proyek yang di-tap.
2. **M4 Talent belum dimulai.** `src/app/(tabs)/talent.tsx` masih `PlaceholderScreen`; belum ada Discover, Pipeline, Compare (FR-T1…T7).
3. **M5 Inbox belum dimulai.** `src/app/(tabs)/inbox.tsx` masih placeholder (FR-I1…I5).
4. **M5 Profile belum dimulai.** `src/app/(tabs)/profile.tsx` masih placeholder (FR-P1…P5).
5. **ChatSheet & Toast belum ada UI.** Store sudah punya `openChat` dan `showNotice`, tetapi belum ada komponen yang merender bottom sheet chat maupun toast (FR-C1…C5, FR-G4). Tombol Message/Discuss/Export saat ini hanya mengubah state.
6. **Export report masih toast.** Belum memakai `expo-print`/`expo-sharing` (masuk stretch goal).
7. **M6 Polish & QA belum dilakukan:** visual diff terhadap prototype, sweep a11y, uji 4 ukuran layar, uji dark mode menyeluruh, build EAS/TestFlight/APK.
8. **Branch belum di-merge.** `main` lokal masih di M1 dan `origin/main` di M2; seluruh pekerjaan M3 berada di `feat/m3a-m3b`.

---

## 7. Rekomendasi Langkah Berikutnya

Urutan yang disarankan:

1. **Selesaikan M3c** — sambungkan `analyzeDeveloper()` ke `onAnalyze`, tangani `source: 'api' | 'fallback'`, set error saat profil tidak ditemukan, dan tampilkan data repo hasil fetch.
2. **M4 Talent** — implement Discover (filter + CandidateCard), Pipeline, Compare, lalu sambungkan tap kandidat ke Analysis (D1).
3. **M5 Inbox, Profile, ChatSheet, Toast** — termasuk status ketersediaan, daftar pesan, network card, cover profil, tools, GitHub connected, serta bottom sheet chat + toast global.
4. **M6 Polish & QA** — visual parity, a11y (label & touch target), uji perangkat 375×667 s/d 430×932, lalu build internal via EAS.
5. **Merge bertahap** — PR `feat/m3a-m3b` → `main`, lalu lanjut branch per milestone agar riwayat tetap rapi.

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
