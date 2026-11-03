import type { AnalysisVM } from '@/api/contracts';

// ---------------------------------------------------------------------------
// Score copy shared by ScoreCard, the evidence screen and "Skor saya".
// Values/maxima mirror the BE formula (PRD v2 §9.2); nothing here recalculates
// a score — the VM is always the source of truth.
// ---------------------------------------------------------------------------

export type ScoreComponentKey = 'originality' | 'activity' | 'proof' | 'substance' | 'depth';

export const SCORE_COMPONENTS: { key: ScoreComponentKey; label: string; max: number }[] = [
  { key: 'originality', label: 'Originality', max: 30 },
  { key: 'activity', label: 'Activity', max: 20 },
  { key: 'proof', label: 'Proof', max: 15 },
  { key: 'substance', label: 'Substance', max: 20 },
  { key: 'depth', label: 'Depth', max: 15 },
];

export const TIER_COPY: Record<AnalysisVM['tier'], string> = {
  high: 'Original, active work',
  medium: 'Promising signals, verify evidence',
  low: 'Limited verifiable evidence',
};

export const SCORE_DISCLAIMER =
  'Skor adalah sinyal bantu, bukan penilaian kompetensi atau keputusan otomatis; ' +
  'periksa bukti sebelum menghubungi kandidat.';

/** `26/30` — display only, no rounding of the BE value. */
export function componentRatioLabel(value: number, max: number): string {
  return `${value}/${max}`;
}

/** 0–100 fill for `ProgressBar` from a component value and its maximum. */
export function componentPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}
