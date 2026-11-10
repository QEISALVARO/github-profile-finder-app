# Talent (BE-4): Discover, Pipeline, Compare

Semua akses lewat RPC `SECURITY DEFINER` dengan `search_path = public, extensions`.
Tidak ada grant tabel langsung untuk `anon`/`authenticated` pada `projects`
(ADR-015), `pipeline_entries`, maupun view internal. Pemanggil wajib login;
`auth.uid()` NULL → `UNAUTHORIZED`.

## 1. Keputusan desain D1–D6

| # | Keputusan | Konsekuensi |
|---|---|---|
| **D1** | Discover hanya menampilkan developer dengan `developer_settings.listed = true`, `profiles.country_code` terisi (POL-9), **dan** analisis terbaru ber-`score_version = 2`. | Developer yang baru mengaktifkan listing tetapi belum punya analisis **tidak muncul**; FE memicu `analyze-developer` untuk login sendiri setelah listing (AIR-3). |
| **D2** | `role` keluaran memakai `FeedRole` (`Front-End/Back-End/Mobile/Data`) dari `public.feed_role(inferred_role)`. | "Full-Stack" tidak ada. `DiscoverItem.role` di kontrak tetap `string`; nilai yang dikeluarkan hanya 4 itu. |
| **D3** | Pemanggil Discover/Compare/Pipeline wajib peran `recruiter` (`FORBIDDEN`). Developer yang memblokir pemanggil (`blocks.blocker_id = developer`) tidak muncul; pemanggil tidak melihat dirinya sendiri. | — |
| **D4** | Login dapat diakses bila developer `listed` **atau** sudah ada di pipeline pemanggil; selain itu `NOT_FOUND`. | Mencegah membaca analisis "lookup" orang lain lewat Compare/Pipeline. |
| **D5** | Data pihak ketiga diminimalkan: `github_login` + `stage` + `note` (≤ 1000). Nama/avatar/role/skor hanya bila login itu listed. | Saat developer menghapus akun, entri pipeline milik recruiter lain yang merujuk login itu dihapus (trigger `profiles_purge_pipeline`). |
| **D6** | RPC-only: `revoke insert,update,delete` langsung dari `authenticated` pada `pipeline_entries`; pemilik membaca/menulis lewat RPC. | `pgTAP 12` membuktikan akses tabel langsung ditolak. |

## 2. Signature RPC

```sql
discover_developers(
  p_role text default null, p_min_score int default null,
  p_countries char(2)[] default null, p_language text default null,
  p_availability availability default null,
  p_cursor text default null, p_lim int default 20
) returns jsonb  -- DiscoverPage { items, nextCursor, totalCount }

discover_country_facets(
  p_role text default null, p_min_score int default null,
  p_language text default null, p_availability availability default null
) returns jsonb  -- [{ iso2, count | "<5" }]

pipeline_list(p_stage pipeline_stage default null) returns jsonb  -- PipelineList
pipeline_upsert(p_login text, p_stage pipeline_stage default 'saved', p_note text default null) returns jsonb
pipeline_remove(p_id uuid) returns void
compare_developers(p_logins text[]) returns jsonb  -- CompareResult (tepat 2)
```

### Filter Discover
- `p_role`: `Front-End|Back-End|Mobile|Data` (case-insensitive). Nilai lain → `VALIDATION`.
- `p_min_score`: 70–95 atau NULL. Di luar rentang → `VALIDATION`.
- `p_countries`: `^[A-Z]{2}$`; array kosong = semua negara.
- `p_language`: primary language, case-insensitive.
- `p_availability`: enum `open_to_work|freelance|not_available`.
- Urutan: `authenticity desc, login asc`. `totalCount` eksak (listing opt-in).
- `p_lim` di-clamp 1–50 (default 20).
- Kursor base64url `{"s": authenticity, "l": login}`; rusak → `VALIDATION`.
  Keyset: `authenticity < s OR (authenticity = s AND login > l)`.

### Pipeline
- `pipeline_upsert`: login dinormalisasi `lower()`, regex username GitHub;
  note ≤ 1000; batas **500 entri per recruiter**; idempoten per
  `(recruiter, login)`.
- `pipeline_list`: `summary {saved, interviewing, hired}` dihitung dari seluruh
  entri pemanggil (tidak terpengaruh filter `p_stage`). Urutan
  `stage, updated_at desc`, maks 500.
- `pipeline_remove`: hanya pemilik; selain itu `NOT_FOUND`.

### Compare
- Tepat 2 login (unik); selain itu `VALIDATION`.
- Metrik dari `analyses.metrics` analisis v2 terbaru: `originalCount`,
  `streakWeeks`; `score` = `authenticity`.
- `availability`, `countryCode`, `city` **NULL** bila login bukan developer
  listed (D5).
- Tanpa email/breakdown/evidence.

## 3. Rate limit (angka awal, `app_rate_limits`)

| Key | Batas | Endpoint |
|---|---|---|
| `discover_developers` | 300/jam | Discover |
| `discover_country_facets` | 300/jam | Facet Discover |
| `pipeline_list` | 300/jam | Daftar pipeline |
| `pipeline_upsert` | 120/jam | Upsert pipeline |
| `compare_developers` | 120/jam | Compare |

Melewati batas → `RATE_LIMITED` dengan `retry_after` pada pesan/`Retry-After`.

## 4. Contoh

```bash
curl -s http://127.0.0.1:54321/rest/v1/rpc/discover_developers \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $RECRUITER_JWT" \
  -H 'Content-Type: application/json' \
  -d '{"p_role":"Back-End","p_min_score":70,"p_countries":["ID"],"p_lim":20}'
```

```sql
select public.discover_developers('Back-End', 70, array['ID']::char(2)[], null, null, null, 20);
select public.discover_country_facets();
select public.pipeline_upsert('budi_id', 'saved', 'Kandidat kuat Go');
select public.pipeline_list(null);
select public.compare_developers(array['budi_id','tan_sg']);
```

### supabase-js (FE)

```ts
const { data, error } = await supabase.rpc("discover_developers", {
  p_role: "Back-End",
  p_min_score: 70,
  p_countries: ["ID"],
  p_cursor: null,
  p_lim: 20,
});
if (error) {
  // PostgREST memetakan `raise exception 'CODE: ...'` menjadi error.message;
  // kode yang dikenal: UNAUTHORIZED, FORBIDDEN, VALIDATION, RATE_LIMITED,
  // NOT_FOUND. retry_after ada pada pesan (dan header pada Edge Function).
}
```

## 5. Kode error

| Kode | Arti |
|---|---|
| `UNAUTHORIZED` | Tanpa JWT / `auth.uid()` NULL |
| `FORBIDDEN` | Bukan peran `recruiter` (atau bukan admin untuk bias) |
| `VALIDATION` | Input/kursor di luar aturan |
| `NOT_FOUND` | Login tidak listed dan tidak ada di pipeline (D4) |
| `RATE_LIMITED: retry_after=N` | Melewati batas laju |

## 6. Hasil pengukuran (10 Nov 2026)

Data: `supabase/seed/bench-talent.sql` — 5.200 developer sintetis `listed`
beranalisis v2 (4.889 di antaranya memenuhi D1). Dimuat manual setelah
`make reset`; tidak ikut reset.

- **p95 Discover: 69,0 ms** (target < 500 ms) dari 308 panggilan REST,
  p50 35,1 ms, maks 113,1 ms — `evidence/discover-bench-2026-11-10.json`.
  `EXPLAIN (ANALYZE, BUFFERS)` satu panggilan penuh: 52,6 ms / 69.305 buffer
  hit — `evidence/discover-explain-2026-11-10.txt`.
- **Laporan bias v0: teruji** pada 5.200 skor — `evidence/bias-v0-2026-11-10.md`.
  Median keseluruhan 74; indikator tinjauan menyala hanya untuk grup yang
  sengaja digeser di seed (`NG`, -12), kelompok n<10 dimasking.
- Batas: hasil ini sintetis dan lokal (satu instance Postgres), bukan klaim
  performa produksi. Rate limit dinaikkan khusus run bench agar 308 panggilan
  tidak kena `RATE_LIMITED`; pemeriksaan rate limit tetap dieksekusi.
