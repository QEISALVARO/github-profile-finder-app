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
