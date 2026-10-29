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

