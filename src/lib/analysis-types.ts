// contracts/src/analysis.ts — salinan tier-SP-0 untuk runtime FE.
// SUMBER KEBENARAN tetap contracts/src/analysis.ts (Deno/zod). File ini hanya
// tipe TS ringan agar FE tidak bergantung ke zod; saat kontrak berubah,
// update KEDUA file dan catat di contracts/CHANGELOG.md.

export type AnalysisSource = 'fresh' | 'cache' | 'stale';

export interface AnalysisUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  htmlUrl: string;
  publicRepos: number;
  locationText: string | null;
  countryCode: string | null;
  city: string | null;
}

export interface AnalysisRepo {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  htmlUrl: string;
  isFork: boolean;
  hasVerifiedDemo: boolean;
  score: number;
}

export interface AnalysisEvidence {
  label: string;
  url?: string;
  reason: string;
}

export interface AnalysisBreakdown {
  originality: number;
  activity: number;
  proof: number;
  substance: number;
  depth: number;
  evidence: AnalysisEvidence[];
}

export interface AnalysisMetrics {
  originalRatio: number;
  originalCount: number;
  demoRatio: number;
  commitHealth: 'Consistent' | 'Irregular' | 'Sporadic';
  contributionDepth: 'Deep' | 'Moderate' | 'Light';
  streakWeeks: number;
  contributions12m: number;
  yoyPct: number;
}

export type AnalysisTier = 'high' | 'medium' | 'low';

export interface AnalysisVM {
  source: AnalysisSource;
  staleSince?: string;
  user: AnalysisUser;
  repos: AnalysisRepo[];
  authenticity: number;
  confidence: number;
  tier: AnalysisTier;
  scoreVersion: number;
  breakdown: AnalysisBreakdown;
  inferredRole: string;
  primaryLanguage: string;
  languageStats: { name: string; value: number }[];
  frameworks: string[];
  metrics: AnalysisMetrics;
  heatmap: number[];
}

export interface AnalyzeRequest {
  login: string;
  force?: boolean;
}

export type ErrorCode =
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'NOT_OPEN_TO_MESSAGES'
  | 'BLOCKED'
  | 'CONVERSATION_LIMIT';

export interface ErrorBody {
  code: ErrorCode;
  message: string;
  retry_after?: number;
}
