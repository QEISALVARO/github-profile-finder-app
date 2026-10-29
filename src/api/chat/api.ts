// ---------------------------------------------------------------------------
// FE-2 — chat `api` adapter (stub). Realtime lands with R5.
// ---------------------------------------------------------------------------

import type { Conversation, Message } from '@/api/contracts';

import { NotImplementedError } from '@/api/errors';

import type { ChatAdapter, StartConversationArgs } from './types';

export const chatApi: ChatAdapter = {
  conversations(): Promise<Conversation[]> {
    throw new NotImplementedError('chat', 'GET /conversations');
  },
  messages(_conversationId: string): Promise<Message[]> {
    throw new NotImplementedError('chat', 'GET /messages');
  },
  findConversation(_developerLogin: string): Promise<Conversation | null> {
    throw new NotImplementedError('chat', 'GET /conversations?developer=');
  },
  sendMessage(_conversationId: string, _body: string): Promise<Message> {
    throw new NotImplementedError('chat', 'POST /messages');
  },
  startConversation(_input: StartConversationArgs): Promise<Message> {
    throw new NotImplementedError('chat', 'POST /conversations');
  },
};
