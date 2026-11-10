// scripts/backend/bias-format_test.ts
import { assert, assertEquals, assertNotMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderBiasMarkdown, type BiasReport } from "./bias-format.ts";

const report: BiasReport = {
  generatedAt: "2026-11-05T00:00:00Z",
  scoreVersion: 2,
  minimumGroupSize: 10,
  overall: { n: 15, mean: 70.5, median: 70, p25: 65, p75: 76 },
  byCountry: [
    { key: "ID", n: 12, mean: 65.5, median: 65.5, p25: 62, p75: 69 },
    { key: "SG", n: "<10" },
  ],
  byLanguage: [],
  byRole: [{ key: "Back-End", n: "<10" }],
};

Deno.test("bias formatter: menulis header, masking, dan tanpa identitas", () => {
  const md = renderBiasMarkdown(report, "sintetis");
  assert(md.includes("Audit Bias v0"));
  assert(md.includes("n >= 10"));
  assert(md.includes("| SG | <10 |"));
  assert(md.includes("65.5"));
  assert(md.includes("sintetis"));
  assertNotMatch(md, /login|avatar|github/i);
});

Deno.test("bias formatter: kelompok dengan selisih median > 10 ditandai", () => {
  const md = renderBiasMarkdown({
    ...report,
    byCountry: [
      ...(report.byCountry ?? []),
      { key: "US", n: 40, mean: 86, median: 85, p25: 80, p75: 90 },
    ],
  }, "sintetis");
  assert(md.includes("## Perlu tinjauan"));
  assert(md.includes("| Negara/wilayah | US | 40 | 85 | +15 |"));
});

Deno.test("bias formatter: tanpa selisih berarti menampilkan placeholder", () => {
  const md = renderBiasMarkdown(report, "sintetis");
  assert(md.includes("_Tidak ada kelompok dengan selisih median > 10 poin._"));
});

Deno.test("bias formatter: kelompok kosong ditandai", () => {
  const md = renderBiasMarkdown({ ...report, byLanguage: [] }, "sintetis");
  assertEquals(md.includes("_Tidak ada kelompok._"), true);
});

Deno.test("bias formatter: field hilang menjadi —", () => {
  const md = renderBiasMarkdown({ overall: {} }, "sintetis");
  assert(md.includes("n = —"));
});
