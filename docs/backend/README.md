# Backend Gitscope (Supabase & Postgres)

Dokumentasi arsitektur dan panduan pengembang backend Gitscope (Fase BE-0 Fondasi & BE-1 Auth & Profil).

---

## 1. Versi Tooling Baku

- **Supabase CLI**: `v2.122.0` (dijalankan via `npx supabase` atau binary global `supabase`)
- **Deno**: `v2.x` (untuk Edge Functions dan pengujian kontrak zod)
- **PostgreSQL**: PostgreSQL 15+ (didukung image standar Supabase)
- **Node.js**: Node 20+

---

## 2. Prasyarat Sistem

1. **Docker Desktop**: Wajib berjalan untuk menjalankan stack kontainer Supabase lokal (`supabase start`).
2. **Node.js & npm / bun**: Untuk menjalankan `npx supabase` atau scripts.
3. **Deno**: Untuk menjalankan unit test kontrak dan Edge Functions.

---

## 3. Menjalankan Backend Lokal

### Menggunakan Makefile (Rekomendasi)

```bash
# 1. Jalankan kontainer Supabase
make up

# 2. Reset database & terapkan seluruh migrasi serta seed dari nol
make reset

# 3. Jalankan pengujian (pgTAP + Deno contracts)
make test

# 4. Generate TypeScript types dari skema lokal
make types

# 5. Linting migrasi database
make lint

# 6. Hentikan kontainer Supabase
make down
```

### Menggunakan npx supabase Langsung

```bash
npx supabase start
npx supabase db reset
npx supabase test db
npx supabase gen types typescript --local > contracts/src/database.types.ts
npx supabase stop
```

---

## 4. Konfigurasi Variabel Lingkungan (`.env`)

Salin template variabel lingkungan:
```bash
cp .env.example .env
```

| Variabel | Deskripsi | Diizinkan di Client? |
|---|---|---|
| `SUPABASE_URL` | Endpoint HTTP Supabase lokal/cloud | Ya |
| `SUPABASE_ANON_KEY` | Public anon key (dapat dipakai mobile app) | Ya |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret superuser key (bypasses RLS) | **TIDAK PERNAH** |
| `GITHUB_CLIENT_ID` | OAuth Client ID dari GitHub Developer Settings | Tidak |
| `GITHUB_CLIENT_SECRET` | OAuth Client Secret dari GitHub | Tidak |

---

## 5. Struktur Direktori Backend

```
├── contracts/                     # Kontrak SP-0 (Zod schemas & database types)
│   ├── src/                       # analysis.ts, chat.ts, common.ts, feed.ts, talent.ts, database.types.ts
│   ├── fixtures/                  # Fixture JSON valid untuk kontrak
│   └── tests/                     # Deno test validasi fixture vs schema zod
├── supabase/
│   ├── config.toml                # Konfigurasi Supabase CLI (Auth, Ports, DB, Storage)
│   ├── migrations/                # Migrasi SQL bernomor idempoten (001 - 014, termasuk 014_be2_ingestion)
│   ├── seed/                      # countries.sql (152 negara), cities.sql, keyword_aliases.sql, dev.sql
│   ├── tests/                     # Pengujian pgTAP (RLS, POL-9, Default Deny, RPC, Location)
│   └── functions/                 # Supabase Edge Functions (Deno)
│       └── delete-account/        # Edge function penghapusan akun berjenjang (GDPR/POL)
├── scripts/backend/
│   ├── generate-countries-seed.ts # Generator seed negara dari data frontend
│   └── seed-dev-users.ts          # Seeder user uji dev via Admin API
└── docs/backend/
    ├── README.md                  # Panduan pengembang ini
    ├── policies.md                # Matriks RLS dan kepatuhan POL/AIR
    ├── auth.md                    # Alur GitHub OAuth, onboarding & RPC
    ├── decisions.md               # Log keputusan arsitektur (ADR)
    └── LAPORAN-BE.md              # Laporan kemajuan & verifikasi per fase
```
