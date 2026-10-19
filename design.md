# design.md — Gitscope Mobile (Expo / React Native)

> Spesifikasi visual lengkap untuk meniru prototype Figma Make "Mobile GitHub Profile Finder" di React Native.
> Semua angka diambil dari `index.css` + `App.tsx` prototype. **1 CSS px = 1 dp** di React Native.
> Dokumen pasangan: `PRD.md` (fungsi & logika).

**Gaya visual:** *tech-editorial / neo-brutalist ringan* — kertas krem kehijauan, kartu putih bergaris tipis, satu warna aksen hijau neon `#2dd86f`, tipografi **Manrope** (judul tebal, letter-spacing rapat) dipadu **DM Mono** (label, angka, eyebrow), search box dengan *hard shadow*, bottom nav berbentuk pil gelap melayang.

---

## 1. Design Tokens

### 1.1 Warna inti

| Token | Light | Dark | Dipakai untuk |
|---|---|---|---|
| `ink` | `#111612` | `#f3f7f2` | Teks utama, border search, tombol primer |
| `muted` | `#68716a` | `#9fa8a1` | Teks sekunder, ikon redup |
| `paper` | `#f4f6f1` | `#101410` | Background layar |
| `surface` | `#ffffff` | `#181d19` | Kartu, input, chip bg tertentu |
| `line` | `#dce1da` | `#303831` | Semua border/divider, track |
| `accent` | `#2dd86f` | `#2dd86f` | Aksen utama (tombol, badge, progress) |
| `accentSoft` | `#dff9e8` | `#1d3c27` | Bg badge/ikon hijau lembut |
| `nav` | `#111612` | `#f0f4ef` | Background bottom nav |
| `navText` | `#ffffff` | `#121612` | Teks/ikon bottom nav |
| `outerBg` (web saja) | `#dfe5dc` | `#080a08` | Latar luar frame ponsel (abaikan di native) |

### 1.2 Warna tetap (tidak berubah antar tema)

| Token | Hex | Pemakaian |
|---|---|---|
| `onAccent` | `#101510` | Teks/ikon di atas tombol/blok `accent` (juga `#101510`/`#111612`/`#0d1c12` — pakai satu nilai `#101510`; search button ikon `#0d1c12`) |
| `greenText` | `#258b4d` | Eyebrow, label hijau, link hijau, kata "work." |
| `greenStrong` | `#18733a` | Teks di atas `accentSoft` (badge, skor, ikon) |
| `error` | `#d04444` | Pesan error |
| `warnText` / `warnBg` | `#9b6b12` / `#fff2cc` | Pill skor repo fork |
| `heat0` | = `line` | Sel heatmap level 0 |
| `heat1` | `#b9efca` | Level 1 |
| `heat2` | `#75df9b` | Level 2 |
| `heat3` | `#35c96d` | Level 3 |
| `heat4` | `#168d45` | Level 4 |
| `langDefault` | `#718096` | Bulatan bahasa lain |
| `lang.JavaScript` | `#f1e05a` | |
| `lang.TypeScript` | `#3178c6` | |
| `lang.HTML` | `#e34c26` | |
| `lang.Ruby` | `#701516` | |
| `lang.Python` | `#3572a5` | |
| `lang.Go` | `#00add8` | |

### 1.3 Warna turunan (hasil `color-mix` CSS → nilai RGBA)

| Nama | Rumus | Catatan |
|---|---|---|
| `topbarBg` | `paper` alpha **0.92** | Opsional `expo-blur` intensity 16 |
| `tabsTrack` | `line` alpha **0.55** | Background segmented/triple tabs |
| `navInactive` | `navText` alpha **0.55** | Ikon & label nav tidak aktif |
| `scoreCircleBorder` | campuran `accent` 55% + `line` 45% | Light ≈ `#7ee6a3`-ish; hitung dengan `mix()` helper |
| `ringTrack` | `rgba(255,255,255,0.45)` | Track ScoreRing di kartu hijau |
| `onAccentGlass` | `rgba(255,255,255,0.5)` | Select Inbox, `.account-plan` memakai `0.55`, avatar-stack tidak dipakai |
| `coverDot` | `onAccent` alpha **0.22** | Pola titik cover Profile |
| `githubCardMuted` | `surface` alpha **0.60** | Teks sekunder di kartu gelap |
| `networkCardMuted` | `surface` alpha **0.65** | |
| `networkBtnBorder` | `surface` alpha **0.18** | |
| `connectedPillBg` | `accent` alpha **0.12** | |
| `recentDotRing` | `accent` alpha **0.22** | |
| `backdrop` | `rgba(4,8,5,0.58)` | Backdrop chat |
| Bayangan kartu | `ink` alpha 0.05 / 0.07 / 0.08 | Lihat §1.6 |

Sediakan helper `withAlpha(hex, a)` dan `mix(hexA, hexB, pctA)` di `theme/tokens.ts`.

### 1.4 Spacing & ukuran layout
Gunakan nilai literal dari prototype (tidak ada skala spacing formal). Konstanta penting:

| Konstanta | Nilai |
|---|---|
| Lebar maksimum "ponsel" | 430 (di native pakai lebar layar; batasi konten `maxWidth: 430` agar tablet/web tetap proporsional) |
| TopBar tinggi konten | **72** (+ `insets.top` untuk status bar) |
| Padding horizontal konten | **20** |
| Padding konten: atas / bawah | `30` (Explore) · `27` (halaman lain) / `116` + `insets.bottom` (ruang tab bar) |
| Tab bar | `left/right: 12`, `bottom: max(12, insets.bottom)`, tinggi **72** |

### 1.5 Radius

`5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 25` dipakai sesuai komponen (lihat §6). Lingkaran = `borderRadius: 9999` / setengah sisi. Tab bar `20`, sheet chat atas `25`, avatar kecil `10–17`, avatar besar `25` (Profile).

### 1.6 Elevasi / Bayangan

| Nama | CSS asli | iOS RN | Android |
|---|---|---|---|
| `shadowCard` | `0 7px 24px ink@5%` | `offset {0,7}`, `radius 12`, `opacity .05`, color ink | `elevation 2` |
| `shadowProfile` | `0 10px 30px ink@7%` | `offset {0,10}`, `radius 15`, `opacity .07` | `elevation 4` |
| `shadowTab` | `0 3px 10px ink@8%` (segment aktif) | `offset {0,3}`, `radius 5`, `opacity .08` | `elevation 1` |
| `shadowNav` | `0 12px 30px rgba(0,0,0,.22)` | `offset {0,12}`, `radius 15`, `opacity .22`, color `#000` | `elevation 8` |
| `shadowSheet` | `0 -15px 50px rgba(0,0,0,.25)` | `offset {0,-15}`, `radius 25`, `opacity .25` | `elevation 16` |
| `shadowToast` | `0 8px 25px rgba(0,0,0,.2)` | `offset {0,8}`, `radius 12`, `opacity .2` | `elevation 6` |
| **`hardShadow`** | `4px 4px 0 ink` (focus: `accent`) | Lihat di bawah | Lihat di bawah |

> Aturan konversi blur CSS → `shadowRadius` iOS: **radius = blur / 2**.

**HardShadowBox (search box)**: `elevation` Android tidak bisa menghasilkan bayangan keras dengan offset. Implementasi lintas-platform:
```tsx
<View style={{ position: 'relative' }}>
  <View style={{ position: 'absolute', left: 4, top: 4, right: -4, bottom: -4,
                 backgroundColor: focused ? accent : ink, borderRadius: 15 }} />
  <View style={{ flexDirection:'row', alignItems:'center', gap:11, paddingVertical:7, paddingRight:7, paddingLeft:15,
                 borderWidth:1.5, borderColor: ink, borderRadius:15, backgroundColor: surface }}>…</View>
</View>
```
Beri `marginRight/marginBottom: 4` pada wrapper agar bayangan tidak terpotong.

---

## 2. Tipografi

### 2.1 Font
| Peran | Family | File Expo |
|---|---|---|
| Sans (UI, judul) | **Manrope** 400 / 500 / 600 / 700 / 800 | `Manrope_400Regular`, `_500Medium`, `_600SemiBold`, `_700Bold`, `_800ExtraBold` |
| Mono (label, angka, eyebrow) | **DM Mono** 500 | `DMMono_500Medium` |

Muat dengan `useFonts` dari `@expo-google-fonts/manrope` & `@expo-google-fonts/dm-mono`; tahan splash sampai selesai. Aktifkan `Text.defaultProps.allowFontScaling = true` dengan `maxFontSizeMultiplier = 1.2`.
Teks tebal default RN (`fontWeight: 'bold'`) **harus** dipetakan ke `Manrope_700Bold` — buat komponen `<T weight="700">`.

### 2.2 Skala font native (D5)
Prototype memakai font sangat kecil (4–9 px). Gunakan fungsi `fs(px)`:

| px prototype | 4 | 5 | 6 | 7 | 8 | 9 | 10 | ≥11 |
|---|---|---|---|---|---|---|---|---|
| **Expo (mode `readable`, default)** | 8 | 8.5 | 9 | 9.5 | 10 | 11 | 12 | sama |
| Expo (mode `exact`) | 4 | 5 | 6 | 7 | 8 | 9 | 10 | sama |

```ts
export const FONT_MODE: 'readable' | 'exact' = 'readable';
const MAP: Record<number, number> = {4:8,5:8.5,6:9,7:9.5,8:10,9:11,10:12};
export const fs = (px: number) => FONT_MODE === 'exact' ? px : (MAP[px] ?? px);
```
Semua tabel di bawah menuliskan ukuran **prototype**; implementasi selalu memanggil `fs()`. Lebar elemen yang memuat teks kecil (mis. lingkaran skor 35 px, chip) harus tetap fleksibel (`minWidth`, `paddingHorizontal`) agar tidak terpotong setelah font membesar.

### 2.3 Gaya teks

| Nama | Family / weight | Ukuran (proto) | Line-height | Letter-spacing | Warna | Dipakai |
|---|---|---|---|---|---|---|
| `h1Intro` | Manrope 800 | `clamp(37, 10vw, 45)` → `min(45, max(37, width*0.10))` | ×1.02 | −2.5 | ink | Explore H1 |
| `h1Page` | Manrope 800 | 38 | ×1.04 | −2.1 | ink | Talent/Inbox |
| `h1Hero` | Manrope 700 (default bold) | 28 | – | −1.4 | ink | "Candidate evidence" |
| `h1Account` | Manrope 700 | 23 | – | −1 | ink | Nama di Profile |
| `h3Section` | Manrope 700 | 18 | – | −0.6 | ink | Heading section analysis |
| `h3Feed` | Manrope 700 | 17 | – | −0.5 | ink | "Verified project feed" |
| `h2Identity` | Manrope 700 | 17 | – | −0.6 | ink | Nama di profile card |
| `h3Profile` | Manrope 700 | 16 | – | −0.5 | ink | "Recruitment workspace" |
| `titleCard` | Manrope 700 | 14 | – | −0.4 | ink | Nama proyek, h4 score |
| `body` | Manrope 400 | 12 | ×1.55 | 0 | ink | Bio |
| `bodyIntro` | Manrope 400 | 13 | ×1.6 | 0 | muted | Intro copy |
| `bodyPage` | Manrope 400 | 12 | ×1.6 | 0 | muted | Deskripsi halaman |
| `caption` | Manrope 400–700 | 7–10 | ×1.5–1.6 | 0 | muted | Deskripsi kartu |
| `eyebrow` | DM Mono 500 | 10 | – | 1.8 | greenText | Label atas H1 |
| `eyebrowSm` | DM Mono 500 | 8 | – | 1.8 | greenText | Section label, "CANDIDATE MATCH" |
| `mono7` | DM Mono 500 | 7 | – | 0–1 | muted/green | Counter, badge |
| `mono6` | DM Mono 500 | 6 | 0.4–0.8 | – | green / `greenStrong` | Badge kecil |

Satu aturan: **eyebrow & label huruf besar** ditulis uppercase di data (jangan mengandalkan `textTransform`).

---

## 3. Komponen — Spesifikasi Detail

Notasi: `p` = padding, `r` = radius, `gap`, `bd` = border (`1` = 1 px `line` bila tak disebut), `h`/`w` = tinggi/lebar.

### 3.1 TopBar
- `h72`, `px22`, bawah `bd 1 line`, bg `topbarBg`, row `space-between`, `align center`, `zIndex 5`.
- **Brand** (`gap10`): `brandMark` 37×37, `r11`, bg `accent`, ikon GitHub 25 warna `onAccent`, **rotate −4°**. Teks `git` Manrope 800/18, `ls −0.8`, ink; `scope` weight 500, warna `muted`.
- **Kanan** (`gap10`): `LIVE DATA` = row `gap5`, DM Mono 7, muted, titik 6×6 bulat `accent` + ring luar 3 px `accentSoft` (View bertumpuk atau `borderWidth:3 borderColor:accentSoft`). Tombol tema 39×39, `r12`, `bd 1 line`, bg `surface`, ikon moon 20.

### 3.2 FloatingTabBar
- Absolute: `left12 right12 bottom max(12, inset)`, `h72`, `px10`, row `space-around`, bg `nav`, `r20`, `shadowNav`, `zIndex 10`.
- Item: `minWidth62`, `h52`, kolom center, `gap3`; ikon 20; label Manrope 700/8 (`fs`). Warna tidak aktif `navInactive`, aktif `accent`.
- **Nav dot** (Inbox): absolute `top6`, `right14`, 6×6 bulat `accent`, `bd 1 nav`.
- Tidak ada indikator pill/underline; perubahan hanya warna.

### 3.3 Search Box & Chip pencarian
- Search: lihat HardShadowBox §1.6. Ikon search 21 warna ink. Input `flex1`, 13, warna ink, placeholder `muted`.
- Tombol kanan 42×42, `r11`, bg `accent`, ikon 18–19 warna `#0d1c12` (ikon `close` 18 saat ada query, `filter` 19 saat kosong).
- **Search examples**: row horizontal scroll, `gap5`, `mt11`, `mb16`, `mx1`. Label "Try:" 8 muted. Chip: `p 4×7`, `r6`, bg `accentSoft`, teks DM Mono 7 `greenText`.

### 3.4 Feed Filters (kartu)
- Kartu `p13`, `bd`, bg `surface`, `r15`, `mb24`.
- Baris 1 (`mb10`, `space-between`): kiri ikon filter 14 + "Quick filters" Manrope 800/9; kanan **recent-toggle**: row `gap5`, `p 5×7`, `bd line`, `r7`, bg `paper`, teks muted 7, titik 5×5 muted.
  - *Aktif*: teks `greenStrong`, border `accent`, bg `accentSoft`, titik `accent` + ring 2 px `recentDotRing`.
- Role chips (horizontal scroll, `gap5`): `p 6×9`, `bd line`, `r8`, teks muted 7, transparan. *Aktif*: bg `accent`, border `accent`, teks `onAccent`, weight 800.
- Select lokasi (`mt9`): `h34`, `px9`, row `gap7`, ikon location 14 muted, `bd line`, bg `paper`, `r9`; teks nilai 8 ink. **Implementasi RN:** `Pressable` + `SelectSheet` (modal kecil berisi daftar opsi; baris terpilih ditandai ikon check hijau). Jangan pakai picker bawaan OS agar gaya konsisten.

### 3.5 Feed Heading
Row `space-between`, `align flex-end`, `mb11`. Kiri: label DM Mono 7 `greenText` `ls0.7`; judul 17 (`mt3`). Kanan: `{n} PROJECTS` DM Mono 7 `muted`.

### 3.6 ProjectCard
- Container: `p15`, `bd`, bg `surface`, `r18`, `shadowCard`, `overflow hidden`, `position relative`. Pita kiri: absolute `left0 top0`, 4×70, `accent`.
- Gap antar kartu: **12**.
- **Top row** (`mb13`, row center): rank DM Mono 9 warna `line`, `mr8`; badge `VERIFIED ACTIVE` row `gap3`, `p 4×6`, `r5`, bg `accentSoft`, teks DM Mono 6/700 `ls0.4` `greenStrong`, ikon check 11; **feed-score** `ml auto`, 35×35 bulat, `bd 1 scoreCircleBorder`, kolom center: angka Manrope 700/11 `greenStrong`, label `AUTH` DM Mono 4 (→ `fs`).
- **Title row** (`gap10`, `align flex-start`): folder 39×39 `r11` bg `accentSoft`, ikon repo 21 `greenStrong`, **rotate −2°**; kolom: judul 14 (`mb4`), deskripsi muted 8 / lh ×1.55.
- **Stack chips** (`wrap`, `gap5`, `my12`): `p 4×7`, `r6`, `bd line`, bg `paper`, DM Mono 6 muted. Chip role: bg `accent`, border `accent`, teks `onAccent`, weight 700.
- **Proof row**: row center `gap8`, `p9`, bg `paper`, `r9`, teks 7 muted. Item 1 "✓ Original work" `greenText` weight 700 (ikon check 12); item 2 link `ml auto` `greenText` + titik 5 `accent` + teks `demo`; item 3 ikon star 12 + `compactNumber(stars)`.
- **Developer row**: `mt12`, `pt11`, `bt 1 line`, row center `gap8`.
  - `developer-info` (Pressable `flex1`, row `gap8`): avatar 36×36 `r10`, online dot 9×9 di kanan-bawah (`right −1, bottom −1`, `bd 2 surface`, `accent`); kolom: nama Manrope 700/9 (1 baris ellipsis), `@login · lokasi` 6 muted, availability 6 `greenText` weight 700 (`mt2`).
  - `analyze-button`: `minWidth71`, `h32`, `r8`, bg `accent`, teks Manrope 800/7 `onAccent`, row center `gap4`, ikon arrow 14. Saat loading: spinner 13×13 (§5.2).

### 3.7 Empty State (feed)
`p 34×20`, kolom center, `bd 1 dashed line`, `r16`. Ikon: kotak 45×45 `r13` bg `accentSoft` ikon search 24 `greenText`, `mb9`. Judul Manrope 700/12; teks 8 muted `my 4/12`; tombol "Reset filters" `p 7×10`, `r7`, bg `accent`, 7/800 `onAccent`.

### 3.8 Analysis — header & ProfileCard
- **Back**: `mt −5`, `mb17`, row `gap5`, teks Manrope 700/8 muted, ikon arrow 16 `rotate 180°`.
- **Hero** (`mb18`): label DM Mono 7 `ls1` `greenText`; `h1Hero` (`my4`); deskripsi 9 muted.
- **ProfileCard**: `p20`, `bd`, bg `surface`, `r20`, `shadowProfile`, overflow hidden. Aksen kiri absolute 5 px penuh tinggi `accent`.
  - Main row (`gap13`, center): avatar 61×61 `r17` `bd line` + online dot 15×15 (`bd 3 surface`, `right −2 bottom −2`); identity `flex1`: label `CANDIDATE MATCH` (DM Mono 8 `ls1.8`, `mb3`), nama 17 ellipsis, `@login` 11 muted; **bookmark** 35×35 `r10` `bd line` bg `surface` ikon 17 muted. *Aktif*: ikon `greenStrong`, border `accent`, bg `accentSoft`.
  - Bio: `mt17 mb12`, 12 / ×1.55.
  - Tag row (`wrap gap5 mb12`): chip `p 4×7`, `r6`, `bd line`, bg `paper`, Manrope 700/7 muted. Chip "Open to work": row `gap5`, teks `greenStrong`, bg `accentSoft`, border transparan, titik 5 `accent`.
  - Meta (`wrap gap12 mb18`, teks 10 muted, ikon 15, `gap5`).
  - CTA: grid 2 kolom `gap8`, `mt15`, `pt14`, `bt 1 line`; tombol `h37`, `r9`, row center `gap6`, 9/700. Primer: bg ink, teks/ikon `surface`. Sekunder: bg `surface`, `bd line`, teks ink. Ikon message/download 16.

### 3.9 SectionHeading (dipakai berulang)
Row `space-between`, `align flex-end`, `mt27`, `mb13`, `mx1`. Kiri: label DM Mono 8 `ls1.8` `greenText` (`mb3`); judul 18. Kanan salah satu dari:
- `mono-note`/`confidence`: DM Mono 7 muted.
- `verified-label`: row `gap3`, `p 4×6`, `r5`, bg `accentSoft`, teks DM Mono 7 `greenStrong`, ikon check 11.
- link "View all" Manrope 700/10 muted + arrow 15 `gap4`.

### 3.10 SkillCard
`p16`, `bd`, bg `surface`, `r17`.
- Role summary (`pb14`, `bb 1 line`, row `gap11`, center): ikon box 39×39 `r11` bg `accentSoft` ikon chart 20 `greenStrong`; kolom: label DM Mono 6 `ls0.8` `greenText`, role Manrope 700/13 (`my2`), teks 7 muted.
- Language breakdown (`my14`, `gap10`): per baris label (8) kiri + persen DM Mono kanan, `mb5`; **ProgressBar** `h5`, track `paper`, `r5`, isi `accent` lebar `{value}%`.
- Frameworks: row wrap `gap5`; chip `p 4×7`, `r6`, `bd line`, DM Mono 7 ink. Chip terakhir (`+3 tools`) muted + **border dashed**.

### 3.11 ScoreCard (kartu hijau)
Row center `gap16`, `p17`, bg `accent`, `r17`, teks `onAccent`.
- **ScoreRing** 82×82. Implementasi `react-native-svg` (pengganti `conic-gradient`):
  - `Svg 82×82`, `Circle r=36 cx=41 cy=41 strokeWidth=11` track `ringTrack`; `Circle` kedua stroke `#111612`, `strokeDasharray = [C*pct, C]`, `C = 2π·36`, `pct = authenticity/100`, `strokeLinecap="butt"`, rotasi −90° dari atas (`transform="rotate(-90 41 41)"`).
  - Lubang tengah: lingkaran 65×65 warna `accent` (ring tebal ≈ 8,5 px) — samakan dengan prototype: stroke di radius ≈ 36, lebar ≈ 8.5 → gunakan `r=36.25`, `strokeWidth=8.5` agar tepi dalam 32.5 (=65/2).
  - Teks tengah: angka Manrope 700/25 `ls −1` + "/100" 8, sebaris baseline.
- Copy: label DM Mono 7 `ls1`; `h4` 14 (`my4`); paragraf 8 / ×1.5.

### 3.12 MetricGrid
Grid 2 kolom, `gap8`, `mt8`. Tiap sel: `p13`, `bd`, bg `surface`, `r13`. Label: row `gap4` ikon 13 + teks Manrope 700/7 `greenText`; nilai Manrope 700/13 (`mt6 mb1`); sub 7 muted.

### 3.13 Heatmap
Kartu `p16`, `bd`, `surface`, `r17`.
- Grid: **12 kolom × 7 baris**, sel 7×7, `gap3`, `r2`, aliran per **kolom** (index i → kolom `floor(i/7)`, baris `i%7`).
- Level sel: `level = (i*7 + (i%5)) % 5` → warna `heat0..heat4`.
- Footer (`mt11`, `space-between`, 7 muted): kiri `Less` ▪(line) ▪(`heat2`) ▪(`heat4`) `More` (sel 7×7, `gap3`); kanan "+18% vs last year" `greenText` weight 700.
- Mode opsional `HEATMAP_FULL_WIDTH` (D8): hitung `cell = (innerWidth − 11*3)/12`.

### 3.14 VerifiedRepoCard
`p14`, `bd`, `surface`, `r15`, gap antar kartu **9**.
- Head (row `gap10`, start): ikon box 31×31 `r9` bg `accentSoft` ikon repo 17 `greenText`; `flex1`: nama Manrope 700/11, deskripsi 8 muted **1 baris ellipsis**; pill skor 30×30 bulat, bg `accentSoft`, teks DM Mono 8/700 `greenStrong`. Varian fork: teks `warnText`, bg `warnBg`.
- Badges (`wrap gap5`, `my11`): sama seperti tag chip (§3.8) + ikon check 10 / titik 5 `accent` untuk "Live demo".
- Actions: `pt10`, `bt 1 line`, row `space-between`: kiri "View evidence" 8/700 `greenText`; kanan tombol transparan muted 8, ikon message 13, `gap4`.

### 3.15 Talent — Segmented (TripleTabs)
Grid 3 kolom, `p4`, bg `tabsTrack`, `r13`, `mb15`. Tombol `h37`, `r9`, 9/700 muted. *Aktif*: teks ink, bg `surface`, `shadowTab`.

### 3.16 FilterPanel
`p15`, `bd`, `surface`, `r16`.
- Title row (`mb12`): kiri ikon filter 16 + "Smart filters" 11/800; kanan "Reset" 8/700 `greenText`.
- Role chips: `p 7×9`, `bd line`, bg `paper`, `r8`, 8 muted. Aktif: bg/border `accent`, teks `onAccent`, 700.
- Slider block (`mt15`): label "Minimum authenticity" 8 muted kiri; nilai `{n}+` DM Mono 9 ink kanan; slider tinggi track 4, `minimumTrackTintColor=accent`, `maximumTrackTintColor=line`, thumb `accent`, range 70–95 step 1.
- Tag statis (`mt11`, row `gap5`): chip `p 5×7`, `bd 1 dashed line`, `r7`, 7 muted.

### 3.17 CandidateCard
- Results heading: `mt22 mb10 mx1`; kiri `{n} strong matches` 13/700; kanan "Best fit first" DM Mono 7 muted. Gap kartu **8**.
- Kartu: `p13`, `bd`, `surface`, `r15`, grid 2 kolom (`1fr auto`).
  - Main (row `gap10`): avatar 46×46 `r12`; kolom: nama 11/700 ellipsis, `@login · lokasi` 7 muted, `{role} · {language}` 8/700 `greenText` (`mt4`).
  - Skor: 43×43 bulat bg `accentSoft`, angka 13/700 `greenStrong`, "AUTH" DM Mono 5.
  - Footer span 2 kolom (`mt11`, `pt9`, `bt 1 line`, row `space-between`): kiri titik 6 `accent` + ring 3 `accentSoft` + availability 7 muted; kanan tombol **Compare**: `p 5×8`, `bd line`, `r7`, 7 muted. *Selected*: teks `greenStrong`, border `accent`, bg `accentSoft`.

### 3.18 Pipeline
- Summary: grid 3, `gap7`, `mb20`; sel `p 12×5`, kolom center, `bd`, `surface`, `r12`; angka 18/700, label 7 muted.
- Stage (`mb18`): head row `gap7`, `mb7`, DM Mono 7 muted (teks uppercase) + counter 18×18 `r5` bg `line` teks ink 7/700.
- Person row: `p11`, `gap9`, `mb6`, `bd`, `surface`, `r13`; avatar 38×38 `r10`; nama 10/700, `{role} · Score {score}` 7 muted; tombol 31×31 `r9` bg `accentSoft` ikon message 15 `greenStrong`.

### 3.19 Compare
- Header: `p13`, bg `accent`, `r13`; label DM Mono 7, teks 9 (`mt3`), warna `onAccent`.
- Grid 2 kolom `gap8`, `mt9`. Kartu: `pt16 px10 pb11`, kolom center, `bd`, `surface`, `r15`, `position relative`.
  - Tombol ✕: absolute `top7 right7`, 24×24 `r7`, bg `paper`, ikon close 13 muted.
  - Avatar 50×50 `r14`; nama 10/700 (`mt7`, ellipsis); role 7 muted (tinggi min 22).
  - Skor: DM Mono 22/800 + "/100" 7 muted weight 500, margin `7/10`.
  - Daftar (lebar penuh): baris `py7`, `bt 1 line`; label 6 muted; nilai 8/700 ellipsis `mt2`.
  - Contact: `h31`, `mt9`, `r8`, bg `accent`, 7/800 `onAccent`, ikon message 14, `gap4`.
- **Add candidate**: `minHeight240`, kolom center `gap7`, `bd 1 dashed line`, `r15`, ikon plus 20, teks 8 muted.

### 3.20 Inbox
- Page title **compact**: `mb20` (default `mb23`).
- **AvailabilityCard**: row `space-between`, center, `p13`, bg `accent`, `r14`. Kiri: titik 6 `onAccent` + "YOUR STATUS" DM Mono 7. Kanan: select `maxWidth154`, `p 7×9`, bg `onAccentGlass`, `r8`, 8/700 (pakai `SelectSheet`).
- Heading messages: `mt22 mb10`; "Messages" 13/700; "3 unread" DM Mono 7 muted.
- List: `bt 1 line`. Baris: `p 12×1`, row `gap10`, center, `bb 1 line`.
  - Avatar 47×47 `r14`; dot 11×11 (`bd 2 paper`).
  - Kolom `flex1`: baris nama 10/700 + waktu 7 muted weight 500 kanan; chip label (DM Mono 6 `greenText`, bg `accentSoft`, `p 2×5`, `r4`, `my3`); preview 8 muted 1 baris ellipsis.
  - Badge unread 17×17 bulat bg `accent`, teks 7/700 `onAccent`.
- **NetworkCard**: `mt22`, `p15`, row center `gap10`, bg `ink`, `r15`, teks `surface`. Ikon box 40×40 `r11` bg `accent` ikon users 20 `onAccent`; kolom: label DM Mono 6 `accent`, judul 10/700, deskripsi 7 `networkCardMuted`; tombol 30×30 `r8`, `bd 1 networkBtnBorder`, ikon arrow 17.

### 3.21 Profile
- **Cover**: `h115`, `p15`, row `space-between`, `align flex-start`, bg `accent`, `r18`, **pola titik**: grid titik Ø1 px warna `coverDot` tiap 12 px (render dengan `react-native-svg` `<Pattern>` atau gambar tile 12×12; jangan loop ratusan View). Kiri teks DM Mono 9 `{ recruiter_mode: true }`; kanan badge `PRO WORKSPACE`: `p 5×7`, `r7`, bg `rgba(255,255,255,.55)`, DM Mono 6.
- **Intro** (`mt −44`, center): avatar 86×86, `p4`, bg `paper`, `r25`, gambar `r21`, dot 16×16 (`bd 3 paper`, `right0 bottom5`); badge `TALENT SCOUT` `p 3×7`, `r5`, bg `accentSoft`, DM Mono 7 `ls1` `greenStrong`; nama 23 (`mt7 mb1`); `@login · GitHub connected` 9 muted.
- **Stats**: grid 3, `mt20 mb25`, `py15`, border atas & bawah `line`, sel dengan pemisah kanan `bd 1 line` (kecuali terakhir); angka 16/700, label 8 muted.
- **Section title**: `mb11`, row `space-between`; judul 16; "TOOLS" DM Mono 8 muted.
- **SettingsList**: `bd`, bg `surface`, `r16`, `overflow hidden`, `mb18`. Baris: `p12`, row center `gap10`, pemisah bawah `line` (kecuali terakhir). Ikon box 34×34 `r10` bg `accentSoft` ikon 18 `greenText`; judul 10/700 + sub 8 muted (`mt2`); kanan ikon arrow 17 — atau **Switch** (baris Appearance).
  - **Switch** 36×20, `p2`, `r12`, bg `line`; knob 16×16 putih bulat; aktif: bg `accent`, knob `translateX 16` (anim 200 ms).
- **GitHub connect card**: row center `gap10`, `p14`, bg ink, `r15`, teks `surface`; ikon GitHub 27; judul 10/700, sub 8 `githubCardMuted`; pill `ACTIVE`: row `gap4`, `p 5×6`, `r6`, bg `connectedPillBg`, teks DM Mono 6 `accent`, titik 5 `accent`.
- **Trust note**: `mt11`, `p12`, row `gap9`, `bd 1 dashed line`, `r12`, ikon check 16 `greenText`; teks 8 muted ×1.5 dengan judul tebal 9 ink (baris sendiri).
- **Version**: `mt19`, center, DM Mono 7 muted `ls1`.

### 3.22 ChatSheet
- Overlay absolute `inset 0`, `zIndex 30`, `justify flex-end`. Backdrop `Pressable` `backdrop` (+ `BlurView` intensity ~12 opsional).
- Sheet: tinggi **74%**, `r 25 25 0 0`, bg `paper`, `shadowSheet`. Animasi masuk 250 ms `ease-out`: `translateY` dari 30% tinggi → 0, opacity 0 → 1. Keluar: kebalikan 200 ms. Dukung swipe-down menutup (opsional).
- Handle 36×4 `r4` `line`, margin vertikal 8, center.
- Header: `px17`, `pt5 pb12`, `bb 1 line`, row `space-between`. Kiri avatar 39×39 `r11` + nama 11/700 + "● Online now" 7 muted (titik 5 `accent`). Kanan tombol tutup 31×31 `r9` `bd line` bg `surface` ikon close 18 muted.
- **Project context** (jika ada): margin `10/14/0`, `p10`, row center `gap9`, `bd`, `surface`, `r12`. Ikon repo box 31×31 (`repo-icon`), label `DISCUSSING PROJECT` DM Mono 6 `greenText`, nama 9/700; lingkaran skor 27×27 `accentSoft` teks 8/800 `greenStrong`.
- **Messages**: `flex1`, scroll, `p14`, `gap8`. Label waktu center DM Mono 6 muted. Bubble: `maxWidth 79%`, `p 9×11`, 9 / ×1.5.
  - Masuk: bg `surface`, `bd line`, radius `4,12,12,12` (kiri-atas 4), rata kiri.
  - Keluar: bg `accent`, teks `onAccent`, radius `12,4,12,12` (kanan-atas 4), rata kanan, centang ganda kanan-bawah (ikon check 11 ×2, overlap −7, opacity .6).
  - Auto-scroll ke bawah saat pesan baru.
- **Composer**: margin `0/12/12`, `pl12 pr5 py5`, row center `gap6`, `bd`, bg `surface`, `r13`; input 10 ink, placeholder `Tulis pesan...`; tombol kirim 37×37 `r9` bg `accent` ikon send 18 `onAccent`. `KeyboardAvoidingView` (iOS `padding`, Android `height`) di dalam sheet.

### 3.23 Toast
Absolute, center horizontal, `bottom: tabBarBottom + 72 + 11` (≈ 95 + inset), `maxWidth: screen − 36`, `p 10×13`, row center `gap7`, bg `accent`, `r10`, `shadowToast`, teks 9/700 `onAccent`, ikon check 16. Masuk 200 ms (`translateY 8 → 0`, opacity 0 → 1); hilang otomatis 2200 ms. `zIndex 50` (di atas chat sheet).

### 3.24 Loader (spinner)
Lingkaran 17×17 (13×13 di tombol Analyze), `bw 2`, border `ink` alpha .25 dengan **sisi atas** `ink` penuh, rotasi 360° tiap **700 ms linear** tak terbatas.

### 3.25 Avatar
Komponen `Avatar({uri, size, radius, dot?})`. Gagal muat → kotak `accentSoft` dengan inisial (huruf pertama nama, Manrope 800, warna `greenStrong`). Dot online: lingkaran `accent` + border warna latar kartu induk.

### 3.26 SelectSheet (pengganti `<select>`)
Modal tengah-bawah kecil: bg `surface`, `r16`, `bd line`, `p6`; baris `h44`, `px12`, teks 11 ink; baris terpilih bg `accentSoft` + ikon check 14 `greenStrong` di kanan. Backdrop sama dengan chat. Animasi fade+slide 180 ms.

---

## 4. Layout Layar (urutan vertikal)

**Explore — Feed:** TopBar → [scroll: Intro → SearchBox → SearchExamples → (error) → FeedFilters → FeedHeading → ProjectCard ×n / EmptyState] → TabBar.
**Explore — Analysis:** Back → Hero → ProfileCard → Section(Role intelligence)+SkillCard → Section(Project validation)+ScoreCard+MetricGrid → Section(Contribution activity)+Heatmap → Section(Verified projects)+RepoCard ×≤3.
**Talent:** PageTitle → TripleTabs → [Discover: FilterPanel → ResultsHeading → CandidateCard ×n] | [Pipeline: Summary → Stage ×3] | [Compare: Header → Grid].
**Inbox:** PageTitle(compact) → AvailabilityCard → Messages heading → ConversationList → NetworkCard.
**Profile:** Cover → Intro(avatar overlap) → Stats → SectionTitle → SettingsList → GithubConnect → TrustNote → Version.

Padding konten semua layar: `paddingHorizontal 20`; `paddingBottom 116 + insets.bottom`.

---

## 5. Motion

| Nama | Durasi / easing | Efek |
|---|---|---|
| `view-in` (Analysis muncul) | 250 ms ease | `translateX 12 → 0`, `opacity 0 → 1` (Stack `animation: 'slide_from_right'` + fade internal) |
| `sheet-in` (ChatSheet) | 250 ms ease-out | `translateY 30% → 0`, `opacity 0 → 1` |
| `toast-in` | 200 ms ease | `translateY 8 → 0`, `opacity 0 → 1` |
| `spin` | 700 ms linear ∞ | rotate 360° |
| Switch knob | 200 ms | `translateX 0 ↔ 16` |
| Tombol tekan | – | `opacity 0.85` saat pressed (prototype memakai `-webkit-tap-highlight-color: transparent`; tidak ada ripple). Android: nonaktifkan `android_ripple`. |
| Kartu `hover` | – | **Tidak ada di native**. |

`pulse` (1.5 s) ada di CSS tetapi tidak dipakai — abaikan.

---

## 6. Ringkasan Radius per Komponen

| Radius | Komponen |
|---|---|
| 2 | Sel heatmap |
| 4 | Chip label percakapan; ujung bubble chat |
| 5 | Badge kecil (VERIFIED, ACTIVE label), counter stage, progress |
| 6 | Chip stack/tag/framework |
| 7 | Recent toggle, tombol Compare, tombol Reset empty |
| 8 | Role chips, tombol Analyze, tombol Compare-message, select inbox |
| 9 | Tombol CTA profil, ikon repo, proof row, tombol tutup chat |
| 10 | Avatar feed, tombol bookmark, ikon setting, avatar pipeline |
| 11 | Brand mark, folder proyek, ikon role, tombol cari, ikon network |
| 12 | Tombol tema, avatar kandidat, summary pipeline, trust note, project context |
| 13 | Metric cell, pipeline person, composer, empty icon |
| 14 | Availability card, avatar percakapan |
| 15 | Search box, filter card, repo card, candidate card, compare card, network card, github card |
| 16 | Empty state, filter panel, settings list |
| 17 | Skill card, heatmap card, score card, avatar profile |
| 18 | Project card, cover profile |
| 20 | Profile card, tab bar |
| 25 | Sheet chat (atas), avatar account |

---

## 7. Ikon (react-native-svg)

Semua ikon: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"` (di RN: prop `color` → `stroke`), `strokeWidth=1.8`, `strokeLinecap="round"`, `strokeLinejoin="round"`, ukuran default 20. Ikon `github` memakai `fill=currentColor` dan `stroke="none"`.

```tsx
import Svg, { Path, Circle, Rect } from "react-native-svg";

export type IconName = "search"|"moon"|"location"|"star"|"repo"|"home"|"users"|"history"|"arrow"|"github"|
  "message"|"briefcase"|"download"|"filter"|"check"|"send"|"bookmark"|"chart"|"plus"|"close";

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const paths: Record<IconName, React.ReactNode> = {
    search: <><Circle cx="11" cy="11" r="7" /><Path d="m20 20-4-4" /></>,
    moon: <Path d="M21 15.3A9 9 0 1 1 8.7 3a7 7 0 0 0 12.3 12.3Z" />,
    location: <><Path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><Circle cx="12" cy="10" r="2.5" /></>,
    star: <Path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z" />,
    repo: <><Path d="M5 3h11a2 2 0 0 1 2 2v16H6a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2Z" /><Path d="M6 17h12M8 7h6" /></>,
    home: <><Path d="m3 11 9-8 9 8" /><Path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    users: <><Circle cx="9" cy="8" r="4" /><Path d="M2 21a7 7 0 0 1 14 0M16 4.5a4 4 0 0 1 0 7.5M17 15a6 6 0 0 1 5 6" /></>,
    history: <><Path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><Path d="M3 3v5h5M12 7v5l3 2" /></>,
    arrow: <Path d="M5 12h14m-5-5 5 5-5 5" />,
    github: <Path fill={color} stroke="none" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.9c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8a9.4 9.4 0 0 1 2.5.34c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />,
    message: <Path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    briefcase: <><Rect x="3" y="7" width="18" height="13" rx="2" /><Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></>,
    download: <><Path d="M12 3v12m-5-5 5 5 5-5" /><Path d="M5 21h14" /></>,
    filter: <Path d="M4 5h16M7 12h10m-7 7h4" />,
    check: <Path d="m5 12 4 4L19 6" />,
    send: <><Path d="m22 2-7 20-4-9-9-4Z" /><Path d="M22 2 11 13" /></>,
    bookmark: <Path d="M6 3h12v18l-6-4-6 4Z" />,
    chart: <Path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
    plus: <Path d="M12 5v14M5 12h14" />,
    close: <Path d="m6 6 12 12M18 6 6 18" />,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" {...common}>{paths[name]}</Svg>;
}
```
Peta ikon: tab Explore=`home`, Talent=`users`, Inbox=`message`, Profile=`briefcase`; tema=`moon`; bookmark=`bookmark`; kirim=`send`; export=`download`; panah kembali = `arrow` dirotasi 180°.

---

## 8. Dark Mode — Aturan

- Hanya token di §1.1 yang berubah. Warna tetap (§1.2) **tidak** diubah di dark.
- Tab bar di dark menjadi **terang** (`#f0f4ef`) dengan teks gelap; item aktif tetap `accent`.
- Kartu bertema gelap (GitHub connect, Network card) memakai `ink` sebagai background → di dark berwarna terang (`#f3f7f2`) dengan teks `surface` (gelap). Pastikan kontras (teks `surface` di atas `ink`).
- Status bar: `light` di dark, `dark` di light.
- Transisi tema instan (tanpa animasi).

---

## 9. Responsif & Safe Area

- Konten `maxWidth: 430`, center di layar yang lebih lebar.
- `paddingTop` TopBar = `insets.top`; tab bar `bottom = max(12, insets.bottom)`.
- Layar kecil (≤ 360): kurangi `h1Intro` ke minimum 37 (sudah lewat `clamp`), chip dan baris scroll horizontal tidak diubah.
- Layar pendek (≤ 667): sheet chat tetap 74% tetapi minimal 420 dp.
- Landscape tidak didukung (portrait lock).

---

## 10. Aset

| Aset | Spesifikasi |
|---|---|
| App icon | 1024×1024, latar `#2dd86f`, glyph GitHub `#101510` ±58% lebar, miring −4° (selaras brand mark) |
| Adaptive icon (Android) | Foreground glyph tanpa latar, background `#2dd86f` |
| Splash | Latar `#111612`, brand mark 96×96 di tengah |
| Favicon web | Kotak hijau + glyph (lihat `public/favicon.svg` di file Figma Make) |
| Avatar | Remote `https://github.com/{login}.png`, ukuran diminta via `?size=128` untuk hemat bandwidth |

---

## 11. Checklist Kemiripan Visual (QA)

- [ ] Warna `#2dd86f`, `#111612`, `#f4f6f1`, `#dce1da` identik di light; palet dark sesuai §1.1.
- [ ] Brand mark miring −4°; ikon folder proyek miring −2°.
- [ ] Search box memiliki hard-shadow 4/4 (berubah hijau saat fokus).
- [ ] H1 "work." memiliki highlight hijau 30% di bawah teks.
- [ ] Project card memiliki pita hijau kiri 4×70 dan rank `01…04`.
- [ ] Lingkaran skor kecil (35/43) dan ScoreRing (82) tampil benar untuk nilai 73, 90, 96.
- [ ] Heatmap 12×7 dengan pola level deterministik (§3.13).
- [ ] Tab bar melayang, pil gelap, titik hijau pada Inbox.
- [ ] Chat sheet 74% dengan bubble berbentuk "ekor" (radius 4 di satu sudut).
- [ ] Toast hijau di atas tab bar, hilang 2,2 dtk.
- [ ] Semua teks mono (DM Mono) memakai letter-spacing sesuai tabel §2.3.
- [ ] Tidak ada teks terpotong pada 375 px; tidak ada konten tertutup tab bar.
