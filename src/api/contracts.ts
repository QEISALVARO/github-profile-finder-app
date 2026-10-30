// ---------------------------------------------------------------------------
// FE-2 — typed view of the SP-0 contracts.
//
// Satu mekanisme tipe (rebase ke main): tipe FE **tidak diturunkan ulang** di
// `src/`. Semua tipe di bawah diekspor ulang dari `contracts/src/types.ts`,
// yang sudah menurunkan `z.infer` dari skema SP-0 — sumber kebenaran tunggal.
//
// Alias `@contracts/*` tetap dipakai untuk **skema runtime** (zod) di tes
// adapter, sedangkan tipe memakai path relatif ke `types.ts` seperti main.
// Bila suatu saat ada tipe baru, tambahkan ke `contracts/src/types.ts` lewat
// PR kontrak terpisah — jangan menyalinnya ke sini.
// ---------------------------------------------------------------------------

export type {
  // --- common --------------------------------------------------------------
  CountryCode,
  Availability,
  PipelineStage,
  ErrorCode,
  ErrorBody,
  // --- analysis ------------------------------------------------------------
  Evidence,
  AnalysisVM,
  AnalyzeRequest,
  // --- feed ----------------------------------------------------------------
  FeedQuery,
  DeveloperRef,
  FeedItem,
  FeedPage,
  CountryFacet,
  // --- talent --------------------------------------------------------------
  DiscoverQuery,
  DiscoverItem,
  DiscoverPage,
  PipelineEntry,
  // --- chat ----------------------------------------------------------------
  StartConversationInput,
  Conversation,
  Message,
} from '../../contracts/src/types.ts';
