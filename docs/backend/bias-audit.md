# Audit Bias v0 (AIR-4)

Status 10 Nov 2026: **SUDAH DIJALANKAN pada data sintetis.**
`bias_report_v0()` + `scripts/backend/bias-report.ts` dijalankan di Supabase
lokal dengan 5.200 skor sintetis; hasil lengkap di
`docs/backend/evidence/bias-v0-2026-11-10.md`. Ringkas: n=5200, mean 74,1,
median 74, p25 64, p75 84. Tidak ada kelompok yang median-nya berbeda > 10
poin dari keseluruhan, **kecuali** `NG` (median 62, -12) yang memang sengaja
digeser -14 di seed untuk membuktikan indikator tinjauan menyala. Kelompok
dengan n < 10 tampil sebagai `<10` tanpa statistik. Ini **bukan** bukti bias
populasi nyata maupun klaim kualitas engineer.

## 1. Tujuan

Memberi sinyal awal apakah skor `authenticity` v2 berbeda sistematis antar
kelompok yang dilindungi/rentan, **tanpa** menampilkan identitas individu dan
tanpa mengklaim bahwa skor adalah ukuran kompetensi.

## 2. Kelompok yang diaudit

| Dimensi | Sumber | Catatan |
|---|---|---|
| Negara/wilayah | `profiles.country_code` | ISO2; `UNKNOWN` bila kosong |
| Bahasa utama | `analyses.primary_language` | `unknown` bila kosong |
| Role | `public.feed_role(analyses.inferred_role)` | `Front-End/Back-End/Mobile/Data` |

## 3. Metrik

Untuk setiap kelompok dan keseluruhan:
`n`, rata-rata (`mean`), median, persentil 25 (`p25`), persentil 75 (`p75`)
dari `analyses.authenticity` (analisis **terbaru** per login, `score_version = 2`).

- **Ambang kelompok minimum: n ≥ 10.**
  Kelompok dengan `n < 10` dimasking menjadi `"<10"` tanpa statistik apa pun.
- **Tanda tinjau:** median kelompok berbeda **> 10 poin** dari median
  keseluruhan → perlu tinjauan manual. Ini indikator, bukan bukti diskriminasi.
- Tidak ada login, nama, avatar, atau `github_id` pada keluaran.

## 4. Batasan (wajib dibaca bersama hasil)

1. Skor v2 adalah sinyal keaslian/aktivitas publik GitHub, **bukan** ukuran
   kompetensi atau kualitas engineer.
2. Data sintetis ≠ populasi pengguna nyata. Baseline pada data sintetis hanya
   menguji **mekanisme** laporan (masking, agregasi), bukan bias dunia nyata.
3. Kelompok kecil sengaja tidak dilaporkan; ini mengurangi daya deteksi.
4. Bahasa utama dan role berasal dari inferensi otomatis (AIR-5); kesalahan
   inferensi dapat mengaburkan perbedaan kelompok.
5. Belum ada koreksi multiple comparisons; audit v0 bersifat eksploratif.

## 5. Cara menjalankan

```bash
# 1. Data (butuh Docker + Supabase lokal)
make up && make reset

# 2. >= 5.000 developer listed beranalisis sintetis (idempoten)
psql "$DATABASE_URL" -f supabase/seed/bench-talent.sql

# 3. Jalankan laporan (service role; admin-only di RPC)
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=... \
deno run --allow-net --allow-env --allow-write scripts/backend/bias-report.ts

# Output: docs/backend/evidence/bias-v0-<tanggal>.md
```

Seed `bench-talent.sql` memakai hash per atribut supaya negara/bahasa/role/skor
saling independen, dan sengaja menggeser satu grup (`NG`) -14 poin sebagai uji
positif untuk indikator tinjauan.

## 6. Akses

`bias_report_v0()` hanya untuk klaim JWT `app_metadata.role = 'admin'` atau
`service_role`. Non-admin → `FORBIDDEN` (pgTAP `13_be4_retention_bias.sql`).
