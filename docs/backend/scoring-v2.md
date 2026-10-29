# Dokumentasi Scoring Engine v2 (`scoring-v2`)

Dokumentasi matematis dan spesifikasi algoritma perhitungan skor keaslian developer (Fase BE-2, PRD V2 §9).

---

## 1. Komponen Penilaian (Total Maksimal 100)

Scoring v2 dieksekusi secara **murni (*pure function*)** dan sepenuhnya deterministik berdasarkan fakta publik yang disanitasi:

| Komponen | Bobot Maksimal | Rumus Perhitungan v2.0 |
|---|---|---|
| **Originality** | 30 | `round(30 × nonForkRatio)` atas maksimal 30 repositori aktif (non-archived). `nonForkRatio = nonFork / total`; jika `total = 0`, skor = 0. |
| **Activity & Recency** | 20 | **Recency (Maks 12):** `d` = hari sejak push terbaru pada repo aktif. Jika `d ≤ 30 → 12`; jika `d ≥ 365 → 0`; linear di antaranya.<br>**Minggu Aktif (Maks 8):** `8 × min(1, activeWeeks52 / 26)` dari kalender kontribusi (minggu dengan minimal 1 kontribusi). |
| **Proof** | 15 | Dari maksimal 5 repositori non-fork teratas (diurutkan berdasarkan keterbaruan push lalu bintang):<br>`round(15 × (jumlah dengan demo terverifikasi ATAU rilis ≥ 1) / min(5, n))`; jika `n = 0`, skor = 0. |
| **Substance** | 20 | Rata-rata kualitas teknis per repositori non-fork teratas (≤ 5):<br>`0,30 (README ≥ 200 B) + 0,25 (CI) + 0,25 (Test) + 0,10 (Lisensi Terbuka) + 0,10 (Ukuran ≥ 20 KB)`<br>Skor = `round(20 × rata-rata substance)`. |
| **Contribution Depth** | 15 | `raw = 3 × PRKeRepoOrangLain + 1 × Review + 0,5 × Issue` (dalam 12 bulan terakhir).<br>Skor = `round(15 × min(1, raw / 30))`. |

---

## 2. Penalti dan Pembatas Skor

1. **Penalti Pembuatan Repo Massal (*Burst Creation*):**
   - Jika terdeteksi ≥ 10 repositori dibuat dalam jendela waktu 24 jam berturut-turut, skor akhir dikenakan penalti **−10 poin** dan dicatat dalam daftar `evidence`.
2. **Pembatas Akun Baru (*New Account Cap*):**
   - Jika usia akun GitHub kurang dari 90 hari sejak tanggal pembuatan (`accountCreatedAt`), skor keaslian total **dibatasi maksimal 70** (meskipun skor mentah mencapai 90+).
3. **Ketiadaan Batas Palsu (v2 vs v1):**
   - Versi 2 **menghapus batas artifisial 98** yang ada pada v1. Skor 100 kini dapat diraih secara sah oleh profil dengan orisinalitas, aktivitas, dan bukti substansi yang sempurna.

---

## 3. Klasifikasi Tingkatan (*Tier*) & Indikator Keyakinan (*Confidence*)

### Klasifikasi Tier
- **High Tier:** `authenticity ≥ 85`
- **Medium Tier:** `65 ≤ authenticity ≤ 84`
- **Low Tier:** `authenticity < 65`

### Confidence Score (0–100)
Confidence mengukur kelengkapan data GitHub yang berhasil disampel (bukan nilai developer):
- Nilai awal: `100`
- Akun tidak memiliki repositori: `−40`
- Kueri repositori GraphQL gagal/parsial: `−35`
- Kalender kontribusi tidak tersedia: `−20`
- Akun memiliki ≥ 3 repo tetapi yang disampel < 3 repo: `−15`
- Verifikasi demo dilewati karena timeout: `−10`
- Minimum: `0`

---

## 4. Contoh Perhitungan Baku (Golden Test G1)

Skenario developer standar (teruji dalam `_fixtures/github/g1_facts.json`):
- **10 repositori aktif, 8 non-fork:**
  `Originality = round(30 × 8 / 10) = 24`
- **Push terbaru 10 hari lalu (`d = 10 ≤ 30`), `activeWeeks52 = 40`:**
  `Recency = 12`
  `Minggu Aktif = 8 × min(1, 40 / 26) = 8`
  `Activity = 12 + 8 = 20`
- **5 repo non-fork teratas: 3 memiliki demo terverifikasi atau rilis:**
  `Proof = round(15 × 3 / 5) = 9`
- **Substansi 5 repo teratas `[1,0; 0,75; 0,5; 0,5; 0,25]` (rata-rata 0,60):**
  `Substance = round(20 × 0,60) = 12`
- **PR ke repo lain = 6, Review = 4, Issue = 4:**
  `raw = 3(6) + 1(4) + 0,5(4) = 18 + 4 + 2 = 24`
  `Depth = round(15 × 24 / 30) = 12`
- **Total Skor Keaslian:** `24 + 20 + 9 + 12 + 12 = 77`
- **Tier:** `medium`

---

## 5. Transparansi & Kepatuhan Kebijakan AI (AIR-1, AIR-2, AIR-5)

- **AIR-1 (Transparansi):** Setiap respons menyertakan array `evidence[]` (maksimal 12 butir) yang menjelaskan alasan di balik skor, bukti repo unggulan, serta penalti atau pembatas yang diterapkan.
- **AIR-2 (Reprodusibilitas):** Versi skor (`scoreVersion = 2`) selalu dicatat. Objek `facts` mentah tersimpan di database sehingga evaluasi ulang dapat dilakukan di masa mendatang tanpa fetch ulang (`rescore(facts)`).
- **AIR-5 (Bebas Asumsi Diskriminatif):** Algoritma dilarang keras menyimpulkan atribut sensitif (gender, ras, usia, afiliasi) dari nama, avatar, atau isi bio. Lokasi hanya digunakan untuk normalisasi negara.
