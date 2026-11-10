# Audit Bias (AIR-4)

Status 10 Nov 2026: **v1 sudah dijalankan pada data sintetis.**
`bias_report_v1(threshold, min_group)` + `scripts/backend/bias-report-v1.ts`
menghasilkan impact ratio, interval kepercayaan, dan koreksi
Benjamini-Hochberg. Hasil lengkap: `docs/backend/evidence/bias-v1-2026-11-10.md`.
Ringkas: n=5200, scoring rate (skor >= 70) 60,9% (95% CI 59,5-62,2), 39
kelompok reportable, **1 adverse impact**: `NG` (impact ratio 0,42, 95% CI
0,31-0,57, q=2,5e-5) — grup yang memang sengaja digeser -14 di seed sebagai uji
positif. `MY` (p=0,024) tidak bertahan setelah koreksi BH (q=0,286). Ini
**bukan** bukti bias populasi nyata maupun klaim kualitas engineer.

## 1. Tujuan

Memberi sinyal awal apakah skor `authenticity` v2 berbeda sistematis antar
kelompok yang rentan, **tanpa** menampilkan identitas individu dan tanpa
mengklaim bahwa skor adalah ukuran kompetensi. Laporan ini juga **bukan** audit
diskriminasi: atribut terlindungi (sex/race/etnis) tidak dikumpulkan (AIR-5).

## 2. Kelompok yang diaudit

| Dimensi | Sumber | Catatan |
|---|---|---|
| Negara/wilayah | `profiles.country_code` | ISO2; `UNKNOWN` bila kosong |
| Bahasa utama | `analyses.primary_language` | `unknown` bila kosong |
| Role | `public.feed_role(analyses.inferred_role)` | `Front-End/Back-End/Mobile/Data` |

Analisis yang dipakai: **terbaru per login**, `score_version = 2`.

## 3. Metrik v1

Untuk setiap kelompok dan keseluruhan: `n`, median, **scoring rate** (proporsi
skor >= ambang, default **70**), dan Wilson 95% CI.

- **Impact ratio** = scoring rate grup / scoring rate grup acuan (grup
  reportable dengan rate tertinggi, sesuai konvensi 4/5). Interval Katz 95%
  pada skala log; koreksi 0,5 bila ada sel nol.
- **Uji** dua proporsi (pooled z) vs grup acuan; **q-value** dari
  Benjamini-Hochberg (FDR 5%) **per dimensi**.
- **Adverse impact**: q <= 0,05 **dan** impact ratio < 0,80. Indikator untuk
  tinjauan manusia, bukan bukti diskriminasi.
- **Ambang kelompok minimum: n >= 30** (naik dari 10 di v0). Kelompok di
  bawahnya dimasking tanpa statistik dan tidak dihitung.
- Tidak ada login, nama, avatar, atau `github_id` pada keluaran.

## 4. Batasan (wajib dibaca bersama hasil)

1. Skor v2 adalah sinyal keaslian/aktivitas publik GitHub, **bukan** ukuran
   kompetensi.
2. Data sintetis != populasi pengguna nyata; baseline sintetis hanya menguji
   mekanisme laporan, bukan bias dunia nyata.
3. Tanpa atribut terlindungi, impact ratio per sex/race tidak bisa dihitung —
   karena itu produk tidak boleh diposisikan sebagai AEDT di NYC (lihat
   `l2-review.md`).
4. Bahasa utama dan role berasal dari inferensi otomatis (AIR-5); kesalahan
   inferensi dapat mengaburkan perbedaan kelompok.
5. Interval dan q-value eksploratif; audit harus diulang pada data beta dengan
   `score_version` dan dataset yang dikunci, minimal kuartalan.

## 5. Cara menjalankan

```bash
# 1. Data (butuh Docker + Supabase lokal)
make up && make reset

# 2. >= 5.000 developer listed beranalisis sintetis (idempoten)
psql "$DATABASE_URL" -f supabase/seed/bench-talent.sql

# 3. Jalankan laporan v1 (service role; admin-only di RPC)
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=... \
deno run --allow-net --allow-env --allow-write scripts/backend/bias-report-v1.ts

# Output: docs/backend/evidence/bias-v1-<tanggal>.md
# Ambang opsional: BIAS_THRESHOLD=70 BIAS_MIN_GROUP=30
```

Seed `bench-talent.sql` memakai hash per atribut supaya negara/bahasa/role/skor
saling independen, dan sengaja menggeser satu grup (`NG`) -14 poin sebagai uji
positif untuk indikator.

## 6. v0 (arsip)

`bias_report_v0()` + `scripts/backend/bias-report.ts` (median per kelompok,
masking n < 10, tanpa uji) tetap ada untuk perbandingan; hasil
`docs/backend/evidence/bias-v0-2026-11-10.md`. Kelemahan v0 yang ditutup v1:
tidak ada impact ratio, interval kepercayaan, koreksi multiplisitas, dan ambang
n terlalu rendah.

## 7. Akses

`bias_report_v1()` dan `bias_report_v0()` hanya untuk klaim JWT
`app_metadata.role = 'admin'` atau `service_role`. Non-admin → `FORBIDDEN`
(pgTAP `13_be4_retention_bias.sql` dan `14_be4_bias_v1.sql`).
