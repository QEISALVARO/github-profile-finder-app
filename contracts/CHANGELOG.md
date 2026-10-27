# contracts/CHANGELOG.md

## v0.1.0 — 2026-10-27 (SP-0)

### Initial SP-0 contracts (FE–BE agreement)

Established by PR `chore/contracts-sp0`. These files are the single source
of truth for the data shapes exchanged between the Expo frontend and the
Supabase backend. Any change requires a PR reviewed by **both** FE and BE.

### Files
- `src/common.ts`   — CountryCode, Availability, PipelineStage, ErrorCode, ErrorBody
- `src/analysis.ts` — Evidence, AnalysisVM, AnalyzeRequest
- `src/feed.ts`     — FeedQuery, DeveloperRef, FeedItem, FeedPage, CountryFacet
- `src/talent.ts`   — DiscoverQuery, DiscoverItem, DiscoverPage, PipelineEntry
- `src/chat.ts`     — StartConversationInput, Conversation, Message

### Tooling
- Zod specifier: `npm:zod@^3.24.0` (Deno import map in `deno.json`)
- FE package.json does not yet declare `zod`; BE uses npm specifier.
  When FE adds zod, verify major version matches.

### Fixtures
- `fixtures/analysis_vm.json`      — four AnalysisVM variants
- `fixtures/feed_page.json`        — FeedPage with 2 items
- `fixtures/discover_page.json`    — DiscoverPage with 2 items
- `fixtures/country_facets.json`   — 5 CountryFacet entries
- `fixtures/error_body.json`       — 3 ErrorBody variants
- `fixtures/start_conversation.json` — StartConversationInput
- `fixtures/message.json`          — Message
