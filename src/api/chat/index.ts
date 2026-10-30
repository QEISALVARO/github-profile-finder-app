// ---------------------------------------------------------------------------
// FE-2 — chat adapter barrel (EXPO_PUBLIC_DS_CHAT).
// ---------------------------------------------------------------------------

import { getDataSource } from '@/config/dataSource';

import { chatApi } from './api';
import { chatMock } from './mock';
import type { ChatAdapter } from './types';

export * from './types';
export { CURRENT_USER_ID } from './mock';

export function getChatAdapter(): ChatAdapter {
  return getDataSource('chat') === 'api' ? chatApi : chatMock;
}
