# PRD — Gitscope Mobile (Expo)

> **Versi:** 1.0 · **Tanggal:** 16 Oktober 2026
> **Sumber kebenaran:** prototype Figma Make "Mobile GitHub Profile Finder" (`App.tsx` + `index.css`, React web).
> **Tujuan dokumen:** menjadi spesifikasi tunggal agar tim (atau coding agent) bisa membangun ulang prototype itu sebagai aplikasi native **Expo / React Native** dengan fungsi dan tampilan semirip mungkin.
> Pasangan dokumen: `design.md` (design tokens, dimensi komponen, ikon, animasi).

---

## 1. Ringkasan Produk

**Gitscope** adalah aplikasi mobile untuk **recruiter / talent scout** yang mencari developer lewat **bukti kerja nyata (proyek GitHub)**, bukan keyword CV. Aplikasi menampilkan feed proyek terverifikasi, menganalisis profil GitHub publik seorang developer (role, bahasa dominan, skor keaslian, aktivitas, repo unggulan), lalu membantu recruiter menyaring, membandingkan, menyimpan ke pipeline, dan mengobrol dengan kandidat dalam konteks proyek tertentu.

Brand: **git**`scope` (kata "git" tebal, "scope" muted). Tagline fitur: *"Discover talent through work."*, *"Evidence, not claims."*

### 1.1 Tujuan
| ID | Tujuan |
|---|---|
| G1 | Port 1:1 seluruh alur prototype (4 tab + analysis + chat sheet) ke Expo. |
| G2 | Kemiripan visual tinggi (warna, tipografi, radius, spacing, ikon, animasi) terhadap prototype. |
| G3 | Data profil dan repo diambil dari GitHub REST API publik dengan fallback bila gagal (perilaku asli dipertahankan). |
| G4 | Dark mode & light mode lengkap, bisa diganti dari header dan dari tab Profile. |
| G5 | Berjalan di iOS & Android lewat Expo (dev di Expo Go bila memungkinkan, build produksi via EAS). |

### 1.2 Non-goals (di luar scope v1)
- Login/akun sungguhan, OAuth GitHub, backend milik sendiri.
- Chat realtime sungguhan (v1 hanya chat lokal, tanpa balasan otomatis, sama seperti prototype).
- Pembuatan PDF sungguhan (v1 = toast mock; ada stretch goal di §9).
- Analisis commit/PR/contribution graph asli (angka heatmap, "642 contributions", "Consistent", "Deep" bersifat statis/dekoratif seperti prototype).
- Tablet layout khusus. Web hanya best-effort.

### 1.3 Persona
**Rani, Technical Recruiter / Talent Scout.** Ingin cepat melihat apakah seorang developer benar-benar membuat proyek sendiri (bukan fork), punya demo hidup, dan aktif. Memakai ponsel saat commute; butuh shortlist, compare 2 kandidat, dan kontak cepat.

---

## 2. Keputusan Teknis (Expo)

| Area | Pilihan | Catatan |
|---|---|---|
| Framework | **Expo (SDK stabil terbaru)** + TypeScript strict | Verifikasi versi SDK di docs.expo.dev saat inisialisasi. Gunakan `npx expo install` agar versi paket kompatibel. |
| Routing | **expo-router** (file-based) | 4 tab; Explore berisi nested Stack (`index` → `analysis`) sehingga tab bar tetap terlihat di layar Analysis, sama seperti prototype. |
| State | **Zustand** (+ `persist` ke AsyncStorage hanya untuk tema) | Semua state `App.tsx` asli dipindah ke store (lihat §6). |
| Data fetching | `fetch` + AbortController (timeout 10 dtk). Opsional TanStack Query untuk cache 5 menit. | Tidak ada token GitHub di client. |
| Ikon | **react-native-svg** | Path ikon identik dengan prototype (ada di `design.md` §7). |
| Font | `@expo-google-fonts/manrope` (400–800) & `@expo-google-fonts/dm-mono` (500) via `expo-font` / `useFonts` | Tahan splash screen sampai font siap. |
| Animasi | `react-native-reanimated` (atau `Animated` bawaan) | Transisi view, bottom sheet, toast, spinner, switch. |
| Gambar | `expo-image` (cache) untuk avatar | Avatar: `https://github.com/{login}.png`. Fallback inisial bila gagal. |
| Slider | `@react-native-community/slider` | Untuk "Minimum authenticity". |
| Safe area | `react-native-safe-area-context` | Header dan bottom nav memperhitungkan inset. |
| Opsional | `expo-haptics`, `expo-blur` (backdrop chat), `expo-print` + `expo-sharing` (PDF stretch) | |

### 2.1 Struktur Folder
```
app/
  _layout.tsx              # load font, ThemeProvider, <ChatSheet/>, <Toast/>, StatusBar
  (tabs)/
    _layout.tsx            # <Tabs tabBar={FloatingTabBar}/> + <TopBar/>
    explore/
      _layout.tsx          # Stack (headerShown:false, animation slide_from_right)
      index.tsx            # Project Discovery Feed
      analysis.tsx         # Developer Intelligence
    talent.tsx             # Discover | Pipeline | Compare
    inbox.tsx
    profile.tsx
src/
  components/
    ui/                    # Icon, Chip, SectionHeading, ProgressBar, ScoreRing, Switch, Avatar, SelectField, HardShadowBox
    TopBar.tsx, FloatingTabBar.tsx, ChatSheet.tsx, Toast.tsx
  features/
    feed/    (ProjectCard, FeedFilters, SearchBox)
    analysis/(ProfileCard, SkillCard, ScoreCard, MetricGrid, Heatmap, VerifiedRepoCard)
    talent/  (FilterPanel, CandidateCard, PipelineStage, CompareCard)
    inbox/   (AvailabilityCard, ConversationRow, NetworkCard)
    profile/ (AccountCover, SettingsList, GithubConnectCard, TrustNote)
  data/seed.ts             # candidates, feedProjects, fallbackUser, fallbackRepos (lihat Lampiran A)
  lib/github.ts            # fetchProfile, fetchRepos, buildFallback
  lib/scoring.ts           # inferRole, languageStats, authenticity
  store/useAppStore.ts
  theme/tokens.ts, theme/useTheme.ts, theme/typography.ts
```

### 2.2 Konfigurasi `app.json` (acuan)
- `name`: "Gitscope", `slug`: "gitscope", `scheme`: "gitscope", `orientation`: "portrait".
- `userInterfaceStyle`: "automatic" (tema aplikasi tetap dikontrol toggle sendiri; default awal **light**).
- Splash: background `#111612`, logo = brand mark (kotak hijau `#2dd86f` + glyph GitHub `#101510`).
- Android adaptive icon background `#2dd86f`.
- Status bar: `dark-content` saat light, `light-content` saat dark.

---

## 3. Arsitektur Informasi & Navigasi

```
Root
├─ TopBar (global, tinggi 72 + safe-area top): brand · LIVE DATA · toggle tema
├─ Tabs (FloatingTabBar, global)
│   ├─ Explore  → Stack: Feed (index) ⇄ Analysis (push)
│   ├─ Talent   → segmented tabs lokal: Discover | Pipeline | Compare
│   ├─ Inbox
│   └─ Profile
├─ ChatSheet (overlay global, menutupi tab bar)
└─ Toast (overlay global, di atas tab bar)
```

Aturan navigasi:
- Tab bar **selalu terlihat**, termasuk di layar Analysis.
- Dari Analysis, tombol "Back to project feed" memanggil `router.back()`.
- Berpindah tab **tidak** mereset state (query, filter, user terakhir, pilihan compare).
- Hardware back Android: tutup ChatSheet jika terbuka → kembali dari Analysis → keluar app.

---

## 4. Model Data

```ts
type Nav = "Explore" | "Talent" | "Inbox" | "Profile";

type GithubUser = {
  login: string; name: string | null; avatar_url: string; bio: string | null;
  followers: number; following: number; public_repos: number;
  location: string | null; html_url: string;
};

type GithubRepo = {
  id: number; name: string; description: string | null; language: string | null;
  stargazers_count: number; forks_count?: number; fork?: boolean;
  homepage?: string | null; pushed_at?: string; html_url: string;
};

type Candidate = {
  login: string; name: string; role: string; language: string; location: string;
  score: number; avatar: string;
  stage: "Saved" | "Interviewing" | "Hired"; availability: string;
};

type FeedProject = {
  id: number; name: string; description: string; role: string; stack: string[];
  location: string; score: number; active: boolean; demo: string;
  developer: Candidate; stars: number;
};
```
Seed data lengkap ada di **Lampiran A**.

---

## 5. Logika Bisnis (wajib identik dengan prototype)

### 5.1 Filter Feed
```ts
const keywords = query.toLowerCase().split(/[\s-]+/).filter(Boolean);
const searchable = `${p.name} ${p.description} ${p.role} ${p.stack.join(" ")} ${p.developer.name}`.toLowerCase();
const matchesKeyword  = keywords.length === 0 || keywords.every(k => searchable.includes(k));
const matchesRole     = feedRole === "All" || p.role === feedRole;
const matchesLocation = feedLocation === "All locations" || p.location === feedLocation
                        || (feedLocation === "Indonesia" && p.location !== "");
const visible = matchesKeyword && matchesRole && matchesLocation && (!recentOnly || p.active);
```
Pencarian bersifat live (setiap ketikan). Tombol submit/ikon filter di search box **tidak melakukan apa pun** selain `preventDefault` (pada mobile: dismiss keyboard).

### 5.2 Analyze Developer
1. Set `loading = true`, `error = ""`.
2. Panggil paralel:
   - `GET https://api.github.com/users/{login}`
   - `GET https://api.github.com/users/{login}/repos?sort=pushed&per_page=12`
3. Jika response profil **tidak ok** → throw `"Profil tidak ditemukan. Periksa kembali username."`.
4. Jika sukses: `user = profile`, `repos = repoList(ok? list : []).slice(0, 8)`, `saved = false`, buka layar Analysis.
5. Jika **error apa pun** (network, rate limit 403, 404): bangun **fallback dari data proyek** dan tetap buka Analysis; `error` dikosongkan:
```ts
user = {
  login: project.developer.login, name: project.developer.name, avatar_url: project.developer.avatar,
  bio: project.description, followers: project.stars, following: 42, public_repos: 18,
  location: project.location, html_url: `https://github.com/${project.developer.login}`,
};
repos = [{
  id: project.id, name: project.name, description: project.description,
  language: project.stack[0].split(" ")[0], stargazers_count: project.stars, forks_count: 42,
  homepage: project.demo, pushed_at: new Date().toISOString(),
  html_url: `https://github.com/${project.developer.login}`,
}];
```
6. `finally`: `loading = false`.

> API GitHub tanpa autentikasi dibatasi 60 request/jam/IP; fallback di atas memastikan UI tidak pernah menampilkan error buntu.

### 5.3 Skor & Inferensi (`lib/scoring.ts`)
```ts
languageStats = top 3 dari hitungan repo per language (null → "Other"), urut desc,
                value = Math.round(count / Math.max(repos.length,1) * 100)
primaryLanguage = languageStats[0]?.name ?? "TypeScript"

inferredRole =
  ["JavaScript","TypeScript","HTML","CSS"].includes(primaryLanguage) ? "Front-End Developer" :
  ["Kotlin","Dart","Swift"].includes(primaryLanguage)                 ? "Mobile Developer"    :
  ["Python","R"].includes(primaryLanguage)                            ? "AI / Data Engineer"  :
                                                                         "Back-End Developer";

originalRatio = repos.length ? Math.round(repos.filter(r => !r.fork).length / repos.length * 100) : 0
demoRatio     = repos.length ? Math.round(repos.filter(r => r.homepage).length / repos.length * 100) : 0
authenticity  = Math.min(98, Math.round(originalRatio*0.55 + demoRatio*0.2 + Math.min(user.public_repos, 25)))

repoScore(repo) = repo.fork ? 64 : Math.min(98, authenticity + 3)
```
Nilai statis (tidak dihitung): "94% CONFIDENCE", framework chips `React · Vite · Node.js · +3 tools`, "Commit health: Consistent", "Contribution: Deep", "642 contributions", "+18% vs last year", copy "HIGH CONFIDENCE / Original, active work".

### 5.4 Compare
- State `selected: string[]`, awal `["sindresorhus","yyx990803"]`.
- Toggle kandidat: jika sudah terpilih → hapus; jika belum → `[...items.slice(-1), login]` (maksimum 2, yang terlama tergeser).
- Tampilan compare = `candidates.filter(c => selected.includes(c.login)).slice(0,2)` (urutan mengikuti array `candidates`, bukan urutan pilih).
- Nilai statis di kartu compare: *Original projects* = `184` jika `sindresorhus` else `72`; *Commit streak* = `28 wks` jika `sindresorhus` else `19 wks`.

### 5.5 Chat (lokal)
- `openChat(project = "")` set `chatProject` dan buka sheet.
- `sendMessage`: abaikan jika `draft.trim()` kosong; selain itu push ke `sent[]` dan kosongkan input. Enter pada keyboard = kirim.
- `sent[]` bersifat global dan **bertahan** antar pembukaan chat (seperti prototype).
- Tidak ada balasan otomatis.

---

## 6. State Global (Zustand)

| Key | Tipe | Default | Keterangan |
|---|---|---|---|
| `dark` | boolean | `false` | Persist (enhancement ringan dari prototype). |
| `query` | string | `""` | Pencarian feed. |
| `feedRole` | string | `"All"` | |
| `feedLocation` | string | `"All locations"` | |
| `recentOnly` | boolean | `false` | Chip "Active 30d". |
| `user` | GithubUser | `fallbackUser` (octocat) | User yang sedang dianalisis; juga dipakai di tab Profile. |
| `repos` | GithubRepo[] | `fallbackRepos` | |
| `loadingId` | number \| null | `null` | **Per kartu** (lihat D2). |
| `saved` | boolean | `false` | Bookmark di profile card; reset ke `false` tiap analisis baru. |
| `talentTab` | `"Discover"\|"Pipeline"\|"Compare"` | `"Discover"` | |
| `roleFilter` | string | `"All roles"` | |
| `minScore` | number | `85` | Range 70–95. |
| `selected` | string[] | `["sindresorhus","yyx990803"]` | |
| `chat` | `{open, project, person}` | tertutup | `person` = lihat D3. |
| `draft` | string | `""` | |
| `sent` | string[] | `[]` | |
| `availability` | string | `"Open for hiring"` | Inbox. |
| `notice` | string | `""` | Toast, auto-hilang 2200 ms. |

---

## 7. Kebutuhan Fungsional per Layar

> Format: **FR-xx** = kebutuhan, **AC** = kriteria penerimaan. Dimensi & warna ada di `design.md`.

### 7.0 Global

| ID | Kebutuhan |
|---|---|
| FR-G1 | **TopBar**: kiri brand (kotak ikon GitHub hijau miring −4° + teks "git" + "scope"); kanan indikator "LIVE DATA" (titik hijau + DM Mono) dan tombol toggle tema (ikon moon, a11y label "Ubah tema"). |
| FR-G2 | Toggle tema mengganti seluruh palet light↔dark secara instan; status bar menyesuaikan. |
| FR-G3 | **FloatingTabBar**: 4 item (Explore/home, Talent/users, Inbox/message, Profile/briefcase). Item aktif berwarna accent. Inbox selalu menampilkan titik notifikasi hijau. |
| FR-G4 | **Toast** muncul di atas tab bar, tengah horizontal, hilang otomatis setelah 2200 ms; toast baru menggantikan yang lama. |
| FR-G5 | Semua konten tab bisa di-scroll vertikal tanpa scrollbar tampak, dengan padding bawah cukup agar tidak tertutup tab bar. |

**AC:** pergantian tema tidak menimbulkan flicker putih; tab bar tidak menutupi elemen terakhir di setiap halaman (scroll sampai bawah).

### 7.1 Explore — Feed (`explore/index`)

| ID | Kebutuhan |
|---|---|
| FR-E1 | Intro: eyebrow "PROJECT DISCOVERY FEED", H1 dua baris "Discover talent / through **work.**" (kata *work.* hijau dengan highlight garis di bawah), paragraf deskripsi. |
| FR-E2 | Search box bergaya hard-shadow: ikon search, input (placeholder `Flutter, Python ML, Golang...`), tombol kanan: jika `query` kosong → ikon filter (submit/dismiss keyboard); jika ada isi → ikon close yang mengosongkan query. |
| FR-E3 | Baris "Try:" dengan 3 chip: `Flutter E-Commerce`, `Python ML`, `Golang` → set query. Bisa scroll horizontal. |
| FR-E4 | Panel **Quick filters**: toggle "Active 30d", chip role (`All, Front-End, Back-End, Mobile, Data`), select lokasi (`All locations, Indonesia, Jakarta, Bandung, Surabaya`). |
| FR-E5 | Heading "FEATURED THIS WEEK / Verified project feed" + counter `{n} PROJECTS` sesuai hasil filter. |
| FR-E6 | **ProjectCard** (urut sesuai array): rank `0{index+1}`, badge "VERIFIED ACTIVE", lingkaran skor + label "AUTH", ikon folder + nama + deskripsi, chip role + chip stack, baris bukti (Original work · link demo · ★ stars compact), baris developer (avatar + online dot, nama, `@login · lokasi`, availability) dan tombol **Analyze →**. |
| FR-E7 | Tap area developer **atau** tombol Analyze menjalankan alur §5.2. Link demo membuka `https://github.com/{developer.login}` di browser. |
| FR-E8 | Empty state: ikon search, "Tidak ada proyek yang cocok", "Coba keyword atau filter yang lebih luas.", tombol **Reset filters** (reset query, role, lokasi, recentOnly). |
| FR-E9 | `error` (jika ada) tampil teks merah `#d04444` di bawah search box. |

**AC:** mengetik `flutter` menyisakan "Nusa Commerce"; `python` menyisakan "Sentra AI Vision"; chip `Flutter E-Commerce` menyisakan "Nusa Commerce"; chip `Python ML` dan `Golang` **menghasilkan empty state** (keyword `ml` dan `golang` tidak ada di teks proyek mana pun; ini perilaku asli prototype dan sengaja dipertahankan, lihat O4); role=Mobile + lokasi Jakarta → 1 proyek; Active 30d menyembunyikan "Ruang Dashboard"; tombol Analyze menampilkan spinner dan setelah selesai membuka Analysis dengan transisi slide dari kanan.

### 7.2 Explore — Analysis (`explore/analysis`)

| ID | Kebutuhan |
|---|---|
| FR-A1 | Link "Back to project feed" (panah terbalik) + hero "DEVELOPER INTELLIGENCE / Candidate evidence / Analisis otomatis dari repository dan aktivitas GitHub publik." |
| FR-A2 | **ProfileCard**: aksen hijau kiri, avatar + online dot, label "CANDIDATE MATCH", nama (fallback `login`), `@login` (buka `html_url`), tombol bookmark (toggle `saved`), bio (fallback "Developer on GitHub."), tag `{inferredRole}` · `{primaryLanguage}` · "Open to work" (hijau), meta lokasi (jika ada) + `{public_repos} public repos`. |
| FR-A3 | CTA: **Message** → buka chat tanpa konteks proyek; **Export report** → toast `PDF report berhasil dibuat`. |
| FR-A4 | **Skill fingerprint**: ikon chart + "PRIMARY SPECIALIZATION" + role + "Detected from languages, topics & dependencies"; progress bar top-3 bahasa; chip framework statis. Badge "94% CONFIDENCE". |
| FR-A5 | **Authenticity analysis**: kartu hijau berisi ScoreRing (`authenticity`/100) + teks "HIGH CONFIDENCE · Original, active work · Aktivitas konsisten dan mayoritas repository bukan hasil fork."; badge "VERIFIED". |
| FR-A6 | **Metric grid 2×2**: Original work `{originalRatio}%` + `{x} of {n} repos`; Commit health "Consistent"; Live demos `{demoRatio}%`; Contribution "Deep". |
| FR-A7 | **Heatmap** 84 sel (12 kolom × 7 baris), legend "Less ▪▪▪ More", "+18% vs last year", "642 contributions". |
| FR-A8 | **Verified projects**: maksimal 3 repo pertama; judul link "View all →" membuka `{html_url}?tab=repositories`. Kartu repo: ikon, nama, deskripsi 1 baris (fallback "Open-source project by this developer."), pill skor (fork → 64 kuning; selain itu `min(98, authenticity+3)`), badge ("Fork modified" / "Original work", "Live demo" jika `homepage`, bahasa atau "Other"), aksi **View evidence** (buka `html_url`) dan **Discuss** (chat dengan konteks nama repo). |

**AC:** untuk fallback octocat (2 repo: TS & Go, tidak ada fork, 1 homepage, `public_repos` 8) → originalRatio 100, demoRatio 50, authenticity = `min(98, round(55 + 10 + 8))` = **73**, role "Front-End Developer" (bahasa teratas imbang → urutan insert pertama, TypeScript), top-3 bahasa 50% / 50%.

### 7.3 Talent

| ID | Kebutuhan |
|---|---|
| FR-T1 | Judul "Your talent / **radar.**" + eyebrow "ADVANCED SOURCING" + deskripsi. |
| FR-T2 | Segmented control 3 tab: Discover, Pipeline, Compare (label Compare menampilkan ` (n)` bila `selected.length > 0`). |
| FR-T3 | **Discover — Smart filters**: chip role `All roles / Front-End / Full-Stack`; slider "Minimum authenticity" 70–95 (default 85, nilai tampil `{n}+`); tombol Reset (role → All roles, skor → 85); tag statis `Any location · TypeScript · Available now`. |
| FR-T4 | Heading hasil `{n} strong matches` + "Best fit first". Daftar **CandidateCard**: avatar, nama, `@login · lokasi`, `{role} · {language}`, lingkaran skor + "AUTH", footer (titik hijau + availability) dan tombol **Compare / Selected** (aturan §5.4). |
| FR-T5 | Tap area utama kandidat → membuka analisis kandidat tersebut (lihat D1). |
| FR-T6 | **Pipeline**: ringkasan 3 angka statis `7 Saved · 3 Interviewing · 1 Hired`; tiga grup berurutan **Interviewing, Saved, Hired**, masing-masing dengan label huruf besar + jumlah orang nyata; baris orang: avatar, nama, `{role} · Score {score}`, tombol pesan → buka chat. |
| FR-T7 | **Compare**: header hijau "SIDE-BY-SIDE — Bandingkan bukti teknis sebelum mengambil keputusan."; grid 2 kolom kartu (avatar, nama, role, skor `/100`, daftar: Main language, Original projects, Commit streak, Availability; tombol **Contact** → chat); tombol ✕ menghapus dari `selected`. Jika < 2 kartu, tampil kotak putus-putus "Add candidate" → pindah ke tab Discover. |

**AC:** dengan filter default (All roles, 85+) muncul 4 kandidat (96, 94, 91, 89); slider ke 92 → 2 kandidat; role "Full-Stack" + 85 → 1 (Cassidy). Memilih kandidat ke-3 saat 2 terpilih menyingkirkan yang terlama.

### 7.4 Inbox

| ID | Kebutuhan |
|---|---|
| FR-I1 | Judul "Talk with / **context.**" + eyebrow "REALTIME NETWORKING" + deskripsi. |
| FR-I2 | **AvailabilityCard** hijau: "YOUR STATUS" + select (`Open for hiring`, `Open for freelance`, `Not available`). |
| FR-I3 | Heading "Messages" + "3 unread". 3 percakapan pertama dari `candidates`: #1 label "Spoon-Knife", preview "Tentu, arsitekturnya menggunakan...", waktu `2m`; #2 dan #3 label = role, preview "Thanks for reaching out. Let's talk!", waktu `2h`, `3h`. Badge unread angka `1` (#1) dan `2` (#2); #3 tanpa badge. |
| FR-I4 | Tap percakapan #1 → chat dengan konteks "Spoon-Knife"; lainnya tanpa konteks. |
| FR-I5 | **NetworkCard** gelap: "YOUR NETWORK / 28 active connections / 12 developer terbuka untuk peluang baru." + tombol panah → tab Talent. |

### 7.5 Profile

| ID | Kebutuhan |
|---|---|
| FR-P1 | Cover hijau tinggi 115 dengan pola titik, teks mono `{ recruiter_mode: true }` dan badge "PRO WORKSPACE". |
| FR-P2 | Avatar 86 overlap cover (−44), badge "TALENT SCOUT", nama & `@login · GitHub connected` dari `user` yang terakhir dianalisis (default octocat). |
| FR-P3 | Statistik statis: `24 Reports · 7 Shortlisted · 3 Interviews`. |
| FR-P4 | Section "Recruitment workspace / TOOLS" dengan 3 baris: **Candidate pipeline** (→ tab Talent, sub-tab Pipeline), **Exported reports** (toast "24 report siap diunduh"), **Appearance** (switch dark mode; subteks `Dark mode aktif` / `Light mode aktif`). |
| FR-P5 | Kartu gelap **GitHub API connected** ("Data disinkronkan secara real-time.") + pill "ACTIVE"; **Trust note** "Transparent scoring — Gitscope hanya menggunakan data publik dan selalu menampilkan dasar penilaian."; footer `GITSCOPE INTELLIGENCE · VERSION 2.0`. |

### 7.6 ChatSheet (overlay global)

| ID | Kebutuhan |
|---|---|
| FR-C1 | Bottom sheet tinggi 74% layar, sudut atas 25, handle 36×4, backdrop gelap transparan (tap = tutup). Animasi masuk 250 ms (translateY 30% → 0, fade in). |
| FR-C2 | Header: avatar, nama, "● Online now", tombol tutup. |
| FR-C3 | Jika ada `chatProject`: kartu konteks "DISCUSSING PROJECT / {nama}" + skor `authenticity` di lingkaran kecil. |
| FR-C4 | Area pesan: label waktu "TODAY, 10:24"; bubble masuk: "Hi! Terima kasih sudah melihat profil dan project saya."; jika ada konteks, bubble keluar: "Halo, saya tertarik dengan project **{chatProject}**. Bisa ceritakan keputusan teknis utamanya?"; lalu semua pesan `sent[]` (bubble keluar dengan centang ganda). |
| FR-C5 | Composer: input "Tulis pesan..." + tombol kirim hijau. Keyboard tidak boleh menutup composer (KeyboardAvoidingView). |

---

## 8. Deviasi yang Disengaja dari Prototype

Prototype web memiliki beberapa perilaku yang berupa bug/keterbatasan. Berikut keputusan untuk versi Expo:

| ID | Perilaku prototype | Keputusan Expo | Alasan |
|---|---|---|---|
| D1 | Tap kandidat di Talent → `setQuery(login)` lalu pindah ke Explore. Karena pencarian hanya mencocokkan nama developer/stack, hasil hampir selalu kosong. | Tap kandidat → jalankan alur Analyze untuk `login` tersebut (tanpa proyek: bila API gagal pakai fallback dari data `Candidate`) dan buka layar Analysis. | Perilaku asli tidak berguna. |
| D2 | `loading` global → semua tombol Analyze menampilkan spinner bersamaan. | Spinner hanya pada kartu yang di-tap; tombol lain disabled sementara. | UX lebih benar. |
| D3 | Chat selalu memakai `user` (profil yang sedang dianalisis) sebagai lawan bicara, termasuk dari Inbox/Talent. | `chat.person` dikirim saat `openChat`: dari Analysis = `user`, dari Talent/Inbox = kandidat terkait. | Konsistensi. |
| D4 | Tema tidak persisten. | Tema disimpan di AsyncStorage. | Ekspektasi mobile. |
| D5 | Font 4–9 px (sangat kecil di web). | Skala font native dengan batas minimum terbaca (tabel di `design.md` §3.3). Mode `exact` tersedia lewat flag. | Keterbacaan. |
| D6 | Touch target banyak yang < 44 px. | Tambahkan `hitSlop` sehingga area sentuh ≥ 44×44 tanpa mengubah ukuran visual. | Aksesibilitas. |
| D7 | Badge "VERIFIED ACTIVE" tampil juga untuk proyek `active:false`. | **Tetap seperti prototype** (open question O1). | Fidelity. |
| D8 | Heatmap berukuran tetap 7 px (hanya memenuhi ±1/3 lebar kartu). | Default tetap 7 px (fidelity). Opsi: scale agar memenuhi lebar kartu (flag `HEATMAP_FULL_WIDTH`). | Fidelity vs estetika. |

Kelas CSS lama yang **tidak dipakai** di JSX final dan **tidak perlu diimplementasikan**: `.trending`, `.analysis-status`, `.follow`, `.stats`, `.repos`/`.repo-card`, `.segmented-control`, `.mini-search`, `.network-summary`, `.person-row`, `.history-*`, `.tip-card`, `.cover-action`, `.nav-avatar`, `.pulse-label`.

---

## 9. Stretch Goals (setelah paritas tercapai)
- **Export report sungguhan**: `expo-print` membuat PDF dari ringkasan analisis, `expo-sharing` untuk share sheet.
- Token GitHub opsional (input user, disimpan di `expo-secure-store`) untuk menaikkan rate limit.
- Persist pipeline/compare/chat ke AsyncStorage.
- Skor keaslian dinamis (tier teks selain "HIGH CONFIDENCE").
- Haptics ringan pada tab press, toggle, kirim pesan.

---

## 10. Persyaratan Non-Fungsional

| Area | Target |
|---|---|
| Performa | Cold start < 2,5 dtk di perangkat menengah; scroll 60 fps; feed memakai `FlatList`/`ScrollView` tanpa re-render berlebih (memo ProjectCard). |
| Jaringan | Timeout 10 dtk; 2 request paralel; jangan crash saat offline (jalur fallback §5.2). |
| Aksesibilitas | `accessibilityLabel` meniru aria-label prototype: "Ubah tema", "Cari proyek atau teknologi", "Hapus pencarian", "Cari proyek", "Simpan kandidat", "Tutup chat", "Navigasi utama". Kontras teks diperiksa di light & dark. Dukung Dynamic Type sampai skala 1.2 tanpa layout rusak (gunakan `maxFontSizeMultiplier={1.2}`). |
| Keamanan | Tidak ada secret di bundle. Link eksternal dibuka via `Linking.openURL` hanya untuk domain `github.com`. |
| Privasi | Hanya data publik GitHub; tidak ada analytics/tracking di v1. |
| Kompatibilitas | iOS 15+ dan Android 8+ (sesuaikan dengan minimum SDK Expo yang dipilih). Layar uji: 375×667, 393×852, 412×915, 430×932. |
| Lokalisasi | String UI apa adanya (campuran Indonesia–Inggris seperti prototype). |

---

## 11. Rencana Pengerjaan

| Milestone | Isi | Output |
|---|---|---|
| M0 Setup | `create-expo-app`, TS, expo-router, font, tema, store, seed, ikon SVG | App kosong dengan TopBar + FloatingTabBar + toggle tema |
| M1 Design system | Komponen UI dasar (Chip, SectionHeading, ScoreRing, ProgressBar, HardShadowBox, Switch, SelectField, Avatar) | Halaman Storybook-ish internal / layar `/dev` |
| M2 Explore Feed | Search, filter, ProjectCard, empty state | FR-E1…E9 |
| M3 Analysis | Alur fetch + fallback, semua kartu analisis, Heatmap, repo | FR-A1…A8 |
| M4 Talent | Discover, Pipeline, Compare | FR-T1…T7 |
| M5 Inbox, Profile, Chat, Toast | | FR-I*, FR-P*, FR-C* |
| M6 Polish & QA | Visual diff, animasi, a11y, dark mode sweep, uji perangkat, build EAS | Build internal (TestFlight / APK) |

---

## 12. Definition of Done & Uji Kemiripan

1. Semua AC di §7 lulus (uji manual + unit test untuk `lib/scoring.ts` dan filter feed).
2. **Visual parity**: bandingkan screenshot tiap layar (Explore feed, empty state, Analysis atas/tengah/bawah, Talent ×3 tab, Inbox, Profile, ChatSheet dengan & tanpa proyek, Toast) dalam light & dark pada lebar 390–430 dengan preview Figma Make. Selisih spacing ≤ 2 px, warna identik token, ikon identik.
3. Tidak ada teks terpotong/tumpang tindih di 375×667 dan 430×932.
4. Tidak ada warning merah pada Metro dan lolos `tsc --noEmit` + lint.
5. Build Android (APK/AAB) dan iOS (simulator/TestFlight) berjalan.

**Unit test minimal**
- `inferRole`: tiap kelompok bahasa + default.
- `authenticity`: kasus repos kosong (hasil = `min(public_repos,25)` dibatasi 98), semua fork, semua original+demo.
- Filter feed: kombinasi keyword/role/lokasi/recentOnly (contoh di AC §7.1).
- Compare toggle: batas 2 item FIFO.

---

## 13. Risiko & Open Questions

| # | Risiko / Pertanyaan | Mitigasi / Usulan |
|---|---|---|
| R1 | Rate limit GitHub tanpa token (60/jam). | Fallback sudah menutup UX; stretch: token opsional. |
| R2 | Username seed (`angga-risky`, `alishobeiri`, `mgechev`, dll.) mungkin tidak merepresentasikan developer yang dimaksud. | Gunakan sebagai data demo; fallback akan menutup 404. |
| R3 | `conic-gradient` (ScoreRing) tidak ada di RN. | Gunakan `react-native-svg` (Circle + `strokeDasharray`), detail di `design.md`. |
| R4 | Hard-shadow (offset 4, blur 0) tidak didukung `elevation` Android. | Pakai view bayangan terpisah (`HardShadowBox`). |
| R5 | Font kecil terlalu sulit dibaca. | Skala font native (D5). |
| O1 | Haruskah badge "VERIFIED ACTIVE" berubah jadi "INACTIVE" untuk `active:false`? | Default: ikut prototype. |
| O2 | Perlu tampilan frame ponsel di Expo Web? | Default: tidak; full-width responsif. |
| O3 | Mau Export PDF sungguhan di v1? | Default: tidak (stretch). |
| O4 | Chip "Python ML" dan "Golang" di prototype menghasilkan empty state. Perlu diperbaiki (mis. alias `golang`→`go`, `ml`→`pytorch/ai`)? | Default: ikut prototype; usulan: tambah tabel alias keyword. |

---

## Lampiran A — Seed Data

```ts
export const candidates: Candidate[] = [
  { login: "sindresorhus", name: "Sindre Sorhus",    role: "Front-End",  language: "TypeScript", location: "Oslo",      score: 96, avatar: "https://github.com/sindresorhus.png", stage: "Interviewing", availability: "Open to work" },
  { login: "yyx990803",    name: "Evan You",         role: "Front-End",  language: "TypeScript", location: "Singapore", score: 94, avatar: "https://github.com/yyx990803.png",    stage: "Saved",        availability: "Freelance" },
  { login: "cassidoo",     name: "Cassidy Williams", role: "Full-Stack", language: "JavaScript", location: "Chicago",   score: 91, avatar: "https://github.com/cassidoo.png",     stage: "Saved",        availability: "Open to work" },
  { login: "gaearon",      name: "Dan Abramov",      role: "Front-End",  language: "JavaScript", location: "London",    score: 89, avatar: "https://github.com/gaearon.png",      stage: "Hired",        availability: "Not available" },
];

export const feedProjects: FeedProject[] = [
  { id: 101, name: "Nusa Commerce", description: "Aplikasi marketplace mobile dengan payment gateway, live tracking, dan seller analytics.", role: "Mobile", stack: ["Flutter 65%", "Dart 35%"], location: "Jakarta", score: 96, active: true, demo: "Play Store", stars: 1280,
    developer: { login: "angga-risky", name: "Angga Risky", role: "Mobile", language: "Dart", location: "Jakarta", score: 96, avatar: "https://github.com/angga-risky.png", stage: "Saved", availability: "Open to work" } },
  { id: 102, name: "Sentra AI Vision", description: "Computer vision pipeline untuk inspeksi kualitas manufaktur secara real-time.", role: "Data", stack: ["Python 72%", "PyTorch 28%"], location: "Bandung", score: 94, active: true, demo: "Live Web", stars: 842,
    developer: { login: "alishobeiri", name: "Ali Shobeiri", role: "AI / Data", language: "Python", location: "Bandung", score: 94, avatar: "https://github.com/alishobeiri.png", stage: "Interviewing", availability: "Open to work" } },
  { id: 103, name: "Karsa Microservices", description: "High-performance commerce API dengan event-driven architecture dan observability.", role: "Back-End", stack: ["Go 78%", "Docker 22%"], location: "Indonesia", score: 92, active: true, demo: "API Docs", stars: 634,
    developer: { login: "mgechev", name: "Minko Gechev", role: "Back-End", language: "Go", location: "Indonesia", score: 92, avatar: "https://github.com/mgechev.png", stage: "Saved", availability: "Freelance" } },
  { id: 104, name: "Ruang Dashboard", description: "Accessible analytics dashboard dengan collaborative workspace dan modular charts.", role: "Front-End", stack: ["React 58%", "TypeScript 42%"], location: "Surabaya", score: 90, active: false, demo: "Vercel", stars: 471,
    developer: { login: "cassidoo", name: "Cassidy Williams", role: "Front-End", language: "TypeScript", location: "Surabaya", score: 90, avatar: "https://github.com/cassidoo.png", stage: "Saved", availability: "Open to work" } },
];

export const fallbackUser: GithubUser = {
  login: "octocat", name: "The Octocat", avatar_url: "https://github.com/octocat.png",
  bio: "GitHub's friendly mascot, exploring code and open source.",
  followers: 16298, following: 9, public_repos: 8, location: "San Francisco", html_url: "https://github.com/octocat",
};

export const fallbackRepos: GithubRepo[] = [
  { id: 1, name: "Spoon-Knife", description: "A delightful repository for testing and learning.", language: "TypeScript", stargazers_count: 13076, forks_count: 2401, homepage: "https://octocat.github.io", pushed_at: "2025-01-12", html_url: "https://github.com/octocat/Spoon-Knife" },
  { id: 2, name: "Hello-World", description: "My first repository on GitHub!", language: "Go", stargazers_count: 3041, forks_count: 328, pushed_at: "2024-11-04", html_url: "https://github.com/octocat/Hello-World" },
];
```

Helper: `compactNumber(n) = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)` — di Hermes pastikan `Intl.NumberFormat` compact tersedia; jika tidak, tulis formatter manual (`1280 → "1.3K"`, `842 → "842"`).

## Lampiran B — Daftar Teks UI (Copy) Utama

| Lokasi | Teks |
|---|---|
| Feed eyebrow | `PROJECT DISCOVERY FEED` |
| Feed H1 | `Discover talent` / `through work.` |
| Feed copy | `Cari kandidat berdasarkan proyek, teknologi, dan bukti kontribusi yang nyata.` |
| Search placeholder | `Flutter, Python ML, Golang...` |
| Feed heading | `FEATURED THIS WEEK` · `Verified project feed` · `{n} PROJECTS` |
| Card badge | `VERIFIED ACTIVE` · label skor `AUTH` · bukti `Original work` |
| Empty feed | `Tidak ada proyek yang cocok` · `Coba keyword atau filter yang lebih luas.` · `Reset filters` |
| Analysis hero | `DEVELOPER INTELLIGENCE` · `Candidate evidence` · `Analisis otomatis dari repository dan aktivitas GitHub publik.` |
| Section: skill | `ROLE INTELLIGENCE` · `Skill fingerprint` · `94% CONFIDENCE` |
| Section: authenticity | `PROJECT VALIDATION` · `Authenticity analysis` · `VERIFIED` |
| Section: heatmap | `CONTRIBUTION ACTIVITY` · `12 month momentum` · `642 contributions` |
| Section: repos | `VERIFIED PROJECTS` · `Evidence, not claims` · `View all` |
| Talent | `ADVANCED SOURCING` · `Your talent` / `radar.` · `Filter kandidat dari sinyal teknis yang terverifikasi, bukan sekadar keyword CV.` |
| Inbox | `REALTIME NETWORKING` · `Talk with` / `context.` · `Setiap percakapan dimulai dari karya nyata yang ingin kamu bahas.` |
| Profile | `{ recruiter_mode: true }` · `PRO WORKSPACE` · `TALENT SCOUT` |
| Toast | `PDF report berhasil dibuat` · `24 report siap diunduh` |
| Error | `Profil tidak ditemukan. Periksa kembali username.` |
