// ---------------------------------------------------------------------------
// FE-2 — mock chat adapter: in-memory conversations + messages seeded to match
// PRD §7.3 FR-I3 (three conversations, 3 unread total) and FR-C4 (the opening
// bubbles of the Spoon-Knife thread). Everything stays in memory for the life
// of the process, so sent messages survive closing and reopening the sheet.
// ---------------------------------------------------------------------------

import type { Conversation, Message } from '@/api/contracts';

import type { ChatAdapter, StartConversationArgs } from './types';

/** The signed-in recruiter. Kept literal so the adapter never reads the store. */
export const CURRENT_USER_ID = 'recruiter-me';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function iso(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString();
}

function seed(): { conversations: Conversation[]; messages: Message[] } {
  const conversations: Conversation[] = [
    {
      id: 'conv-sindresorhus',
      recruiterId: CURRENT_USER_ID,
      developerId: 'sindresorhus',
      projectId: null,
      contextLabel: 'Spoon-Knife',
      status: 'active',
      lastMessageAt: iso(2 * MINUTE),
    },
    {
      id: 'conv-yyx990803',
      recruiterId: CURRENT_USER_ID,
      developerId: 'yyx990803',
      projectId: null,
      contextLabel: 'Front-End',
      status: 'active',
      lastMessageAt: iso(2 * HOUR),
    },
    {
      id: 'conv-cassidoo',
      recruiterId: CURRENT_USER_ID,
      developerId: 'cassidoo',
      projectId: null,
      contextLabel: 'Full-Stack',
      status: 'active',
      lastMessageAt: iso(3 * HOUR),
    },
  ];

  const messages: Message[] = [
    // #1 — Spoon-Knife thread (FR-C4 bubbles, newest last, 1 unread).
    msg('m1-1', 'conv-sindresorhus', 'sindresorhus', 'Hi! Terima kasih sudah melihat profil dan project saya.', 22 * MINUTE, 21 * MINUTE),
    msg('m1-2', 'conv-sindresorhus', CURRENT_USER_ID, 'Halo, saya tertarik dengan project Spoon-Knife. Bisa ceritakan keputusan teknis utamanya?', 12 * MINUTE, 11 * MINUTE),
    msg('m1-3', 'conv-sindresorhus', 'sindresorhus', 'Tentu, arsitekturnya menggunakan...', 2 * MINUTE, null),
    // #2 — two unread, newest keeps the FR-I3 preview copy.
    msg('m2-1', 'conv-yyx990803', 'yyx990803', 'Sure — I have a few questions about the role first.', 3 * HOUR, null),
    msg('m2-2', 'conv-yyx990803', 'yyx990803', "Thanks for reaching out. Let's talk!", 2 * HOUR, null),
    // #3 — read, no badge.
    msg('m3-1', 'conv-cassidoo', 'cassidoo', "Thanks for reaching out. Let's talk!", 4 * HOUR, 3 * HOUR + 60_000),
  ];

  return { conversations, messages };
}

function msg(
  id: string,
  conversationId: string,
  senderId: string,
  body: string,
  createdAgo: number,
  readAtAgo: number | null,
): Message {
  return {
    id,
    conversationId,
    senderId,
    body,
    createdAt: iso(createdAgo),
    deliveredAt: iso(Math.max(0, createdAgo - 5_000)),
    readAt: readAtAgo === null ? null : iso(readAtAgo),
  };
}

let store = seed();

/** Test seam — restore the seeded threads between suites. */
export function resetChat(): void {
  store = seed();
}

function nextId(prefix: string): string {
  return `${prefix}-${store.messages.length + 1}-${Date.now().toString(36)}`;
}

export const chatMock: ChatAdapter = {
  async conversations(): Promise<Conversation[]> {
    return store.conversations
      .slice()
      .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
  },

  async messages(conversationId: string): Promise<Message[]> {
    return store.messages
      .filter((message) => message.conversationId === conversationId)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async findConversation(developerLogin: string): Promise<Conversation | null> {
    return store.conversations.find((entry) => entry.developerId === developerLogin) ?? null;
  },

  async sendMessage(conversationId: string, body: string): Promise<Message> {
    const trimmed = body.trim();
    if (trimmed === '') throw new Error('Pesan kosong ditolak.');

    const created = {
      id: nextId('m'),
      conversationId,
      senderId: CURRENT_USER_ID,
      body: trimmed,
      createdAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      readAt: null,
    };

    store = {
      conversations: store.conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, lastMessageAt: created.createdAt }
          : conversation,
      ),
      messages: [...store.messages, created],
    };

    return created;
  },

  async startConversation(input: StartConversationArgs): Promise<Message> {
    const trimmed = input.body.trim();
    if (trimmed === '') throw new Error('Pesan kosong ditolak.');

    let conversation = store.conversations.find(
      (entry) => entry.developerId === input.developerLogin,
    );

    if (!conversation) {
      conversation = {
        id: nextId('conv'),
        recruiterId: CURRENT_USER_ID,
        developerId: input.developerLogin,
        projectId: null,
        contextLabel: null,
        status: 'active',
        lastMessageAt: null,
      };
      store = { ...store, conversations: [...store.conversations, conversation] };
    }

    return chatMock.sendMessage(conversation.id, trimmed);
  },
};
