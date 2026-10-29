# contracts/CHANGELOG.md


## v0.2.0 — 2026-10-29 (BE-3, PR chore/contracts-projects)

### Projects contracts (FE–BE agreement, ditinjau FE + BE)

- Baru: `contracts/src/projects.ts` — `FeedRole`, `MyRepoItem`, `MyReposPage`,
  `PublishProjectInput`, `PublishProjectResult`, `CityFacet` (persis Lampiran A
  prompt BE-3; impor `.ts` eksplisit mengikuti keputusan stabilisasi).
- `contracts/src/types.ts`: ekspor z.infer untuk keenam skema baru.
- Fixture baru: `city_facets.json` (CityFacet incl. `"<5"`), `my_repos.json`
  (eligible + FORK), `publish_result.json` (stack jumlah 100).
- Test: 7 kasus baru di `schema_test.ts` (parse fixture + penolakan input
  buruk: repoId negatif, demoUrl bukan URL, role/ineligibleReason di luar enum).
- Kode error memakai `ErrorCode` yang ada (tanpa enum baru).

## v0.1.1 — 2026-10-29 (PR #1 fix)

### Explicit `.ts` relative imports (Deno-strict)

- `contracts/src/{feed,analysis,talent}.ts` now import `./common.ts`
  (with extension) instead of `./common`.
- Reason: Deno `check`/`test` without flags (incl. CI) resolves explicit
  paths only; extensionless relative imports fail type-check. Metro/FE
  impact: none at this PR (FE consumes contracts only from PR #5 via
  `@contracts/*` alias).
- Decision: no `unstable.sloppy-imports`, no import-map workaround.
  Verified: `deno check contracts/src/*.ts` green, `deno test
  --allow-read --allow-env contracts/tests/` 9/9 green (Deno 2.9.8).

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
