// supabase/functions/_shared/scoring/publish.ts
// Fungsi murni publikasi proyek (BE-3) — dipakai Edge Function publish-project
// dan test-nya. Tanpa @ts-nocheck, tanpa I/O, strict-safe.

export type FeedRole = "Front-End" | "Back-End" | "Mobile" | "Data";

/** Pemetaan peran hasil inferensi BE-2 ke FeedRole (D2 BE-3). */
export function mapInferredRoleToFeedRole(inferred: string): FeedRole {
  if (inferred === "Front-End Developer") return "Front-End";
  if (inferred === "Mobile Developer") return "Mobile";
  if (inferred === "AI / Data Engineer") return "Data";
  return "Back-End";
}

export interface LanguageBytes {
  name: string;
  bytes: number;
}

export interface StackSlice {
  name: string;
  percent: number;
}

/**
 * Top-3 bahasa menurut byte menjadi persen bulat yang berjumlah 100.
 * Sisa pembulatan ditempelkan ke slice pertama (D2 BE-3).
 */
export function top3Stack(languages: readonly LanguageBytes[]): StackSlice[] {
  const bytes = languages.filter((l) => l.bytes > 0);
  const total = bytes.reduce((sum, l) => sum + l.bytes, 0);
  const top = bytes.slice(0, 3);
  const stack = top.map((l) => ({
    name: l.name,
    percent: total > 0 ? Math.round((l.bytes / total) * 100) : 0,
  }));
  const sum = stack.reduce((acc, s) => acc + s.percent, 0);
  if (stack.length > 0 && sum !== 100) {
    stack[0].percent += 100 - sum;
  }
  return stack;
}

/** Rumus skor repo BE-2 §4.6: (bukan fork?40:0) + (demo?20:0) + round(40×substance). */
export function repoScore(isFork: boolean, demoVerified: boolean, substance: number): number {
  return Math.min(100, (isFork ? 0 : 40) + (demoVerified ? 20 : 0) + Math.round(40 * substance));
}

/** Repo dianggap aktif bila push ≤ 30 hari sebelum `now` (ms). */
export function isActiveRepo(pushedAt: string | null, nowMs: number): boolean {
  if (!pushedAt) return false;
  const pushedMs = new Date(pushedAt).getTime();
  if (!Number.isFinite(pushedMs)) return false;
  return nowMs - pushedMs < 30 * 24 * 3600 * 1000;
}
