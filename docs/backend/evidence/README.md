# Berkas Bukti Backend (`docs/backend/evidence/`)

Direktori ini menyimpan **output mentah** verifikasi backend agar setiap angka
di laporan dapat ditelusuri. Tanpa token, email, atau kunci — pindai sebelum commit.

| Berkas | Isi | Cara mengulang |
|---|---|---|
| `prereq-<tanggal>.txt` | `docker info`, versi Supabase CLI/Deno, status port, ada-tidaknya `.env` | perintah di §1 prompt verifikasi |
| `deno-contracts-<tanggal>.txt` | `deno check contracts/src/*.ts` + `deno test contracts/tests/` | `deno check contracts/src/*.ts && deno test --allow-read --allow-env contracts/tests/` |
| `deno-functions-<tanggal>.txt` | `deno check` modul murni + `deno test` 4 berkas fungsi (offline) | perintah di berkas itu |
| `sql-static-<tanggal>.txt` | rencana pgTAP per berkas (total 41), idempotensi migrasi, rujukan silang | skrip python di prompt §2 (statis, tanpa DB) |
| `sql-drift-secret-<tanggal>.txt` | 17 tabel + 7 fungsi cocok migrasi↔types; secret scan bersih | skrip python di prompt §2 |
| `pgtap-<tanggal>.txt` | **output `make test-db` per berkas (rencana, ok, not ok)** — WAJIB dari run nyata | `make up && make reset && make test-db` (butuh Docker) |
| `smoke-<tanggal>.txt` | matriks S1–S9 §5 | `docs/backend/evidence/SMOKE-TEST.md` |
| `ingestion-live-<tanggal>.json` | data mentah live-bench (median/p95 dari berkas ini) | `scripts/backend/live-bench.ts` (butuh token) |
| `SMOKE-TEST.md` | panduan manual smoke test | — |
| `README.md` (ini) | indeks | — |

Aturan: **TIDAK DIUJI** bila prasyarat tak ada (tanpa Docker/token) — jangan
mengisi angka. Bukti statis (Deno, sintaks, drift) tetap bernilai sebagai
verifikasi parsial dan diberi label jelas.

## Status bukti per 5 Nov 2026 (setelah audit)

| Kategori | Bukti | Status |
|---|---|---|
| **CI** | Backend CI `dcf8049` (merge BE-3): https://github.com/QEISALVARO/github-profile-finder-app/actions/runs/40845759710 — sukses (static check, pgTAP, drift tipe, lint) | Terbukti |
| **CI** | Frontend CI `dcf8049`: https://github.com/QEISALVARO/github-profile-finder-app/actions/runs/40845759748 | Terbukti |
| **CI** | Backend CI `6545b2f` (BE-2): https://github.com/QEISALVARO/github-profile-finder-app/actions/runs/40832695794 | Terbukti |
| **Portable (non-CI)** | `pg17-portable-2026-10-29.txt`, `mutasi-be3-2026-10-30.txt`, `sql-static-2026-10-29.txt`, `sql-drift-secret-2026-10-29.txt` | Verifikasi parsial |
| **Portable (non-CI)** | `deno-contracts-2026-10-29.txt`, `deno-functions-2026-10-29.txt` | Verifikasi parsial (Deno lokal) |
| **Belum ada** | `pgtap-<tanggal>.txt` (log per-asersi dari run nyata), `smoke-<tanggal>.txt` (S1–S9), `ingestion-live-<tanggal>.json` (p95 analisis), `discover-bench-<tanggal>.json` (p95 Discover), `bias-v0-<tanggal>.md` | **BELUM DIUJI/DIUKUR** |

Catatan penting:
- Commit dokumentasi `84d13c4` dan `387438a` **tidak memicu CI sama sekali**
  (Actions API: 0 run untuk kedua SHA). Klaim "MENUNGGU CI runner" pada kedua
  commit itu benar adanya; bukti hijau berasal dari `dcf8049` (kode BE-3) dan
  `6545b2f` (BE-2).
- Gate performa (p95 feed, p95 analisis, p95 Discover) dan smoke S1–S9 tetap
  **belum terpenuhi** sampai berkas bukti mentah tersedia.
- Tanpa Docker lokal, `make reset && make test` tidak dapat dijalankan di mesin
  kerja ini; hasil pgTAP baru sah setelah CI PR berjalan.
