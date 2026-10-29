// contracts/src/analysis.ts
// SP-0 — Kontrak FE-BE
import { z } from "zod";
import { CountryCode } from "./common.ts";

export const Evidence = z.object({ label: z.string(), url: z.string().url().optional(), reason: z.string() });
export const AnalysisVM = z.object({
  source: z.enum(["fresh", "cache", "stale"]), staleSince: z.string().optional(),
  user: z.object({
    login: z.string(), name: z.string().nullable(), avatarUrl: z.string(), bio: z.string().nullable(),
    htmlUrl: z.string(), publicRepos: z.number().int().nonnegative(), locationText: z.string().nullable(),
    countryCode: CountryCode.nullable(), city: z.string().nullable(),
  }),
  repos: z.array(z.object({
    id: z.number(), name: z.string(), description: z.string().nullable(), language: z.string().nullable(),
    htmlUrl: z.string(), isFork: z.boolean(), hasVerifiedDemo: z.boolean(), score: z.number().int().min(0).max(100),
  })).max(8),
  authenticity: z.number().int().min(0).max(100), confidence: z.number().int().min(0).max(100),
  tier: z.enum(["high", "medium", "low"]), scoreVersion: z.number().int().positive(),
  breakdown: z.object({
    originality: z.number(), activity: z.number(), proof: z.number(), substance: z.number(), depth: z.number(),
    evidence: z.array(Evidence),
  }),
  inferredRole: z.string(), primaryLanguage: z.string(),
  languageStats: z.array(z.object({ name: z.string(), value: z.number() })).max(3),
  frameworks: z.array(z.string()),
  metrics: z.object({
    originalRatio: z.number(), originalCount: z.number().int(), demoRatio: z.number(),
    commitHealth: z.enum(["Consistent", "Irregular", "Sporadic"]),
    contributionDepth: z.enum(["Deep", "Moderate", "Light"]),
    streakWeeks: z.number().int(), contributions12m: z.number().int(), yoyPct: z.number(),
  }),
  heatmap: z.array(z.number().int().min(0).max(4)).length(84),
});
export const AnalyzeRequest = z.object({ login: z.string().min(1), force: z.boolean().optional() });

