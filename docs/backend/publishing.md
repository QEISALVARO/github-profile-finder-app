# Publikasi Proyek (BE-3): list → publish → visible

## Alur
1. **List** (`list-my-repos`, GET/POST): repo **publik milik pemanggil** (`profiles.login`, bukan input klien), paginasi kursor. Tandai `alreadyPublished` (DB), `eligible`/`ineligibleReason` (`FORK`, `EMPTY`; `NOT_OWNER` tidak terjadi karena query sudah `ownerAffiliations: OWNER`). Peran `developer` wajib; rate limit 60/jam.
2. **Publish** (`publish-project`, POST `{githubRepoId, role?, demoUrl?, description?≤500}`):
   - Validasi JWT + zod + peran developer + rate limit 20/jam.
   - Ambil fakta **satu repo** via GraphQL (reuse query & parser BE-2: root entries, README/CI/tes/lisensi, `diskUsage`, `languages`, topics, manifest, `homepageUrl`, `stargazerCount`, `pushedAt`, `isFork`, `owner.databaseId`).
   - **Verifikasi (D1–D3):** `owner.databaseId == profiles.github_id` (selain itu `403`); publik (privat → `404`); **bukan fork** (`400`); tidak kosong (`diskUsage > 0`, `400`).
   - **Hitung:** `stack` top-3 byte→persen bulat jumlah 100 (D2); `role` = input bila ada, selain itu inferensi BE-2 dipetakan (`Front-End Developer→Front-End`, `Mobile→Mobile`, `AI / Data→Data`, else `Back-End`); `active` (push ≤ 30 hari); `score = (isFork?0:40) + (demoVerified?20:0) + round(40×substance)`.
   - **Demo SSRF-safe** (`safe-fetch`, reuse BE-2): `input.demoUrl` bila ada, selain itu `homepageUrl`; hanya `demo_verified` jika HTTP 2xx; URL **tidak disimpan** bila gagal/tidak aman.
   - **Upsert** per `github_repo_id`: baru → insert; milik pemanggil → update (idempoten); milik orang lain → `403`. `description` dipotong 500 + sanitasi email (POL-2). `country_code`/`city` mengikuti profil via trigger.
   - Respons `PublishProjectResult` termasuk `visible` (tampil di feed bila developer `listed`, yang butuh negara).
3. **Moderasi:** `report_project` (unik per pelapor, rate limit 20/hari, alasan 1–500); `unpublish/republish_project` (pemilik saja; republish tak ubah kolom hitungan); `admin_set_project_hidden` (hanya `app_metadata.role='admin'`, tulis `audit_log`).

## Aturan verifikasi (D1–D3)
- Hanya pemilik repo yang dapat mempublish (kontributor signifikan DITUNDA → backlog).
- Kolom hasil perhitungan tidak dapat ditulis klien (D4 didenormalisasi + trigger; D3: RLS 019 cabut tulis langsung).
- Admin = klaim JWT `app_metadata.role = 'admin'` (D5, tanpa tabel peran baru).

## SSRF & kegagalan hulu
Reuse `ssrf/safe-fetch` + `github/*` + `scoring/*` + `http/supabase` BE-2 (tanpa menulis ulang). Kegagalan hulu → `502/429` terstruktur, **tanpa data karangan**. Rate limit GitHub dipantau (`rate.ts`); demo timeout default 5 dtk.

## Contoh
```bash
curl -s http://127.0.0.1:54321/functions/v1/list-my-repos \
  -H "Authorization: Bearer $DEV_JWT" | head -c 400
curl -s -X POST http://127.0.0.1:54321/functions/v1/publish-project \
  -H "Authorization: Bearer $DEV_JWT" -H 'Content-Type: application/json' \
  -d '{"githubRepoId":1296269}' | head -c 600
```
