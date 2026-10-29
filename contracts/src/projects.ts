// contracts/src/projects.ts
// BE-3 — Kontrak publikasi proyek & feed (ditinjau FE + BE).
// Impor memakai ekstensi .ts mengikuti keputusan stabilisasi.
import { z } from "zod";
import { CountryCode } from "./common.ts";

export const FeedRole = z.enum(["Front-End", "Back-End", "Mobile", "Data"]);

export const MyRepoItem = z.object({
  githubRepoId: z.number().int().positive(),
  fullName: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stars: z.number().int().nonnegative(),
  pushedAt: z.string().nullable(),
  isFork: z.boolean(),
  isArchived: z.boolean(),
  homepageUrl: z.string().nullable(),
  alreadyPublished: z.boolean(),
  eligible: z.boolean(),
  ineligibleReason: z.enum(["FORK", "EMPTY", "NOT_OWNER"]).nullable(),
});
export const MyReposPage = z.object({ items: z.array(MyRepoItem), nextCursor: z.string().nullable() });

export const PublishProjectInput = z.object({
  githubRepoId: z.number().int().positive(),
  role: FeedRole.optional(),
  demoUrl: z.string().url().nullable().optional(),
  description: z.string().max(500).optional(),
});
export const PublishProjectResult = z.object({
  projectId: z.string().uuid(),
  name: z.string(),
  role: FeedRole,
  stack: z.array(z.object({ name: z.string(), percent: z.number().int().min(0).max(100) })).max(3),
  active: z.boolean(),
  demoUrl: z.string().nullable(),
  demoVerified: z.boolean(),
  score: z.number().int().min(0).max(100),
  published: z.boolean(),
  visible: z.boolean(),
  countryCode: CountryCode.nullable(),
});

export const CityFacet = z.object({
  city: z.string(),
  count: z.union([z.number().int(), z.literal("<5")]),
});
