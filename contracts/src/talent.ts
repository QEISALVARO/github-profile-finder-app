// contracts/src/talent.ts
// SP-0 — Kontrak FE-BE
import { z } from "zod";
import { CountryCode, Availability, PipelineStage } from "./common.ts";

export const DiscoverQuery = z.object({
  role: z.string().optional(), minScore: z.number().int().min(70).max(95).optional(),
  countries: z.array(CountryCode).optional(), language: z.string().optional(),
  availability: Availability.optional(), cursor: z.string().nullable().optional(), limit: z.number().int().min(1).max(50).optional(),
});
export const DiscoverItem = z.object({
  login: z.string(), name: z.string(), avatarUrl: z.string(), role: z.string(), primaryLanguage: z.string(),
  countryCode: CountryCode.nullable(), city: z.string().nullable(), score: z.number().int(), availability: Availability,
});
export const DiscoverPage = z.object({ items: z.array(DiscoverItem), nextCursor: z.string().nullable(), totalCount: z.number().int() });
export const PipelineEntry = z.object({
  id: z.string(), githubLogin: z.string(), stage: PipelineStage, note: z.string().nullable(), updatedAt: z.string(),
});

// v0.3.0 (BE-4) — pipeline & compare. Field identitas developer hanya terisi
// bila login tersebut developer `listed` (D5); selainnya null.
export const PipelineItem = PipelineEntry.extend({
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.string().nullable(),
  score: z.number().int().nullable(),
});
export const PipelineSummary = z.object({
  saved: z.number().int().nonnegative(),
  interviewing: z.number().int().nonnegative(),
  hired: z.number().int().nonnegative(),
});
export const PipelineList = z.object({
  entries: z.array(PipelineItem),
  summary: PipelineSummary,
});
export const CompareEntry = z.object({
  login: z.string(),
  name: z.string(),
  avatarUrl: z.string(),
  role: z.string(),
  primaryLanguage: z.string(),
  score: z.number().int(),
  originalCount: z.number().int().nonnegative(),
  streakWeeks: z.number().int().nonnegative(),
  availability: Availability.nullable(),
  countryCode: CountryCode.nullable(),
  city: z.string().nullable(),
});
export const CompareResult = z.array(CompareEntry).length(2);

