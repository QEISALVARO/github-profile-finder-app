// @ts-nocheck
// supabase/functions/_shared/scoring/derive.ts
// Perhitungan metrik turunan, statistik bahasa, dan indikator aktivitas developer (PRD §4.6).

import { Facts, RepoFact } from "../github/facts.ts";

const IGNORED_LANGUAGES = new Set([
  "dockerfile",
  "makefile",
  "batchfile",
  "cmake",
  "shell",
]);

export interface LanguageStat {
  name: string;
  value: number; // Persentase bulat (0..100)
}

export interface DerivedMetrics {
  originalRatio: number;
  originalCount: number;
  demoRatio: number;
  commitHealth: "Consistent" | "Irregular" | "Sporadic";
  contributionDepth: "Deep" | "Moderate" | "Light";
  streakWeeks: number;
  contributions12m: number;
  yoyPct: number;
}

export function deriveLanguageStats(repos: RepoFact[]): {
  languageStats: LanguageStat[];
  primaryLanguage: string;
  languageBytesMap: Record<string, number>;
} {
  const bytesMap: Record<string, number> = {};

  for (const repo of repos) {
    for (const [lang, bytes] of Object.entries(repo.languagesBytes ?? {})) {
      if (!IGNORED_LANGUAGES.has(lang.toLowerCase())) {
        bytesMap[lang] = (bytesMap[lang] ?? 0) + bytes;
      }
    }
  }

  const sortedLangs = Object.entries(bytesMap).sort((a, b) => b[1] - a[1]);

  if (sortedLangs.length === 0) {
    return {
      languageStats: [],
      primaryLanguage: "Unknown",
      languageBytesMap: bytesMap,
    };
  }

  const primaryLanguage = sortedLangs[0][0];
  const top3 = sortedLangs.slice(0, 3);
  const totalTopBytes = top3.reduce((sum, [, bytes]) => sum + bytes, 0);

  const languageStats: LanguageStat[] = top3.map(([name, bytes]) => {
    const pct = totalTopBytes > 0 ? Math.round((bytes / totalTopBytes) * 100) : 0;
    return { name, value: pct };
  });

  return {
    languageStats,
    primaryLanguage,
    languageBytesMap: bytesMap,
  };
}

export function deriveMetrics(facts: Facts, consideredRepos: RepoFact[]): DerivedMetrics {
  const originalCount = facts.profile?.originalPublicCount ?? 0;
  const publicReposTotal = Math.max(1, facts.profile?.publicReposTotal ?? 0);
  const originalRatio = Math.round((originalCount / publicReposTotal) * 100) / 100;

  const nonForkRepos = consideredRepos.filter((r) => !r.isFork);
  const nonForkCount = nonForkRepos.length;
  const verifiedDemoCount = nonForkRepos.filter((r) => r.demoVerified).length;
  const demoRatio = nonForkCount > 0 ? Math.round((verifiedDemoCount / nonForkCount) * 100) : 0;

  // Commit health (berdasarkan minggu aktif dari 12 minggu terakhir)
  const activeWeeks12 = facts.calendar?.activeWeeks12 ?? 0;
  let commitHealth: "Consistent" | "Irregular" | "Sporadic" = "Sporadic";
  if (activeWeeks12 >= 9) {
    commitHealth = "Consistent";
  } else if (activeWeeks12 >= 5) {
    commitHealth = "Irregular";
  }

  // Contribution depth (PR ke orang lain + review + issue)
  const depthTotal =
    (facts.prToOtherRepos ?? 0) + (facts.reviews ?? 0) + (facts.issues ?? 0);
  let contributionDepth: "Deep" | "Moderate" | "Light" = "Light";
  if (depthTotal >= 20) {
    contributionDepth = "Deep";
  } else if (depthTotal >= 5) {
    contributionDepth = "Moderate";
  }

  const streakWeeks = facts.calendar?.streakWeeks ?? 0;
  const contributions12m = facts.calendar?.totalContributions ?? 0;
  const prev12m = facts.contributionsPrev12m ?? 0;

  let yoyPct = 0;
  if (prev12m === 0 && contributions12m > 0) {
    yoyPct = 100;
  } else if (prev12m > 0) {
    yoyPct = Math.round(((contributions12m - prev12m) / prev12m) * 100);
  }

  return {
    originalRatio,
    originalCount,
    demoRatio,
    commitHealth,
    contributionDepth,
    streakWeeks,
    contributions12m,
    yoyPct,
  };
}
