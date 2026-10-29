# Feed Proyek (BE-3): pencarian, facet, featured

## RPC

### `search_projects(p_q, p_role, p_countries, p_city, p_active_only, p_min_score, p_cursor, p_lim, p_include_unknown)` → `FeedPage`
- **Visibilitas:** hanya `visible = true` (`published AND NOT is_hidden AND owner listed` — listed butuh negara, POL-9).
- **Tokenisasi (persis v1):** `lower(q)` → split `/[\s-]+/` → buang kosong. Tiap token diperluas via `keyword_aliases` menjadi grup OR prefix-term (`term:*`); antar token AND. Contoh: `golang` → `(golang:* | go:*)`; `ml` → `(ml:* | pytorch:* | tensorflow:* | machine:* | learning:*)`; `"e-commerce"` ≡ `"e commerce"`.
- **Filter:** role eksak; `active_only` (push ≤ 30 hari via trigger); `min_score`; `countries` (huruf besar, `^[A-Z]{2}$`; kosong/NULL = semua); `city` case/accent-insensitive (`unaccent(lower())`); `include_unknown` (sertakan `country_code IS NULL` bila filter negara aktif — secara desain nyaris tak ada).
- **Urutan & kursor:** `ORDER BY rank_score DESC, id DESC`. Kursor = base64url JSON `{"r": rank_score, "id": uuid}`; halaman berikut `(rank_score, id) < (r, id)`. Kursor rusak → `VALIDATION` (P0001). `nextCursor = null` di halaman terakhir.
- **Keluaran:** `{ items: FeedItem[], nextCursor, totalCount }`. `stack` top-3 byte→persen (D2); `availability` dari `developer_settings` (default `not_available`).
- **Batas:** `lim` di-clamp 1–50 (default 20); rate limit 300/jam per pengguna (`app_rate_limits.search_projects`); **tidak ada** endpoint bulk.
- **Fallback fuzzy trigram:** BELUM diimplementasikan (opsional setelah gate hijau) — FTS me-return 0 baris apa adanya.

### `country_facets(...)` → `[{iso2, count | "<5"}]`
Filter sama dengan search **kecuali `countries`**. `count < app.facet_min_count` (default 5) → `"<5"`; baris 0 dihilangkan; urut count desc, iso2.

### `city_facets(p_country, ...)` → `[{city, count | "<5"}]`
Sama, untuk drill-down **tepat satu negara** (FE menegakkan). Negara invalid → `VALIDATION`.

### `featured_projects(p_lim)` → `FeedPage`
Snapshot `featured_projects` minggu berjalan, **filter ulang `visible`** saat baca. Cron mingguan `refresh_featured(n)` (Senin 00:00 UTC, default 10): N teratas `active` by `rank_score`.

## Ranking
`project_rank(score, pushed_at, stars)` = `0.5·(score/100) + 0.3·recency + 0.2·logstars`, dibulatkan 6 desimal. `recency = clamp(1 − hari/365, 0, 1)`; `logstars = least(ln(1+stars)/ln(100001), 1)`. Disimpan di `rank_score`, dihitung trigger (insert/update) + cron harian `refresh_rank_scores()`. `visible` didenormalisasi + dijaga trigger (insert, update, sync profil/settings).

## Masking & privasi (D6, POL-1)
Facet `<5` mencegah re-identifikasi. `totalCount` eksak (listing opt-in yang memang terlihat).

## Kode error RPC
Konvensi: `raise exception '<CODE>'` (+ detail `retry_after` di message untuk RATE_LIMITED) dengan `errcode P0001`; adapter FE memetakan `message` → `ErrorBody` (`supabase-js` memunculkan `error.message`/`error.details` dari `raise`).

## Contoh
```bash
# Search + facet (butuh JWT; lihat docs/backend/evidence/SMOKE-TEST.md)
curl -s -X POST http://127.0.0.1:54321/rest/v1/rpc/search_projects \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json' \
  -d '{"p_q":"golang","p_countries":["ID"],"p_lim":20}' | head -c 500
curl -s -X POST http://127.0.0.1:54321/rest/v1/rpc/country_facets \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json' \
  -d '{"p_q":"go"}'
```
