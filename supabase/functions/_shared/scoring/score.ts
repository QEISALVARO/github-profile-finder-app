// @ts-nocheck
// supabase/functions/_shared/scoring/score.ts
// Logika murni perhitungan skor keaslian profil developer (Scoring Engine v2.0).

import { Facts, RepoFact } from "../github/facts.ts";
import {
  SCORE_VERSION,
  SCORING_WEIGHTS,
  THRESHOLDS,
  CONFIDENCE_PENALTIES,
} from "./config.ts";

export interface EvidenceItem {
  label: string;
  url?: string;
  reason: string;
}

export interface ScoreBreakdown {
  originality: number;
  activity: number;
  proof: number;
  substance: number;
  depth: number;
  evidence: EvidenceItem[];
}

export interface ScoreResult {
  scoreVersion: number;
  authenticity: number;
  confidence: number;
  tier: "high" | "medium" | "low";
  breakdown: ScoreBreakdown;
  consideredRepos: RepoFact[];
}

export interface ScoreOptions {
  now?: Date;
  demoTimedOut?: boolean;
  partialReposFailed?: boolean;
}

export function calculateScore(facts: Facts, options: ScoreOptions = {}): ScoreResult {
  const now = options.now ?? new Date();
  const evidence: EvidenceItem[] = [];

  // Filter repo yang dipertimbangkan: non-archived, maks 30 repo
  const consideredRepos = (facts.repos ?? [])
    .filter((r) => !r.isArchived)
    .slice(0, THRESHOLDS.sampleReposMax);

  const totalConsidered = consideredRepos.length;

  // 1. Originality (Maks 30)
  // round(30 × nonForkRatio)
  let originality = 0;
  const nonForkRepos = consideredRepos.filter((r) => !r.isFork);
  const nonForkCount = nonForkRepos.length;

  if (totalConsidered > 0) {
    const nonForkRatio = nonForkCount / totalConsidered;
    originality = Math.round(SCORING_WEIGHTS.originalityMax * nonForkRatio);
  }

  // 2. Activity & Recency (Maks 20)
  // Recency (12): d hari sejak push terbaru (d <= 30 -> 12, d >= 365 -> 0)
  let recencyScore = 0;
  if (consideredRepos.length > 0) {
    const pushDates = consideredRepos
      .map((r) => new Date(r.pushedAt).getTime())
      .filter((t) => !isNaN(t));

    if (pushDates.length > 0) {
      const latestPushTime = Math.max(...pushDates);
      const daysSinceLatestPush = Math.max(0, Math.floor((now.getTime() - latestPushTime) / (24 * 3600 * 1000)));

      if (daysSinceLatestPush <= THRESHOLDS.recencyMinDays) {
        recencyScore = SCORING_WEIGHTS.activityRecencyMax;
      } else if (daysSinceLatestPush >= THRESHOLDS.recencyMaxDays) {
        recencyScore = 0;
      } else {
        const factor = (daysSinceLatestPush - THRESHOLDS.recencyMinDays) /
          (THRESHOLDS.recencyMaxDays - THRESHOLDS.recencyMinDays);
        recencyScore = Math.round(SCORING_WEIGHTS.activityRecencyMax * (1 - factor));
      }
    }
  }

  // Minggu aktif (8): 8 * min(1, activeWeeks52 / 26)
  const activeWeeks52 = facts.calendar?.activeWeeks52 ?? 0;
  const activeWeeksScore = Math.round(
    SCORING_WEIGHTS.activityWeeksMax * Math.min(1, activeWeeks52 / THRESHOLDS.activeWeeksTarget)
  );

  const activity = Math.min(SCORING_WEIGHTS.activityMax, recencyScore + activeWeeksScore);

  // 3. Proof (Maks 15)
  // Dari <= 5 repo non-fork teratas (urut recency lalu bintang)
  const sortedNonFork = [...nonForkRepos].sort((a, b) => {
    const pushDiff = new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime();
    if (pushDiff !== 0) return pushDiff;
    return b.stars - a.stars;
  });

  const topNonFork = sortedNonFork.slice(0, THRESHOLDS.topReposMax);
  const nProof = topNonFork.length;
  let proof = 0;

  if (nProof > 0) {
    const withProofCount = topNonFork.filter(
      (r) => r.demoVerified || r.releasesCount >= 1
    ).length;
    proof = Math.round(SCORING_WEIGHTS.proofMax * (withProofCount / Math.min(THRESHOLDS.topReposMax, nProof)));
  }

  // 4. Substance (Maks 20)
  // Rata-rata substance repo non-fork teratas (<= 5)
  let substance = 0;
  if (topNonFork.length > 0) {
    const sumSubstance = topNonFork.reduce((acc, r) => acc + (r.substance ?? 0), 0);
    const avgSubstance = sumSubstance / topNonFork.length;
    substance = Math.round(SCORING_WEIGHTS.substanceMax * avgSubstance);
  }

  // 5. Contribution Depth (Maks 15)
  // raw = 3 * PRKeRepoOrangLain + 1 * review + 0.5 * issue
  const prOthers = facts.prToOtherRepos ?? 0;
  const reviews = facts.reviews ?? 0;
  const issues = facts.issues ?? 0;
  const rawDepth = 3 * prOthers + 1 * reviews + 0.5 * issues;
  const depth = Math.round(
    SCORING_WEIGHTS.depthMax * Math.min(1, rawDepth / THRESHOLDS.depthRawTarget)
  );

  // Jumlahkan nilai komponen
  let sumScore = originality + activity + proof + substance + depth;

  // ─── Penalti & Pembatas ─────────────────────────────────────
  // A. Deteksi Burst Repo (>= 10 repo dibuat dalam 24 jam)
  let burstDetected = false;
  const sortedCreatedDates = consideredRepos
    .map((r) => new Date(r.createdAt).getTime())
    .sort((a, b) => a - b);

  for (let i = 0; i <= sortedCreatedDates.length - THRESHOLDS.burstReposCountMin; i++) {
    const windowMs = sortedCreatedDates[i + THRESHOLDS.burstReposCountMin - 1] - sortedCreatedDates[i];
    if (windowMs <= THRESHOLDS.burstReposWindowHours * 3600 * 1000) {
      burstDetected = true;
      break;
    }
  }

  if (burstDetected) {
    sumScore -= THRESHOLDS.burstPenalty;
    evidence.push({
      label: "Pembuatan Repo Massal",
      reason: `Terdeteksi pembuatan repo massal (≥${THRESHOLDS.burstReposCountMin} repo dalam 24 jam), penalti -${THRESHOLDS.burstPenalty}`,
    });
  }

  // B. Batas Akun Baru (< 90 hari)
  const accountCreatedMs = new Date(facts.accountCreatedAt).getTime();
  const accountAgeDays = Math.floor((now.getTime() - accountCreatedMs) / (24 * 3600 * 1000));
  let isNewAccountCapped = false;

  let authenticity = Math.max(0, Math.min(100, sumScore));

  if (accountAgeDays < THRESHOLDS.accountNewDaysMax && authenticity > THRESHOLDS.accountNewScoreCap) {
    authenticity = THRESHOLDS.accountNewScoreCap;
    isNewAccountCapped = true;
    evidence.push({
      label: "Akun Baru (<90 hari)",
      reason: `Akun dibuat ${accountAgeDays} hari lalu, skor keaslian dibatasi maksimal ${THRESHOLDS.accountNewScoreCap}`,
    });
  }

  // Tiering
  let tier: "high" | "medium" | "low" = "low";
  if (authenticity >= THRESHOLDS.tierHighMin) {
    tier = "high";
  } else if (authenticity >= THRESHOLDS.tierMediumMin) {
    tier = "medium";
  }

  // ─── Confidence (0..100) ────────────────────────────────────
  let confidence = 100;
  if (totalConsidered === 0) {
    confidence -= CONFIDENCE_PENALTIES.noRepos;
  }
  if (options.partialReposFailed) {
    confidence -= CONFIDENCE_PENALTIES.partialRepos;
  }
  if (!facts.calendar || facts.calendar.totalContributions === 0 && (facts.calendar.weeks?.length ?? 0) === 0) {
    confidence -= CONFIDENCE_PENALTIES.noCalendar;
  }
  if (facts.profile?.publicReposTotal >= 3 && totalConsidered < 3) {
    confidence -= CONFIDENCE_PENALTIES.underSampled;
  }
  if (options.demoTimedOut) {
    confidence -= CONFIDENCE_PENALTIES.demoTimeout;
  }
  confidence = Math.max(0, Math.min(100, confidence));

  // ─── Tambahkan Evidence Repo Teratas ────────────────────────
  for (const repo of topNonFork.slice(0, 3)) {
    const reasons: string[] = [`Substansi ${Math.round((repo.substance ?? 0) * 100)}%`];
    if (repo.demoVerified) reasons.push("demo terverifikasi");
    if (repo.releasesCount > 0) reasons.push("memiliki rilis");
    if (repo.stars > 0) reasons.push(`${repo.stars} bintang`);

    evidence.push({
      label: repo.name,
      url: repo.url,
      reason: reasons.join(", "),
    });
  }

  if (prOthers > 0) {
    evidence.push({
      label: "Kolaborasi Open Source",
      reason: `${prOthers} Pull Request ke repositori pihak ketiga dalam 12 bulan terakhir`,
    });
  }

  return {
    scoreVersion: SCORE_VERSION,
    authenticity,
    confidence,
    tier,
    breakdown: {
      originality,
      activity,
      proof,
      substance,
      depth,
      evidence: evidence.slice(0, 12),
    },
    consideredRepos,
  };
}
