/**
 * Validasi parameter deep link sebelum dipakai untuk navigasi atau request.
 *
 * Return URL hanya boleh route internal yang dikenal. Query yang diteruskan
 * juga dibatasi (hanya `login` untuk analysis) agar URL eksternal, open
 * redirect, atau parameter asing tidak ikut masuk ke sesi berikutnya.
 */

const ALLOWED_PATHS = [
  '/explore/analysis',
  '/explore',
  '/talent',
  '/inbox',
  '/profile',
  '/onboarding',
];

/** Normalisasi username GitHub; null bila tidak valid. */
export function normalizeGitHubLogin(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  if (value.length === 0 || value.length > 39) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/.test(value)) return null;
  if (value.includes('--')) return null;
  return value;
}

/** Route analysis yang aman untuk kembali setelah login. */
export function analysisReturnPath(login: string): string {
  return `/explore/analysis?login=${encodeURIComponent(login)}`;
}

/**
 * Hanya mengembalikan path internal yang diizinkan. URL absolut, `//host`,
 * backslash, karakter kontrol, dan query asing ditolak (null).
 */
export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (value.length === 0 || value.length > 500) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return null;

  let parsed: URL;
  try {
    parsed = new URL(value, 'https://gitscope.invalid');
  } catch {
    return null;
  }
  if (parsed.origin !== 'https://gitscope.invalid') return null;

  const path = parsed.pathname.replace(/\/+$/, '') || '/';
  if (!ALLOWED_PATHS.includes(path)) return null;

  if (path === '/explore/analysis') {
    const login = normalizeGitHubLogin(parsed.searchParams.get('login'));
    if (!login) return null;
    return analysisReturnPath(login);
  }

  return path;
}
