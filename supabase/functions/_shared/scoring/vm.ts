// @ts-nocheck
// supabase/functions/_shared/scoring/vm.ts
// Pembentukan AnalysisVM akhir yang mematuhi kontrak SP-0 (contracts/src/analysis.ts).

import { Facts } from "../github/facts.ts";
import { calculateScore, ScoreResult } from "./score.ts";
import { deriveLanguageStats, deriveMetrics } from "./derive.ts";
import { detectFrameworks } from "./frameworks.ts";
import { inferDeveloperRole } from "./role.ts";

export interface BuildVmOptions {
  source: "fresh" | "cache" | "stale";
  staleSince?: string;
  countryCode?: string | null;
  city?: string | null;
  scoreResult?: ScoreResult;
}

export function buildAnalysisVM(facts: Facts, options: BuildVmOptions) {
  const scoreResult = options.scoreResult ?? calculateScore(facts);
  const { languageStats, primaryLanguage, languageBytesMap } = deriveLanguageStats(scoreResult.consideredRepos);
  const frameworks = detectFrameworks(scoreResult.consideredRepos);
  const inferredRole = inferDeveloperRole(primaryLanguage, frameworks, languageBytesMap);
  const metrics = deriveMetrics(facts, scoreResult.consideredRepos);

  // Bentuk daftar repos[] maksimal 8: non-fork lebih dulu lalu recency
  const sortedRepos = [...scoreResult.consideredRepos].sort((a, b) => {
    if (a.isFork !== b.isFork) return a.isFork ? 1 : -1;
    return new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime();
  });

  const reposVm = sortedRepos.slice(0, 8).map((r) => {
    // Rumus skor repo individual (PRD §4.6):
    // score = (isFork ? 0 : 40) + (demoVerified ? 20 : 0) + round(40 * substance)
    const baseScore = r.isFork ? 0 : 40;
    const demoScore = r.demoVerified ? 20 : 0;
    const substanceScore = Math.round(40 * (r.substance ?? 0));
    const repoScore = Math.min(100, baseScore + demoScore + substanceScore);

    const languages = Object.keys(r.languagesBytes ?? {});
    const repoLang = languages.length > 0 ? languages[0] : null;

    return {
      id: r.databaseId,
      name: r.name,
      description: r.description ?? null,
      language: repoLang,
      htmlUrl: r.url,
      isFork: r.isFork,
      hasVerifiedDemo: r.demoVerified,
      score: repoScore,
    };
  });

  // Pastikan heatmap persis 84 elemen
  const heatmap = facts.calendar?.days84 ?? [];
  const normalizedHeatmap = [...heatmap];
  while (normalizedHeatmap.length < 84) {
    normalizedHeatmap.unshift(0);
  }
  const finalHeatmap = normalizedHeatmap.slice(-84);

  const vm = {
    source: options.source,
    ...(options.staleSince ? { staleSince: options.staleSince } : {}),
    user: {
      login: facts.profile.login,
      name: facts.profile.name ?? null,
      avatarUrl: facts.profile.avatarUrl,
      bio: facts.profile.bio ?? null,
      htmlUrl: facts.profile.url,
      publicRepos: facts.profile.publicReposTotal,
      locationText: facts.profile.location ?? null,
      countryCode: options.countryCode ?? null,
      city: options.city ?? null,
    },
    repos: reposVm,
    authenticity: scoreResult.authenticity,
    confidence: scoreResult.confidence,
    tier: scoreResult.tier,
    scoreVersion: scoreResult.scoreVersion,
    breakdown: scoreResult.breakdown,
    inferredRole,
    primaryLanguage,
    languageStats,
    frameworks,
    metrics,
    heatmap: finalHeatmap,
  };

  return vm;
}

/**
 * Re-scoring murni dari Facts yang tersimpan tanpa fetch ulang ke GitHub (PRD §4.8).
 */
export function rescore(facts: Facts, source: "fresh" | "cache" | "stale" = "cache") {
  return buildAnalysisVM(facts, { source });
}
