// scripts/backend/bias-v1.ts
// Statistik audit bias v1 (AIR-4) + formatter markdown. Murni (tanpa I/O)
// supaya bisa diuji tanpa database.
//
// Input berasal dari RPC `bias_report_v1(p_threshold, p_min_group)`:
// per grup { key, n, median, atOrAbove } (grup kecil sudah dimasking SQL).
//
// Yang dihitung di sini:
// - scoring rate (proporsi skor >= ambang) + Wilson 95% CI;
// - impact ratio terhadap grup dengan rate tertinggi + Katz 95% CI;
// - uji dua proporsi (pooled z) vs grup acuan;
// - Benjamini-Hochberg (FDR 5%) per dimensi.
//
// Bukan ukuran kompetensi dan bukan audit diskriminasi: atribut terlindungi
// tidak dikumpulkan (AIR-5), sehingga hanya distribusi per negara/bahasa/role.

export interface BiasGroup {
  key: string;
  n: number | string;
  mean?: number;
  median?: number;
  p25?: number;
  p75?: number;
  atOrAbove?: number;
}

export interface BiasV1Report {
  generatedAt?: string;
  scoreVersion?: number;
  threshold?: number;
  minimumGroupSize?: number;
  overall?: BiasGroup;
  byCountry?: BiasGroup[];
  byLanguage?: BiasGroup[];
  byRole?: BiasGroup[];
}

export interface EnrichedGroup {
  key: string;
  n: number;
  median?: number;
  scoringRate: number;
  ciLow: number;
  ciHigh: number;
  impactRatio: number;
  irLow: number;
  irHigh: number;
  pValue: number;
  qValue: number;
  adverse: boolean;
}

export interface DimensionResult {
  dimension: string;
  referenceKey: string | null;
  groups: EnrichedGroup[];
  masked: string[];
  adverseCount: number;
}

const Z_95 = 1.959964;

function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26 (galat < 1.5e-7, cukup untuk uji proporsi).
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) *
        t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Wilson score interval untuk proporsi (default 95%). */
export function wilsonInterval(
  successes: number,
  n: number,
  z = Z_95,
): { low: number; high: number } {
  if (n <= 0) return { low: 0, high: 0 };
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return {
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin),
  };
}

export function twoProportionP(
  successesA: number,
  nA: number,
  successesB: number,
  nB: number,
): number {
  if (nA <= 0 || nB <= 0) return 1;
  // Koreksi Haldane-Anscombe bila ada sel nol.
  const needsCorrection = successesA === 0 || successesB === 0 ||
    successesA === nA || successesB === nB;
  const a = successesA + (needsCorrection ? 0.5 : 0);
  const b = successesB + (needsCorrection ? 0.5 : 0);
  const na = nA + (needsCorrection ? 1 : 0);
  const nb = nB + (needsCorrection ? 1 : 0);
  const pooled = (a + b) / (na + nb);
  if (pooled <= 0 || pooled >= 1) return 1;
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / na + 1 / nb));
  if (se === 0) return 1;
  const z = (a / na - b / nb) / se;
  return Math.min(1, Math.max(0, 2 * (1 - normalCdf(Math.abs(z)))));
}

/** Katz log interval untuk risk ratio; koreksi 0.5 bila ada sel nol. */
export function impactRatioInterval(
  successesA: number,
  nA: number,
  successesB: number,
  nB: number,
  z = Z_95,
): { ratio: number; low: number; high: number } {
  if (nA <= 0 || nB <= 0) return { ratio: 1, low: 0, high: Number.POSITIVE_INFINITY };
  const needsCorrection = successesA === 0 || successesB === 0 ||
    successesA === nA || successesB === nB;
  const a = successesA + (needsCorrection ? 0.5 : 0);
  const b = successesB + (needsCorrection ? 0.5 : 0);
  const na = nA + (needsCorrection ? 1 : 0);
  const nb = nB + (needsCorrection ? 1 : 0);
  const rateA = a / na;
  const rateB = b / nb;
  if (rateB === 0) return { ratio: 1, low: 0, high: Number.POSITIVE_INFINITY };
  const ratio = rateA / rateB;
  const se = Math.sqrt(1 / a - 1 / na + 1 / b - 1 / nb);
  return {
    ratio,
    low: Math.exp(Math.log(ratio) - z * se),
    high: Math.exp(Math.log(ratio) + z * se),
  };
}

/** Benjamini-Hochberg: q-value per p-value masukan (urutan dipertahankan). */
export function benjaminiHochberg(pValues: number[]): number[] {
  const m = pValues.length;
  if (m === 0) return [];
  const order = pValues
    .map((p, i) => ({ p: Number.isFinite(p) ? p : 1, i }))
    .sort((x, y) => x.p - y.p);
  const q = new Array<number>(m).fill(1);
  let running = 1;
  for (let k = m - 1; k >= 0; k--) {
    const { p, i } = order[k];
    running = Math.min(running, (p * m) / (k + 1));
    q[i] = Math.min(1, running);
  }
  return q;
}

function isReportable(g: BiasGroup): g is BiasGroup & { n: number; atOrAbove: number } {
  return typeof g.n === "number" && typeof g.atOrAbove === "number" && g.n > 0;
}

export function evaluateDimension(
  dimension: string,
  groups: BiasGroup[] | undefined,
  alpha = 0.05,
  adverseImpactRatio = 0.8,
): DimensionResult {
  const all = groups ?? [];
  const reportable = all.filter(isReportable);
  const masked = all.filter((g) => !isReportable(g)).map((g) => g.key);

  if (reportable.length === 0) {
    return { dimension, referenceKey: null, groups: [], masked, adverseCount: 0 };
  }

  const rate = (g: BiasGroup & { n: number; atOrAbove: number }) => g.atOrAbove / g.n;
  const reference = [...reportable].sort((a, b) =>
    rate(b) - rate(a) || a.key.localeCompare(b.key)
  )[0];
  const refRate = rate(reference);

  const raw = reportable.map((g) => {
    const n = g.n;
    const above = g.atOrAbove;
    const base = wilsonInterval(above, n);
    const rr = impactRatioInterval(above, n, reference.atOrAbove, reference.n);
    return {
      key: g.key,
      n,
      median: g.median,
      scoringRate: above / n,
      ciLow: base.low,
      ciHigh: base.high,
      impactRatio: refRate === 0 ? 1 : rr.ratio,
      irLow: refRate === 0 ? 0 : rr.low,
      irHigh: refRate === 0 ? Number.POSITIVE_INFINITY : rr.high,
      pValue: twoProportionP(above, n, reference.atOrAbove, reference.n),
    };
  });

  const qValues = benjaminiHochberg(raw.map((g) => g.pValue));
  const enriched: EnrichedGroup[] = raw.map((g, i) => ({
    ...g,
    qValue: qValues[i],
    adverse: qValues[i] <= alpha && g.impactRatio < adverseImpactRatio,
  }));

  return {
    dimension,
    referenceKey: reference.key,
    groups: enriched,
    masked,
    adverseCount: enriched.filter((g) => g.adverse).length,
  };
}

export function evaluateReport(report: BiasV1Report): DimensionResult[] {
  return [
    evaluateDimension("Negara/wilayah", report.byCountry),
    evaluateDimension("Bahasa utama", report.byLanguage),
    evaluateDimension("Role", report.byRole),
  ];
}

function cell(value: number | string | undefined): string {
  return value === undefined ? "-" : String(value);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function ratio(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function pval(value: number): string {
  if (!Number.isFinite(value)) return "1.000";
  return value < 0.001 ? value.toExponential(1) : value.toFixed(3);
}

function dimensionTable(result: DimensionResult): string[] {
  if (result.groups.length === 0) {
    return [`### ${result.dimension}`, "", "_Tidak ada kelompok reportable._", ""];
  }
  const lines = [
    `### ${result.dimension}`,
    "",
    `Acuan impact ratio: **${result.referenceKey}** (scoring rate tertinggi).`,
    "",
    "| Kelompok | n | median | scoring rate (95% CI) | impact ratio (95% CI) | p | q | adverse |",
    "|---|---|---|---|---|---|---|---|",
    ...result.groups.map((g) =>
      `| ${g.key} | ${g.n} | ${cell(g.median)} | ${pct(g.scoringRate)} (${pct(g.ciLow)}-${pct(g.ciHigh)}) | ${ratio(g.impactRatio)} (${ratio(g.irLow)}-${ratio(g.irHigh)}) | ${pval(g.pValue)} | ${pval(g.qValue)} | ${g.adverse ? "ya" : "tidak"} |`
    ),
  ];
  if (result.masked.length > 0) {
    lines.push("", `_Dimasking (n < ambang): ${result.masked.join(", ")}._`);
  }
  lines.push("");
  return lines;
}

export function renderBiasV1Markdown(report: BiasV1Report, note: string): string {
  const results = evaluateReport(report);
  const o = report.overall ?? { key: "keseluruhan", n: 0 };
  const overallN = typeof o.n === "number" ? o.n : 0;
  const overallAbove = typeof o.atOrAbove === "number" ? o.atOrAbove : 0;
  const overallCi = wilsonInterval(overallAbove, overallN);
  const totalReportable = results.reduce((sum, r) => sum + r.groups.length, 0);
  const totalAdverse = results.reduce((sum, r) => sum + r.adverseCount, 0);

  return [
    "# Audit Bias v1 (AIR-4)",
    "",
    `- Dibuat: ${report.generatedAt ?? "-"}`,
    `- Versi skor: ${report.scoreVersion ?? "-"}`,
    `- Ambang skor (scoring rate): >= ${report.threshold ?? "-"}`,
    `- Ambang kelompok minimum: n >= ${report.minimumGroupSize ?? "-"}`,
    "- Koreksi multiplisitas: Benjamini-Hochberg, FDR 5% per dimensi",
    "",
    `> ${note}`,
    "",
    "## Keseluruhan",
    "",
    `n = ${overallN}, median = ${cell(o.median)}, scoring rate = ${pct(overallN === 0 ? 0 : overallAbove / overallN)} ` +
      `(95% CI ${pct(overallCi.low)}-${pct(overallCi.high)}), skor >= ambang = ${overallAbove}`,
    "",
    "## Ringkasan",
    "",
    `- Kelompok reportable: ${totalReportable}`,
    `- Adverse impact (q <= 0.05 dan impact ratio < 0.80): ${totalAdverse}`,
    "",
    ...results.flatMap(dimensionTable),
    "## Metode",
    "",
    "- **Scoring rate**: proporsi skor `>=` ambang pada analisis v2 terbaru per developer.",
    "- **Impact ratio**: scoring rate grup dibagi scoring rate grup acuan (rate tertinggi), " +
      "interval Katz pada skala log; koreksi 0.5 bila ada sel nol.",
    "- **Uji**: z dua proporsi (pooled) vs grup acuan; **q-value** dari Benjamini-Hochberg.",
    "- **Adverse**: q <= 0.05 dan impact ratio < 0.80 (tolok ukur 4/5, indikator bukan bukti).",
    "- **Masking**: grup dengan n di bawah ambang tidak dihitung dan tidak ditampilkan statistiknya.",
    "",
    "## Batasan",
    "",
    "- Skor v2 bukan ukuran kompetensi; laporan ini bukan audit diskriminasi karena atribut",
    "  terlindungi (sex/race/etnis) tidak dikumpulkan (AIR-5).",
    "- Data sintetis tidak mewakili populasi nyata; jalankan ulang pada data beta dan kunci",
    "  `score_version` + dataset setiap audit.",
    "- Interval 95% dan q-value bersifat eksploratif; keputusan harus lewat tinjauan manusia.",
    "",
  ].join("\n");
}
