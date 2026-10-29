// @ts-nocheck
// supabase/functions/_shared/scoring/config.ts
// Parameter dan bobot baku Scoring Engine v2 (PRD V2 §9).

export const SCORE_VERSION = 2;

export const SCORING_WEIGHTS = {
  originalityMax: 30,
  activityMax: 20,
  activityRecencyMax: 12,
  activityWeeksMax: 8,
  proofMax: 15,
  substanceMax: 20,
  depthMax: 15,
};

export const THRESHOLDS = {
  tierHighMin: 85,
  tierMediumMin: 65,
  accountNewDaysMax: 90,
  accountNewScoreCap: 70,
  burstReposCountMin: 10,
  burstReposWindowHours: 24,
  burstPenalty: 10,
  recencyMaxDays: 365,
  recencyMinDays: 30,
  activeWeeksTarget: 26,
  depthRawTarget: 30,
  sampleReposMax: 30,
  topReposMax: 5,
};

export const CONFIDENCE_PENALTIES = {
  noRepos: 40,
  partialRepos: 35,
  noCalendar: 20,
  underSampled: 15,
  demoTimeout: 10,
};
