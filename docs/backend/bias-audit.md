# Audit Bias v0 (AIR-4)

Status 5 Nov 2026: **BELUM DIUJI / BELUM DIUKUR.**
Fungsi `bias_report_v0()` dan skrip `scripts/backend/bias-report.ts` sudah ada,
tetapi **belum dijalankan** karena tidak ada database lokal (Docker tidak aktif)
dan tidak ada data sintetis yang dimuat di lingkungan ini. Tidak ada angka pada
dokumen ini sampai `docs/backend/evidence/bias-v0-<tanggal>.md` dihasilkan dari
run nyata.

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
make bench-seed                 # >= 10 rb proyek sintetis

# 2. Tambahkan >= 5.000 developer listed beranalisis sintetis
#    (lihat scripts/backend/bench-discover.ts untuk pola seed)

# 3. Jalankan laporan (service role; admin-only di RPC)
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=... \
deno run --allow-net --allow-env --allow-write scripts/backend/bias-report.ts

# Output: docs/backend/evidence/bias-v0-<tanggal>.md
```

## 6. Akses

`bias_report_v0()` hanya untuk klaim JWT `app_metadata.role = 'admin'` atau
`service_role`. Non-admin → `FORBIDDEN` (pgTAP `13_be4_retention_bias.sql`).
