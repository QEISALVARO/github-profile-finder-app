// scripts/backend/bias-format.ts
// Formatter murni laporan bias v0 (AIR-4). Tanpa I/O agar dapat diuji.

export interface BiasStats {
  n?: number | string;
  mean?: number;
  median?: number;
  p25?: number;
  p75?: number;
  key?: string;
}

export interface BiasReport {
  generatedAt?: string;
  scoreVersion?: number;
  minimumGroupSize?: number;
  overall?: BiasStats;
  byCountry?: BiasStats[];
  byLanguage?: BiasStats[];
  byRole?: BiasStats[];
}

function cell(value: number | string | undefined): string {
  return value === undefined ? "—" : String(value);
}

const REVIEW_THRESHOLD = 10;

function reviewSection(
  overall: BiasStats | undefined,
  dimensions: Array<[string, BiasStats[] | undefined]>,
): string {
  const baseline = overall?.median;
  if (baseline === undefined) return "";
  const rows: string[] = [];
  for (const [title, groups] of dimensions) {
    for (const g of groups ?? []) {
      if (typeof g.median !== "number") continue;
      const delta = Math.round((g.median - baseline) * 10) / 10;
      if (Math.abs(delta) > REVIEW_THRESHOLD) {
        rows.push(
          `| ${title} | ${cell(g.key)} | ${cell(g.n)} | ${cell(g.median)} | ${delta > 0 ? "+" : ""}${delta} |`,
        );
      }
    }
  }
  const body = rows.length === 0
    ? ["_Tidak ada kelompok dengan selisih median > " + REVIEW_THRESHOLD + " poin._"]
    : [
      "| Dimensi | Kelompok | n | median | selisih vs keseluruhan |",
      "|---|---|---|---|---|",
      ...rows,
    ];
  return ["## Perlu tinjauan (indikator, bukan bukti diskriminasi)", "", ...body, ""].join("\n");
}

function groupRows(title: string, groups: BiasStats[] | undefined): string {
  const rows = groups ?? [];
  if (rows.length === 0) return `### ${title}\n\n_Tidak ada kelompok._\n`;
  const lines = [
    `### ${title}`,
    "",
    "| Kelompok | n | mean | median | p25 | p75 |",
    "|---|---|---|---|---|---|",
    ...rows.map((g) =>
      `| ${cell(g.key)} | ${cell(g.n)} | ${cell(g.mean)} | ${cell(g.median)} | ${cell(g.p25)} | ${cell(g.p75)} |`
    ),
  ];
  return lines.join("\n") + "\n";
}

export function renderBiasMarkdown(report: BiasReport, note: string): string {
  const o = report.overall ?? {};
  return [
    "# Audit Bias v0 (AIR-4)",
    "",
    `- Dibuat: ${report.generatedAt ?? "—"}`,
    `- Versi skor: ${report.scoreVersion ?? "—"}`,
    `- Ambang kelompok minimum: n >= ${report.minimumGroupSize ?? 10}`,
    "",
    `> ${note}`,
    "",
    "## Keseluruhan",
    "",
    `n = ${cell(o.n)}, mean = ${cell(o.mean)}, median = ${cell(o.median)}, ` +
    `p25 = ${cell(o.p25)}, p75 = ${cell(o.p75)}`,
    "",
    reviewSection(report.overall, [
      ["Negara/wilayah", report.byCountry],
      ["Bahasa utama", report.byLanguage],
      ["Role", report.byRole],
    ]),
    groupRows("Negara/wilayah", report.byCountry),
    groupRows("Bahasa utama", report.byLanguage),
    groupRows("Role", report.byRole),
    "## Batasan",
    "",
    "- Skor v2 bukan ukuran kompetensi.",
    "- Data sintetis tidak mewakili populasi nyata.",
    "- Kelompok n < 10 dimasking; tidak ada identitas individu.",
    "",
  ].join("\n");
}
