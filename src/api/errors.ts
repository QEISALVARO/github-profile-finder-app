// ---------------------------------------------------------------------------
// FE-2 — data-layer errors.
//
// The `api` adapters are stubs until the backend integration phase. They throw
// a *clear* error instead of crashing so the UI can render its normal error
// state (ErrorState + retry) when a domain flag is flipped to `api` early.
// ---------------------------------------------------------------------------

import { DATA_SOURCE_ENV, type DomainKey } from '@/config/dataSource';

export class NotImplementedError extends Error {
  readonly domain: DomainKey;
  readonly operation: string;

  constructor(domain: DomainKey, operation: string) {
    super(
      `Adapter "api" untuk domain "${domain}" belum diimplementasikan ` +
        `(${operation}). Set ${DATA_SOURCE_ENV[domain]}=mock atau selesaikan ` +
        'fase integrasi backend.',
    );
    this.name = 'NotImplementedError';
    this.domain = domain;
    this.operation = operation;
  }
}

/**
 * Thrown when a domain is switched to `api` but the Supabase environment is
 * missing — again a readable message rather than a crash.
 */
export class MissingEnvironmentError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Mode "api" membutuhkan environment variable yang belum diisi: ` +
        `${missing.join(', ')}. Salin .env.example ke .env lalu isi nilainya.`,
    );
    this.name = 'MissingEnvironmentError';
    this.missing = missing;
  }
}

export function isNotImplemented(error: unknown): boolean {
  return error instanceof NotImplementedError;
}
