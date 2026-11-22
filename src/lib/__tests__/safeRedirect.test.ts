import {
  analysisReturnPath,
  normalizeGitHubLogin,
  sanitizeNextPath,
} from '@/lib/safeRedirect';

describe('normalizeGitHubLogin', () => {
  it('normalizes a valid GitHub username', () => {
    expect(normalizeGitHubLogin('  Angga-Risky ')).toBe('angga-risky');
    expect(normalizeGitHubLogin('octocat')).toBe('octocat');
  });

  it.each([
    '',
    '-leading',
    'trailing-',
    'double--hyphen',
    'has space',
    'has_underscore',
    'a'.repeat(40),
    'https://github.com/octocat',
  ])('rejects invalid username %p', (value) => {
    expect(normalizeGitHubLogin(value)).toBeNull();
  });
});

describe('sanitizeNextPath', () => {
  it('keeps an allowlisted analysis route and strips unknown query params', () => {
    expect(
      sanitizeNextPath('/explore/analysis?login=Angga-Risky&confirmed=1&redirect=https://evil.test'),
    ).toBe('/explore/analysis?login=angga-risky');
  });

  it('keeps other allowlisted internal routes', () => {
    expect(sanitizeNextPath('/explore')).toBe('/explore');
    expect(sanitizeNextPath('/talent')).toBe('/talent');
  });

  it.each([
    'https://evil.example/phish',
    '//evil.example/phish',
    '/\\evil.example',
    'javascript:alert(1)',
    '/admin',
    '/explore/analysis?login=not%20a%20login',
    '/explore/analysis',
    '',
  ])('rejects unsafe return URL %p', (value) => {
    expect(sanitizeNextPath(value)).toBeNull();
  });
});

describe('analysisReturnPath', () => {
  it('encodes the candidate login', () => {
    expect(analysisReturnPath('angga-risky')).toBe('/explore/analysis?login=angga-risky');
  });
});
