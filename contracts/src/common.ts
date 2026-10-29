// contracts/src/common.ts
// SP-0 — Kontrak FE-BE (jangan ubah tanpa PR ditinjau FE & BE)
import { z } from "zod";

export const CountryCode = z.string().regex(/^[A-Z]{2}$/);
export const Availability = z.enum(["open_to_work", "freelance", "not_available"]);
export const PipelineStage = z.enum(["saved", "interviewing", "hired"]);
export const ErrorCode = z.enum([
  "NOT_FOUND", "RATE_LIMITED", "UPSTREAM_ERROR", "UNAUTHORIZED", "FORBIDDEN", "VALIDATION",
  "NOT_OPEN_TO_MESSAGES", "BLOCKED", "CONVERSATION_LIMIT",
]);
export const ErrorBody = z.object({
  code: ErrorCode, message: z.string(), retry_after: z.number().int().positive().optional(),
});
