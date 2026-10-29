# Smoke Test Edge Function — Panduan Manual (butuh Supabase lokal + token)

> Status di lingkungan verifikasi 29 Okt 2026: **TIDAK DIUJI** (tanpa Docker;
> Supabase lokal tidak bisa hidup). Jalankan manual atau via CI ber-Docker.

## 1. Siapkan stack lokal

```bash
cp .env.example .env
# Isi GITHUB_CLIENT_ID/SECRET bila ingin menguji login (tidak wajib utk pgTAP).
# Isi GITHUB_API_TOKEN hanya untuk baris bertanda [TOKEN].

make up
make reset
```

## 2. Sajikan fungsi (terminal kedua)

```bash
npx supabase functions serve --env-file .env
# analyze-developer: http://127.0.0.1:54321/functions/v1/analyze-developer
# delete-account:    http://127.0.0.1:54321/functions/v1/delete-account
```

## 3. Buat akun dev + ambil JWT

```bash
# Seed akun dev via Admin API (butuh SERVICE_ROLE dari `supabase status`):
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=<dari supabase status> \
npx tsx scripts/backend/seed-dev-users.ts

# Login via GoTrue untuk mendapatkan JWT (ganti email/password seed):
curl -s -X POST http://127.0.0.1:54321/auth/v1/token?grant_type=password \
  -H "apikey: <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"<dev-email>","password":"<dev-password>"}'
# -> .access_token = DEV_JWT, dan ulangi untuk akun recruiter -> REC_JWT
```

## 4. Matriks uji (simpan output ke `docs/backend/evidence/smoke-<tanggal>.txt`)

| # | Perintah | Harapan |
|---|---|---|
| S1 | `curl -s -o /dev/null -w "%{http_code}" -X POST .../delete-account -H 'Content-Type: application/json' -d '{}'` (tanpa Authorization) | `401` + body `{"code":"UNAUTHORIZED",...}` |
| S2 | `curl .../analyze-developer -d '{"login":"octocat"}'` (tanpa JWT) | `401 UNAUTHORIZED` |
| S3 | `curl .../analyze-developer -H "Authorization: Bearer $DEV_JWT" -d '{"login":"!!!"}'` | `400 VALIDATION` |
| S4 | `analyze-developer` dengan JWT developer untuk login orang lain | `403 FORBIDDEN` |
| S5 [TOKEN] | `analyze-developer` JWT recruiter `{"login":"octocat"}` pertama kali | `200`, `source:"fresh"`, lolos `AnalysisVM` (validasi via `deno eval` + skema) |
| S6 [TOKEN] | ulangi S5 dalam TTL | `source:"cache"` |
| S7 [TOKEN] | `{"login":"octocat","force":true}` < 15 menit setelah S5 | `source:"cache"` (bukan error) |
| S8 [TOKEN] | `{"login":"user-yang-pasti-tidak-ada-xyz123"}` | `404 NOT_FOUND` |
| S9 | setelah S5: baca `analyses`/`github_snapshots` dengan JWT biasa (PostgREST) | **ditolak** (RLS default-deny) |

## 5. Uji live (opsional, butuh token)

```bash
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<anon> BENCH_USER_JWT=$REC_JWT \
  deno run --allow-read --allow-write --allow-env --allow-net scripts/backend/live-bench.ts
# -> docs/backend/evidence/ingestion-live-<tanggal>.json (data mentah)
```
