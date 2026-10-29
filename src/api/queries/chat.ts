// ---------------------------------------------------------------------------
// FE-2 — chat hooks (PRD v2 §12). Optimistic in-memory sends: the mutation
// writes through the adapter and invalidates the thread so `sent` messages
// survive closing and reopening the sheet.
// ---------------------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getChatAdapter, type Conversation, type Message, type StartConversationArgs } from '@/api/chat';

export const CHAT_QUERY_KEY = 'chat';

export function useConversations() {
  return useQuery({
    queryKey: [CHAT_QUERY_KEY, 'conversations'],
    queryFn: (): Promise<Conversation[]> => getChatAdapter().conversations(),
  });
}

export function useFindConversation(developerLogin: string | null) {
  return useQuery({
    queryKey: [CHAT_QUERY_KEY, 'conversation', developerLogin ?? ''],
    queryFn: (): Promise<Conversation | null> =>
      getChatAdapter().findConversation(developerLogin ?? ''),
    enabled: developerLogin !== null && developerLogin !== '',
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: [CHAT_QUERY_KEY, 'messages', conversationId ?? ''],
    queryFn: (): Promise<Message[]> => getChatAdapter().messages(conversationId ?? ''),
    enabled: conversationId !== null && conversationId !== '',
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { conversationId: string; body: string }) =>
      getChatAdapter().sendMessage(input.conversationId, input.body),
    onSuccess: (_message, input) => {
      void queryClient.invalidateQueries({
        queryKey: [CHAT_QUERY_KEY, 'messages', input.conversationId],
      });
      void queryClient.invalidateQueries({ queryKey: [CHAT_QUERY_KEY, 'conversations'] });
    },
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartConversationArgs) =>
      getChatAdapter().startConversation(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CHAT_QUERY_KEY] });
    },
  });
}
