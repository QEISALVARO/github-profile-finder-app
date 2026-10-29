// contracts/src/feed.ts
// SP-0 — Kontrak FE-BE
import { z } from "zod";
import { CountryCode, Availability } from "./common";

export const FeedQuery = z.object({
  q: z.string().optional(), role: z.string().optional(), countries: z.array(CountryCode).optional(),
  city: z.string().optional(), activeOnly: z.boolean().optional(), minScore: z.number().int().min(0).max(100).optional(),
  cursor: z.string().nullable().optional(), limit: z.number().int().min(1).max(50).optional(),
  include_unknown: z.boolean().optional(),
});
export const DeveloperRef = z.object({
  login: z.string(), name: z.string(), avatarUrl: z.string(), availability: Availability,
});
export const FeedItem = z.object({
  id: z.string(), name: z.string(), description: z.string().nullable(), role: z.string(),
  stack: z.array(z.object({ name: z.string(), percent: z.number() })),
  countryCode: CountryCode.nullable(), city: z.string().nullable(), score: z.number().int(),
  active: z.boolean(), demoUrl: z.string().nullable(), demoVerified: z.boolean(), stars: z.number().int(),
  developer: DeveloperRef,
});
export const FeedPage = z.object({ items: z.array(FeedItem), nextCursor: z.string().nullable(), totalCount: z.number().int() });
export const CountryFacet = z.object({ iso2: CountryCode, count: z.union([z.number().int(), z.literal("<5")]) });

