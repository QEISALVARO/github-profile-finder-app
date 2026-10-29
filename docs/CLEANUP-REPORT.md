# LAPORAN STABILISASI — Pecah PR + Perbaikan (tanpa fitur baru)

Tanggal: 29 Oktober 2026
Tag cadangan: `backup/pre-split-8b42625` (= commit `8b42625`, sudah di-push ke origin)
Branch lama `feat/be-2-ingestion-scoring` TIDAK dihapus, TIDAK ditimpa.

## 1. Daftar PR bertumpuk (merge berurutan ke `main`)

> Catatan: `gh` CLI tidak tersedia di lingkungan ini, jadi PR belum dibuka
> via API. Semua branch sudah di-push; buat PR via GitHub web dengan base/head
> dan paste deskripsi di bawah.

| # | Branch (head) | Base | Deskripsi PR (paste) |
|---|---|---|---|
| 0 | `chore/ci-frontend` | `main` | **chore(ci): Frontend CI + `npm run check`** — Tujuan: CI frontend mandiri. Berkas: `.github/workflows/frontend.yml` (baru), `package.json` (skrip `check`). Pemeriksaan: typecheck, lint, jest --ci, secret scan src, encoding check (BOM/Cyrillic). Hasil lokal: tsc bersih, lint 0/0, jest 8/8 suite 77/77. |
| 1 | `chore/contracts-sp0` | `chore/ci-frontend` | **chore(contracts): SP-0 + impor `.ts` eksplisit** — Tujuan: kontrak satu sumber, lolos Deno strict. Berkas: `contracts/` (tanpa `database.types.ts`), `CHANGELOG v0.1.1` (keputusan: tanpa sloppy-imports). Perbaikan §3-B: `./common` → `./common.ts`. Hasil: `deno check` 5/5, `deno test` 9/9 (Deno 2.9.8). Diketahui: tsc TS5097 (diperbaiki PR #5). |
| 2 | `feat/be-0-foundation` | `chore/contracts-sp0` | **feat(be-0): fondasi backend** — Berkas: `config.toml` (BOM dihapus, TOML valid), migrasi 001-008 (tak diubah), seed, pgTAP 01-03, `database.types.ts`, `Makefile`, `.env.example` dipisah (placeholder, tanpa nilai nyata), `backend.yml` diperketat (deno check, izin minimal, drift check gagal-bila-beda, secret+encoding scan), skrip seed, docs dicakup BE-0 (POL-6/8/AIR & ADR-003/005/006/007/008 = rencana BE-1/BE-2). pgTAP BELUM DIJALANKAN lokal (tanpa Docker); via CI. |
| 3 | `feat/be-1-auth-profile` | `feat/be-0-foundation` | **feat(be-1): auth & profil** — Berkas: migrasi 009-013 (tak diubah), pgTAP 04-06, `delete-account` + test (3/3 lokal OK), `_shared/{http,supabase}.ts`, `auth.md`. Diketahui: `deno check` file npm-supabase gagal resolve di Windows lokal (CI Linux memastikan). pgTAP via CI. |
| 4 | `feat/be-2-ingestion-scoring-v2` | `feat/be-1-auth-profile` | **feat(be-2): ingestion & scoring** — Berkas: migrasi 014 + pgTAP 07 (tak diubah), `analyze-developer`, `refresh-stale`, `_shared/{github,scoring,ssrf}`, fixture g1, `record-github-fixtures.ts`, `live-bench.ts` (baru), docs `ingestion/scoring-v2/LAPORAN-BE`. Perbaikan §3-D: resolver+fetch suntikan; bug `isIpLiteral` diperbaiki; 9/9 SSRF tanpa jaringan. Klaim dinetralkan (§3-A): p95/1-poin/hemat-98%/test-dev dihapus → BELUM DIUKUR; gate p95 belum terpenuhi. Hasil: Deno 24/24 (scoring+SSRF+analyze, tanpa --allow-net). `live-bench` BELUM DIJALANKAN (tanpa token+Supabase lokal). |
| 5 | `feat/fe-supabase-integration` | `feat/be-2-ingestion-scoring-v2` | **feat(fe): integrasi Supabase, satu sumber kontrak** — Berkas: deps (supabase-js, TanStack Query, url-polyfill; **zod disamakan ^3.24 = 3.25.76**, tolak v4), `tsconfig` (allowImportingTsExtensions, include src saja — sembuhkan TS5097), `contracts/src/types.ts` (z.infer; impor relatif langsung — keputusan: tanpa alias/@resolver agar Metro+Edge aman), hapus `src/lib/analysis-types.ts`, `contracts.test.ts` drift guard (7 test), fix Cyrillic `поле`, fix regresi export web (storage malas web/SSR→memori). Hasil: tsc bersih, lint 0/0, jest 88/88 (10 suite), deno 9/9, export android+web OK. |

## 2. Hasil pemeriksaan per PR (§4)

| PR | tsc | lint | jest | deno check/test | pgTAP | export | status |
|---|---|---|---|---|---|---|---|
| #0 | ✅ | ✅ 0/0 | ✅ 77/77 | n/a | n/a | n/a | hijau lokal |
| #1 | ⚠️ TS5097 bawaan (kontrak di-include; diperbaiki #5) | ✅ | ✅ 77/77 | ✅ 5/5, 9/9 | n/a | n/a | hijau kecuali TS5097 yg dijadwalkan |
| #2 | ⚠️ TS5097 yg sama | ✅ | ✅ 77/77 | ✅ 6/6, 9/9 | ⏳ via CI | n/a | hijau kecuali TS5097 |
| #3 | ⚠️ TS5097 yg sama | ✅ | ✅ 77/77 | ✅ parsial lokal (npm-resolve Windows; CI Linux) + 3/3 test | ⏳ via CI | n/a | hijau kecuali yg dijadwalkan |
| #4 | ⚠️ TS5097 yg sama | ✅ | ✅ 77/77 | ✅ 24/24 tanpa jaringan | ⏳ via CI | n/a | hijau kecuali yg dijadwalkan |
| #5 | ✅ bersih | ✅ 0/0 | ✅ 88/88 | ✅ 7/7, 9/9 | n/a | ✅ android+web | hijau penuh |

Keterangan: "n/a" = bukan cakupan PR itu. pgTAP + live-bench hanya via CI/pemilik repo (tanpa Docker/token di sini).

## 3. Status yang BELUM terukur / BELUM dijalankan (jujur)

- pgTAP (PR #2-#4): BELUM DIJALANKAN lokal — tanpa Docker & Supabase CLI. Perintah pemilik repo: `make up && make reset && make test-db` (atau biarkan CI `backend.yml`).
- Uji live ingestion (PR #4): BELUM DIUKUR — tanpa `GITHUB_API_TOKEN` + Supabase lokal. Perintah: isi token, `make up && make reset`, jalankan `scripts/backend/live-bench.ts` (butuh `--allow-net` hanya untuk bench ini), salin median/p95 + `rateLimit.cost` Q1-Q4 ke `ingestion.md` + taut berkas `docs/backend/evidence/*.json`.
- Fixture nyata tambahan (PR #4): BELUM DIREKAM (butuh token) — `record-github-fixtures.ts` siap.

## 4. Keputusan teknis

1. **Impor kontrak (§3-B):** ekstensi `.ts` eksplisit; tanpa `unstable.sloppy-imports`, tanpa import-map workaround. `deno check`/`deno test` hijau tanpa flag khusus. `tsc` butuh `allowImportingTsExtensions` (dipasang PR #5) karena kontrak memakai impor `.ts`.
2. **Satu sumber kebenaran (§3-C):** `contracts/src/types.ts` (z.infer) + impor **relatif langsung** dari `src/` — diputuskan TANPA alias `@contracts`/plugin resolver karena repo tidak punya `babel.config.js`/`metro.config.js` (Expo default) dan impor relatif selalu resolve di Metro, Jest, dan Edge Functions. zod FE disamakan mayor `^3.24` (tolak v4 bawaan `expo install`).
3. **SSRF (§3-D):** resolver/fetch injeksi; default produksi tetap `Deno.resolveDns`/fetch global — perilaku runtime tak berubah, test 100% offline.
4. **CI (§3-E):** `frontend.yml` baru; `backend.yml` diperketat (deno check, izin minimal `--allow-read --allow-env`, drift check `git diff --exit-code`, secret+encoding scan). `--allow-net` HANYA untuk `live-bench`, bukan test.
5. **Storage web (§5, bug temuan):** `supabase.ts` memakai storage malas (web/SSR→memori, native→AsyncStorage) setelah export web gagal `window is not defined` — regresi tertangkap dan diperbaiki di PR yang sama.

## 5. Deviasi dari prompt

- **PR #2 mencakup `database.types.ts` + `backend.yml` + `.env.example` + skrip seed** persis seperti tabel §2 (tidak dipisah lagi) — wajar karena mereka satu kesatuan fondasi.
- **`docs/backend/*` dipecah per cakupan** (bukan dipindah utuh): policies/decisions/README disunting agar tak menyebut fitur belum-merge, dengan penanda "menyusul di BE-1/BE-2".
- **`supabase/.temp/` + `.env` tetap di-gitignore** (bukan di-commit).
- **File lokal tak-terlacak `eas.json` + modifikasi `app.json` (package + extra.eas)** berasal dari tooling Expo/EAS lokal, bukan dari backup `8b42625` — TIDAK dimasukkan ke PR mana pun; `eas.json` dibiarkan tak-terlacak. Jika pemilik repo membutuhkannya, commit manual terpisah.
- **Modifikasi `LAPORAN.md` lokal pra-split** (catatan sesi sebelumnya) TIDAK dimasukkan ke PR mana pun.

## 6. Bug lain yang ditemukan tetapi TIDAK diperbaiki (di luar cakupan)

1. **(Diperbaiki karena menghalangi gate)** `isForbiddenIp(hostname)` menolak semua hostname non-IP (termasuk `example.com`) — diperbaiki via `isIpLiteral` di PR #4 karena test SSRF offline gagal tanpanya.
2. **(Diperbaiki karena menghalangi gate)** Export web `window is not defined` dari AsyncStorage saat SSR — diperbaiki via storage malas di PR #5.
3. **(Dicatat, tidak diperbaiki)** `refresh-stale/index.ts` versi backup hanya stub (query `developer_settings` tanpa join `profiles` bermakna, tanpa anggaran kuota nyata) — dibiarkan apa adanya sesuai "jangan tambah fitur"; anggap placeholder sampai BE-3.
4. **(Dicatat, tidak diperbaiki)** `app.json` lokal termodifikasi tooling (package `com.kelompok5gitscope.app` + `extra.eas.projectId`) — di luar cakupan; kembalikan/komit manual bila disengaja.
5. **(Dicatat, tidak diperbaiki)** `contracts/deno.json` hanya memetakan `zod`, tidak memetakan `@supabase/supabase-js` — file fungsi (`analyze-developer/deno.json`) yang menanganinya; `deno check` lintas-fungsi di Windows gagal resolve npm (keterbatasan env, CI Linux memastikan).

## 7. Gate selesai (§5) — status

- [x] 6 branch berurutan di-push (PR dibuka via web — `gh` CLI tak tersedia di sini).
- [x] Tag `backup/pre-split-8b42625` ada & di-push; branch lama utuh.
- [x] `deno check/test` hijau tanpa flag khusus/jaringan (kecuali resolve-npm Windows yg ditangani CI).
- [x] FE tanpa salinan tipe; drift guard hijau.
- [x] SSRF offline penuh, mencakup semua kasus §3-D.
- [x] ingestion/LAPORAN-BE konsisten BELUM DIUKUR; tanpa angka tanpa bukti.
- [x] Tanpa BOM/Cyrillic; `.env.example` terpisah.
- [x] `git diff backup/pre-split-8b42625 feat/fe-supabase-integration --stat` hanya memuat perbaikan §3 (28 berkas, lihat §8).
- [ ] Merge berurutan + CI hijau — menunggu pemilik repo (di luar kendali lingkungan ini).

## 8. Diff akhir vs backup (hanya perbaikan §3)

`git diff backup/pre-split-8b42625 feat/fe-supabase-integration --stat` = 28 berkas:
`.env.example`, kedua workflow, `PRD_V2_REAL.md` (1 baris respons analyze), `contracts/CHANGELOG` + impor `.ts` + `types.ts` baru, 4 docs backend, `package.json`+lock (hanya +zod), `live-bench.ts` baru, 2 test FE baru, hapus `analysis-types.ts`, `analyze.ts`+`supabase.ts`+`useAppStore.ts` (impor/komentar/storage), `config.toml` (BOM), `ip.ts`+`safe-fetch.ts`+test SSRF, `tsconfig.json`.
