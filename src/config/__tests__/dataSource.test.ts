import { DOMAINS, getDataSource, isProductionBuild } from '../dataSource';

/**
 * P0 — production tidak boleh memakai seed/mock walau env kosong atau salah
 * ketik. Dev/test tetap mock supaya aplikasi bisa dijalankan tanpa backend.
 */
describe('dataSource production policy', () => {
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
  const originalEnv = { ...process.env };
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    process.env = { ...originalEnv };
    warn.mockRestore();
  });

  function setProduction(): void {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  }

  it('never returns mock in production, even when the flag is mock or missing', () => {
    setProduction();
    process.env.EXPO_PUBLIC_DS_AUTH = 'mock';
    process.env.EXPO_PUBLIC_DS_FEED = '';
    process.env.EXPO_PUBLIC_DS_ANALYSIS = 'not-a-mode';

    expect(isProductionBuild()).toBe(true);
    for (const domain of DOMAINS) {
      expect(getDataSource(domain)).toBe('api');
    }
  });

  it('keeps mock available in development for every domain', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    for (const domain of DOMAINS) {
      delete process.env[
        `EXPO_PUBLIC_DS_${domain.toUpperCase()}` as keyof NodeJS.ProcessEnv
      ];
      expect(getDataSource(domain)).toBe('mock');
    }
  });

});
