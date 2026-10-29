// ---------------------------------------------------------------------------
// FE-2 — typed view of the SP-0 contracts.
//
// `contracts/src/*.ts` export **zod schemas** (values). This module derives the
// matching TypeScript types with `z.infer` so the app can import plain types
// without duplicating a single field — when the contracts change, these types
// change with them.
//
// The contract files themselves stay byte-identical to Lampiran A; all
// inference lives on the frontend side of the boundary.
// ---------------------------------------------------------------------------

import { z } from 'zod';

import * as analysisSchemas from '@contracts/analysis';
import * as chatSchemas from '@contracts/chat';
import * as commonSchemas from '@contracts/common';
import * as feedSchemas from '@contracts/feed';
import * as talentSchemas from '@contracts/talent';

// --- common -----------------------------------------------------------------
export type CountryCode = z.infer<typeof commonSchemas.CountryCode>;
export type Availability = z.infer<typeof commonSchemas.Availability>;
export type PipelineStage = z.infer<typeof commonSchemas.PipelineStage>;
export type ErrorCode = z.infer<typeof commonSchemas.ErrorCode>;
export type ErrorBody = z.infer<typeof commonSchemas.ErrorBody>;

// --- analysis ---------------------------------------------------------------
export type Evidence = z.infer<typeof analysisSchemas.Evidence>;
export type AnalysisVM = z.infer<typeof analysisSchemas.AnalysisVM>;
export type AnalyzeRequest = z.infer<typeof analysisSchemas.AnalyzeRequest>;

// --- feed -------------------------------------------------------------------
export type FeedQuery = z.infer<typeof feedSchemas.FeedQuery>;
export type DeveloperRef = z.infer<typeof feedSchemas.DeveloperRef>;
export type FeedItem = z.infer<typeof feedSchemas.FeedItem>;
export type FeedPage = z.infer<typeof feedSchemas.FeedPage>;
export type CountryFacet = z.infer<typeof feedSchemas.CountryFacet>;

// --- talent -----------------------------------------------------------------
export type DiscoverQuery = z.infer<typeof talentSchemas.DiscoverQuery>;
export type DiscoverItem = z.infer<typeof talentSchemas.DiscoverItem>;
export type DiscoverPage = z.infer<typeof talentSchemas.DiscoverPage>;
export type PipelineEntry = z.infer<typeof talentSchemas.PipelineEntry>;

// --- chat -------------------------------------------------------------------
export type StartConversationInput = z.infer<typeof chatSchemas.StartConversationInput>;
export type Conversation = z.infer<typeof chatSchemas.Conversation>;
export type Message = z.infer<typeof chatSchemas.Message>;
