// ---------------------------------------------------------------------------
// FE-2 — data-layer errors.
//
// Every adapter either resolves contract data or throws an `AppError` (the
// SP-0 `ErrorBody` plus the HTTP status). The UI never sees adapter-specific
// errors: `ErrorState` maps the code to a friendly Indonesian message.
//
// Domains whose backend has not landed yet throw `ApiNotReadyError`. It is
// deliberately *not* a fake dataset (POL-5): flipping a flag early shows
// "Fitur ini belum tersedia di backend", never invented numbers.
// ---------------------------------------------------------------------------

import type { ErrorBody } from '@/api/contracts';
import type { DomainKey } from '@/config/dataSource';

/** SP-0 error body + the HTTP status the adapter received. */
export type AppError = ErrorBody & { status: number };

/** Copy shown for every not-yet-implemented `api` adapter (PRD v2 §15). */
export const API_NOT_READY_MESSAGE = 'Fitur ini belum tersedia di backend.';

export class ApiNotReadyError extends Error {
  readonly domain: DomainKey;
  readonly operation: string;

  constructor(domain: DomainKey, operation: string) {
    super(API_NOT_READY_MESSAGE);
    this.name = 'ApiNotReadyError';
    this.domain = domain;
    this.operation = operation;
  }

  /** The AppError shape the adapters/UI agree on. */
  toAppError(): AppError {
    return { code: 'UPSTREAM_ERROR', message: API_NOT_READY_MESSAGE, status: 503 };
  }
}

export function apiNotReady(domain: DomainKey, operation: string): ApiNotReadyError {
  return new ApiNotReadyError(domain, operation);
}

export function isApiNotReady(error: unknown): error is ApiNotReadyError {
  return error instanceof ApiNotReadyError;
}

/**
 * Thrown when a domain is switched to `api` but the Supabase environment is
 * missing — a readable message instead of a native crash.
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

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.code === 'string' && typeof record.status === 'number';
}

/**
 * Normalise anything an adapter throws into an `AppError`. Unknown failures
 * become `UPSTREAM_ERROR` so the screen still renders its error state.
 */
export function toAppError(
  error: unknown,
  fallbackMessage = 'Terjadi kesalahan saat mengambil data. Coba lagi.',
): AppError {
  if (isAppError(error)) return error;
  if (isApiNotReady(error)) return error.toAppError();
  if (error instanceof MissingEnvironmentError) {
    return { code: 'UNAUTHORIZED', message: error.message, status: 500 };
  }
  if (error instanceof Error && error.message.length > 0) {
    return { code: 'UPSTREAM_ERROR', message: error.message, status: 502 };
  }
  return { code: 'UPSTREAM_ERROR', message: fallbackMessage, status: 502 };
}

/** FR-E9 / FR-A1 — friendly copy per SP-0 `ErrorCode`. */
export function errorMessage(error: unknown): string {
  const app = toAppError(error);
  switch (app.code) {
    case 'NOT_FOUND':
    case 'VALIDATION':
      return 'Profil tidak ditemukan. Periksa kembali username.';
    case 'RATE_LIMITED':
      return typeof app.retry_after === 'number'
        ? `Batas analisis tercapai. Coba lagi dalam ${app.retry_after} detik.`
        : 'Batas analisis tercapai. Coba lagi nanti.';
    case 'UNAUTHORIZED':
      return 'Sesi berakhir. Masuk kembali untuk melanjutkan.';
    case 'FORBIDDEN':
      return 'Akses ditolak. Hubungi admin bila ini keliru.';
    case 'NOT_OPEN_TO_MESSAGES':
      return 'Developer ini tidak menerima pesan.';
    case 'BLOCKED':
      return 'Percakapan diblokir.';
    case 'CONVERSATION_LIMIT':
      return 'Batas percakapan tercapai.';
    default:
      return app.message.length > 0 ? app.message : 'Terjadi kesalahan. Coba lagi.';
  }
}

export type ErrorCopy = {
  title: string;
  message: string;
  /** `rate_limited` seconds left, surfaced by `ErrorState`. */
  retryAfter?: number;
  /** `UPSTREAM_ERROR` → offer "Buka di GitHub". */
  showGithub?: boolean;
};

/** `ErrorState` copy: title + body, per SP-0 code (PRD v2 §15). */
export function describeError(error: unknown): ErrorCopy {
  const app = toAppError(error);
  const base = { message: errorMessage(app) };

  switch (app.code) {
    case 'NOT_FOUND':
    case 'VALIDATION':
      return { ...base, title: 'Profil tidak ditemukan' };
    case 'RATE_LIMITED':
      return {
        ...base,
        title: 'Terlalu banyak permintaan',
        ...(typeof app.retry_after === 'number' ? { retryAfter: app.retry_after } : {}),
      };
    case 'UNAUTHORIZED':
      return { ...base, title: 'Sesi berakhir' };
    case 'FORBIDDEN':
      return { ...base, title: 'Akses ditolak' };
    default:
      return { ...base, title: 'Data gagal dimuat', showGithub: true };
  }
}

/** Retry policy for TanStack Query (FE-2 §2.3). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiNotReady(error) || error instanceof MissingEnvironmentError) return false;
  if (isAppError(error)) {
    // Deterministic failures: retrying only delays the message the user needs.
    if (
      ['NOT_FOUND', 'VALIDATION', 'UNAUTHORIZED', 'FORBIDDEN', 'BLOCKED', 'RATE_LIMITED'].includes(
        error.code,
      )
    ) {
      return false;
    }
  }
  return failureCount < 1;
}
