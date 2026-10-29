// contracts/src/chat.ts
// SP-0 — Kontrak FE-BE
import { z } from "zod";

export const StartConversationInput = z.object({
  developerId: z.string().uuid(), projectId: z.string().uuid().optional(),
  company: z.string().min(1), roleTitle: z.string().min(1), body: z.string().min(1).max(4000),
});
export const Conversation = z.object({
  id: z.string(), recruiterId: z.string(), developerId: z.string(), projectId: z.string().nullable(),
  contextLabel: z.string().nullable(), status: z.enum(["active", "declined", "blocked"]), lastMessageAt: z.string().nullable(),
});
export const Message = z.object({
  id: z.string(), conversationId: z.string(), senderId: z.string(), body: z.string().min(1).max(4000),
  createdAt: z.string(), deliveredAt: z.string().nullable(), readAt: z.string().nullable(),
});
