// ---------------------------------------------------------------------------
// FE-2 — chat domain contract + adapter interface (PRD v2 §12).
// ---------------------------------------------------------------------------

import type { Conversation, Message, StartConversationInput } from '@/api/contracts';

export type { Conversation, Message, StartConversationInput };

/**
 * Adapter-level input: the client knows the developer's GitHub login, the
 * server maps it to a `developerId` (PRD v2 §12 first-message context).
 */
export type StartConversationArgs = Omit<StartConversationInput, 'developerId' | 'projectId'> & {
  developerLogin: string;
  projectId?: string;
};

/**
 * Minimum the UI needs to render a chat partner. `openToMessages` drives the
 * POL-4 rule: developers who opted out get an explanation instead of the
 * composer (FE-6).
 */
export type ChatPerson = {
  login: string;
  name: string;
  avatarUrl: string;
  openToMessages?: boolean;
};

export interface ChatAdapter {
  conversations(): Promise<Conversation[]>;
  messages(conversationId: string): Promise<Message[]>;
  /** Existing thread for a developer, or `null` → first-message composer. */
  findConversation(developerLogin: string): Promise<Conversation | null>;
  /** Appends an outgoing message; empty/whitespace bodies are rejected. */
  sendMessage(conversationId: string, body: string): Promise<Message>;
  /** First message carries company + role title (PRD v2 §12 / POL-4). */
  startConversation(input: StartConversationArgs): Promise<Message>;
}

/** Incoming messages without `readAt` count as unread (FR-I3 badge). */
export function countUnread(
  messages: Message[],
  conversationId: string,
  currentUserId: string,
): number {
  return messages.filter(
    (message) =>
      message.conversationId === conversationId &&
      message.senderId !== currentUserId &&
      message.readAt === null,
  ).length;
}
