import {
  ANALYZE_NOT_FOUND_MESSAGE,
  ANALYZE_STALE_MESSAGE,
  analyzeErrorMessage,
  isValidLogin,
  vmToGithubRepos,
  vmToGithubUser,
} from '@/lib/analyze';
import type { AnalysisVM } from '../../../contracts/src/types.ts';

// Mock global (src/lib/__mocks__/supabase.ts): modul asli menarik supabase-js
// yang butuh WebSocket native Node 22+, sedangkan tes ini tidak butuh jaringan.
jest.mock('@/lib/supabase');

const vm = (overrides: Partial<AnalysisVM> = {}): AnalysisVM => ({
  source: 'fresh',
  user: {
    login: 'octocat',
    name: 'The Octocat',
    avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
    bio: 'GitHub mascot',
    htmlUrl: 'https://github.com/octocat',
    publicRepos: 8,
    locationText: 'San Francisco, CA',
    countryCode: 'US',
    city: 'San Francisco',
  },
  repos: [
    {
      id: 1,
      name: 'Hello-World',
      description: 'demo',
      language: 'JavaScript',
      htmlUrl: 'https://github.com/octocat/Hello-World',
      isFork: false,
      hasVerifiedDemo: true,
      score: 80,
    },
  ],
  authenticity: 72,
  confidence: 65,
  tier: 'medium',
  scoreVersion: 2,
  breakdown: { originality: 25, activity: 18, proof: 8, substance: 14, depth: 7, evidence: [] },
  inferredRole: 'Back-End',
  primaryLanguage: 'JavaScript',
  languageStats: [{ name: 'JavaScript', value: 100 }],
  frameworks: ['Node.js'],
  metrics: {
    originalRatio: 0.875,
    originalCount: 7,
    demoRatio: 0.5,
    commitHealth: 'Sporadic',
    contributionDepth: 'Light',
    streakWeeks: 2,
    contributions12m: 89,
    yoyPct: -12.5,
  },
  heatmap: Array.from({ length: 84 }, (_, i) => i % 5),
  ...overrides,
});

describe('analyze lib (R2 FE-BE)', () => {
  it('menerima login valid dan menolak yang ilegal', () => {
    expect(isValidLogin('octocat')).toBe(true);
    expect(isValidLogin('valid-user123')).toBe(true);
    expect(isValidLogin('-invalid')).toBe(false);
    expect(isValidLogin('user--name')).toBe(false);
    expect(isValidLogin('')).toBe(false);
  });

  it('memetakan AnalysisVM ke GithubUser/GithubRepo tanpa mengarang angka', () => {
    const v = vm();
    const user = vmToGithubUser(v);
    expect(user.login).toBe('octocat');
    expect(user.avatar_url).toBe('https://avatars.githubusercontent.com/u/583231');

    const repos = vmToGithubRepos(v);
    expect(repos).toHaveLength(1);
    // Demo terverifikasi → homepage terisi URL repo; fork → kosong.
    expect(repos[0].homepage).toBe('https://github.com/octocat/Hello-World');
    expect(repos[0].fork).toBe(false);
  });

  it('menandai homepage null bila demo tidak terverifikasi', () => {
    const v = vm({
      repos: [
        {
          id: 2,
          name: 'Forked',
          description: null,
          language: null,
          htmlUrl: 'https://github.com/octocat/Forked',
          isFork: true,
          hasVerifiedDemo: false,
          score: 40,
        },
      ],
    });
    const repos = vmToGithubRepos(v);
    expect(repos[0].homepage).toBeNull();
  });

  it('menerjemahkan error BE ke kalimat UI', () => {
    expect(analyzeErrorMessage({ code: 'NOT_FOUND', message: 'x', status: 404 })).toBe(
      ANALYZE_NOT_FOUND_MESSAGE,
    );
    expect(
      analyzeErrorMessage({ code: 'RATE_LIMITED', message: 'x', retry_after: 45, status: 429 }),
    ).toBe('Batas analisis tercapai. Coba lagi dalam 45 detik.');
    expect(analyzeErrorMessage({ code: 'FORBIDDEN', message: 'x', status: 403 })).toBe(
      'Analisis profil ini memerlukan akses recruiter.',
    );
    expect(ANALYZE_STALE_MESSAGE.length).toBeGreaterThan(0);
  });
});
