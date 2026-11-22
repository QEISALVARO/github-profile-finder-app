// ---------------------------------------------------------------------------
// FE-2 — per-domain data source switch (mock | api).
//
// Every domain can be flipped independently through an EXPO_PUBLIC_ flag so
// the backend integration can land domain by domain without touching the UI:
//
//   EXPO_PUBLIC_DS_AUTH=mock|api   (default: mock di dev/test)
//   EXPO_PUBLIC_DS_FEED=mock|api
//   EXPO_PUBLIC_DS_ANALYSIS=mock|api
//   EXPO_PUBLIC_DS_TALENT=mock|api
//   EXPO_PUBLIC_DS_CHAT=mock|api
//   EXPO_PUBLIC_DS_REPORTS=mock|api
//
// P0: production build tidak pernah memakai mock — lihat `getDataSource` dan
// `isProductionBuild` di bawah.
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
 * Production build? `__DEV__` di-inline oleh Metro saat build (bukan flag yang
 * bisa diubah user lewat UI), jadi aman dipakai sebagai gerbang kebijakan
 * data-source. Fallback `NODE_ENV` menutup kasus non-RN (tools/CI).
 */
export function isProductionBuild(): boolean {
  if (typeof __DEV__ !== 'undefined') return !__DEV__;
  return process.env.NODE_ENV === 'production';
}

/**
 * Resolve the adapter for one domain.
 *
 * Kebijakan P0 (anti data-mock menyesatkan):
 *  - development/test: flag kosong/`mock`/tidak dikenal → `mock` (dengan
 *    warning untuk nilai tidak dikenal), supaya unit test & demo tetap jalan.
 *  - production: **tidak pernah** `mock`. Flag kosong/`mock`/tidak dikenal
 *    dipaksa ke `api` — adapter `api` lalu melempar `MissingEnvironmentError`
 *    (konfigurasi belum diisi) atau `apiNotReady` ("Fitur ini belum tersedia
 *    di backend"), yaitu state jujur, bukan seed palsu.
 */
export function getDataSource(domain: DomainKey): DataSource {
  const raw = (readFlags()[domain] ?? '').trim().toLowerCase();
  const env = DATA_SOURCE_ENV[domain];

  if (raw === 'api') return 'api';

  if (raw === '' || raw === 'mock') {
    if (isProductionBuild()) {
      console.warn(
        `[dataSource] ${env} tidak di-set "api" pada production build — ` +
          'memakai adapter api (mock dilarang di production).',
      );
      return 'api';
    }
    return 'mock';
  }

  if (isProductionBuild()) {
    console.warn(
      `[dataSource] nilai tidak dikenal untuk ${env}: "${raw}" — memakai "api" ` +
        '(production tanpa mock).',
    );
    return 'api';
  }

  console.warn(`[dataSource] nilai tidak dikenal untuk ${env}: "${raw}" — memakai "mock".`);
  return 'mock';
}

/** Convenience for tests / UI copy: are we running fully offline? */
export function isMockMode(domain: DomainKey): boolean {
  return getDataSource(domain) === 'mock';
}
