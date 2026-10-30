// ---------------------------------------------------------------------------
// FE-2 — chat `api` adapter. Realtime chat lands with BE-5.
// ---------------------------------------------------------------------------

import type { Conversation, Message } from '@/api/contracts';

import { apiNotReady } from '@/api/errors';

import type { ChatAdapter, StartConversationArgs } from './types';

export const chatApi: ChatAdapter = {
  conversations(): Promise<Conversation[]> {
    throw apiNotReady('chat', 'GET /conversations (menunggu BE-5)');
  },
  messages(_conversationId: string): Promise<Message[]> {
    throw apiNotReady('chat', 'GET /messages (menunggu BE-5)');
  },
  findConversation(_developerLogin: string): Promise<Conversation | null> {
    throw apiNotReady('chat', 'GET /conversations?developer= (menunggu BE-5)');
  },
  sendMessage(_conversationId: string, _body: string): Promise<Message> {
    throw apiNotReady('chat', 'POST /messages (menunggu BE-5)');
  },
  startConversation(_input: StartConversationArgs): Promise<Message> {
    throw apiNotReady('chat', 'POST /conversations (menunggu BE-5)');
  },
};
