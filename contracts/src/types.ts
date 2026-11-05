// contracts/src/types.ts
// Tipe turunan untuk konsumen TypeScript — satu sumber kebenaran.
// FE mengimpor tipe dari sini via path relatif; JANGAN menyalin ke src/.
// Catatan versi: zod FE (package.json, ^3.24) wajib se-mayor dengan import map
// Deno (contracts/deno.json: npm:zod@^3.24.0).
import type { z } from "zod";
import {
  AnalysisVM as AnalysisVMSchema,
  AnalyzeRequest as AnalyzeRequestSchema,
  Evidence as EvidenceSchema,
} from "./analysis.ts";
import {
  Conversation as ConversationSchema,
  Message as MessageSchema,
  StartConversationInput as StartConversationInputSchema,
} from "./chat.ts";
import {
  Availability as AvailabilitySchema,
  CountryCode as CountryCodeSchema,
  ErrorBody as ErrorBodySchema,
  ErrorCode as ErrorCodeSchema,
  PipelineStage as PipelineStageSchema,
} from "./common.ts";
import {
  CountryFacet as CountryFacetSchema,
  DeveloperRef as DeveloperRefSchema,
  FeedItem as FeedItemSchema,
  FeedPage as FeedPageSchema,
  FeedQuery as FeedQuerySchema,
} from "./feed.ts";
import {
  CompareEntry as CompareEntrySchema,
  CompareResult as CompareResultSchema,
  DiscoverItem as DiscoverItemSchema,
  DiscoverPage as DiscoverPageSchema,
  DiscoverQuery as DiscoverQuerySchema,
  PipelineEntry as PipelineEntrySchema,
  PipelineItem as PipelineItemSchema,
  PipelineList as PipelineListSchema,
  PipelineSummary as PipelineSummarySchema,
} from "./talent.ts";
import {
  CityFacet as CityFacetSchema,
  FeedRole as FeedRoleSchema,
  MyProject as MyProjectSchema,
  MyProjectsPage as MyProjectsPageSchema,
  MyRepoItem as MyRepoItemSchema,
  MyReposPage as MyReposPageSchema,
  PublishProjectInput as PublishProjectInputSchema,
  PublishProjectResult as PublishProjectResultSchema,
} from "./projects.ts";

export type AnalysisVM = z.infer<typeof AnalysisVMSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type Availability = z.infer<typeof AvailabilitySchema>;
export type CompareEntry = z.infer<typeof CompareEntrySchema>;
export type CompareResult = z.infer<typeof CompareResultSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type CountryCode = z.infer<typeof CountryCodeSchema>;
export type CountryFacet = z.infer<typeof CountryFacetSchema>;
export type CityFacet = z.infer<typeof CityFacetSchema>;
export type FeedRole = z.infer<typeof FeedRoleSchema>;
export type MyProject = z.infer<typeof MyProjectSchema>;
export type MyProjectsPage = z.infer<typeof MyProjectsPageSchema>;
export type MyRepoItem = z.infer<typeof MyRepoItemSchema>;
export type MyReposPage = z.infer<typeof MyReposPageSchema>;
export type PublishProjectInput = z.infer<typeof PublishProjectInputSchema>;
export type PublishProjectResult = z.infer<typeof PublishProjectResultSchema>;
export type DeveloperRef = z.infer<typeof DeveloperRefSchema>;
export type DiscoverItem = z.infer<typeof DiscoverItemSchema>;
export type DiscoverPage = z.infer<typeof DiscoverPageSchema>;
export type DiscoverQuery = z.infer<typeof DiscoverQuerySchema>;
export type ErrorBody = z.infer<typeof ErrorBodySchema>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type FeedItem = z.infer<typeof FeedItemSchema>;
export type FeedPage = z.infer<typeof FeedPageSchema>;
export type FeedQuery = z.infer<typeof FeedQuerySchema>;
export type Message = z.infer<typeof MessageSchema>;
export type PipelineEntry = z.infer<typeof PipelineEntrySchema>;
export type PipelineItem = z.infer<typeof PipelineItemSchema>;
export type PipelineList = z.infer<typeof PipelineListSchema>;
export type PipelineSummary = z.infer<typeof PipelineSummarySchema>;
export type PipelineStage = z.infer<typeof PipelineStageSchema>;
export type StartConversationInput = z.infer<typeof StartConversationInputSchema>;
