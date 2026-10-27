# contracts — changelog

Setiap perubahan skema di `contracts/src/` dicatat di sini dan butuh PR yang
ditinjau **frontend** dan **backend** (Lampiran A prompt FE-2 / §2).

## 0.1.0 — 2026-10-27

Kontrak SP-0 awal, dibuat persis sesuai Lampiran A:

- `common.ts` — `CountryCode`, `Availability`, `PipelineStage`, `ErrorCode`, `ErrorBody`
- `analysis.ts` — `Evidence`, `AnalysisVM`, `AnalyzeRequest`
- `feed.ts` — `FeedQuery`, `DeveloperRef`, `FeedItem`, `FeedPage`, `CountryFacet`
- `talent.ts` — `DiscoverQuery`, `DiscoverItem`, `DiscoverPage`, `PipelineEntry`
- `chat.ts` — `StartConversationInput`, `Conversation`, `Message`

Catatan: tiap file menambahkan `import { … } from "./common"` bila memakai
`CountryCode`/`Availability`/`PipelineStage` — satu-satunya penyesuaian teknis
agar file ter-compile; skema itu sendiri tidak diubah.
