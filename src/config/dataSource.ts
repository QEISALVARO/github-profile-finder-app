// ---------------------------------------------------------------------------
// FE-2 — per-domain data source switch (mock | api).
//
// Every domain can be flipped independently through an EXPO_PUBLIC_ flag so
// the backend integration can land domain by domain without touching the UI:
//
//   EXPO_PUBLIC_DS_AUTH=mock|api   (default: mock)
//   EXPO_PUBLIC_DS_FEED=mock|api
//   EXPO_PUBLIC_DS_ANALYSIS=mock|api
//   EXPO_PUBLIC_DS_TALENT=mock|api
//   EXPO_PUBLIC_DS_CHAT=mock|api
//   EXPO_PUBLIC_DS_REPORTS=mock|api
//
// NOTE: Metro only inlines *static* `process.env.EXPO_PUBLIC_*` member reads,
// so the values are collected in a literal record below instead of being read
// with a computed key.
// ---------------------------------------------------------------------------

export const DOMAINS = ['auth', 'feed', 'analysis', 'talent', 'chat', 'reports'] as const;

export type DomainKey = (typeof DOMAINS)[number];

export type DataSource = 'mock' | 'api';

/**
 * Static reads only — see the module comment. Re-evaluated on every call so a
 * test (or a future config screen) can flip a flag without re-importing.
 */
function readFlags(): Record<DomainKey, string | undefined> {
  return {
    auth: process.env.EXPO_PUBLIC_DS_AUTH,
    feed: process.env.EXPO_PUBLIC_DS_FEED,
    analysis: process.env.EXPO_PUBLIC_DS_ANALYSIS,
    talent: process.env.EXPO_PUBLIC_DS_TALENT,
    chat: process.env.EXPO_PUBLIC_DS_CHAT,
    reports: process.env.EXPO_PUBLIC_DS_REPORTS,
  };
}

/** Env var name per domain, used by error messages and `.env.example`. */
export const DATA_SOURCE_ENV: Record<DomainKey, string> = {
  auth: 'EXPO_PUBLIC_DS_AUTH',
  feed: 'EXPO_PUBLIC_DS_FEED',
  analysis: 'EXPO_PUBLIC_DS_ANALYSIS',
  talent: 'EXPO_PUBLIC_DS_TALENT',
  chat: 'EXPO_PUBLIC_DS_CHAT',
  reports: 'EXPO_PUBLIC_DS_REPORTS',
};

/**
 * Resolve the adapter for one domain. Missing flag → `mock`; an unrecognised
 * value falls back to `mock` with a warning (never a crash) so a typo in the
 * env file cannot take the app down.
 */
export function getDataSource(domain: DomainKey): DataSource {
  const raw = (readFlags()[domain] ?? '').trim().toLowerCase();
  if (raw === '' || raw === 'mock') return 'mock';
  if (raw === 'api') return 'api';

  console.warn(
    `[dataSource] nilai tidak dikenal untuk ${DATA_SOURCE_ENV[domain]}: "${raw}" — memakai "mock".`,
  );
  return 'mock';
}

/** Convenience for tests / UI copy: are we running fully offline? */
export function isMockMode(domain: DomainKey): boolean {
  return getDataSource(domain) === 'mock';
}
