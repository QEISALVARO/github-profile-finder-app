// ---------------------------------------------------------------------------
// FE-2 — auth adapter barrel (EXPO_PUBLIC_DS_AUTH).
// ---------------------------------------------------------------------------

import { getDataSource } from '@/config/dataSource';

import { authApi } from './api';
import { authMock } from './mock';
import type { AuthAdapter } from './types';

export * from './types';

export function getAuthAdapter(): AuthAdapter {
  return getDataSource('auth') === 'api' ? authApi : authMock;
}
