// scripts/backend/bias-v1_test.ts
import { assert, assertEquals, assertNotMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  benjaminiHochberg,
  evaluateDimension,
  impactRatioInterval,
  renderBiasV1Markdown,
  twoProportionP,
  wilsonInterval,
  type BiasV1Report,
} from "./bias-v1.ts";

function close(actual: number, expected: number, tolerance = 1e-3): void {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected} +/- ${tolerance}, got ${actual}`,
  );
}

Deno.test("wilson: 50/100 simetris di sekitar 0.5", () => {
  const ci = wilsonInterval(50, 100);
  close(ci.low, 0.4038);
  close(ci.high, 0.5962);
});

Deno.test("wilson: 0/10 tidak menghasilkan batas negatif", () => {
  const ci = wilsonInterval(0, 10);
  assertEquals(ci.low, 0);
  close(ci.high, 0.2775);
});

Deno.test("impact ratio: 40/200 vs 100/200 = 0.4", () => {
  const rr = impactRatioInterval(40, 200, 100, 200);
  close(rr.ratio, 0.4);
  assert(rr.low < rr.ratio && rr.ratio < rr.high);
});

Deno.test("impact ratio: sel nol memakai koreksi 0.5 tanpa Infinity", () => {
  const rr = impactRatioInterval(0, 100, 50, 100);
  assert(Number.isFinite(rr.low));
  assert(rr.ratio > 0 && rr.ratio < 0.1);
});

Deno.test("uji proporsi: perbedaan besar signifikan, perbedaan kecil tidak", () => {
  assert(twoProportionP(40, 200, 100, 200) < 0.001);
  assert(twoProportionP(95, 200, 100, 200) > 0.3);
  assert(twoProportionP(50, 100, 50, 100) > 0.999);
});

Deno.test("benjamini-hochberg: contoh baku", () => {
  const q = benjaminiHochberg([0.01, 0.04, 0.03, 0.002]);
  close(q[0], 0.02);
  close(q[1], 0.04);
  close(q[2], 0.04);
  close(q[3], 0.008);
});

Deno.test("benjamini-hochberg: masukan kosong dan p tidak valid", () => {
  assertEquals(benjaminiHochberg([]), []);
  assertEquals(benjaminiHochberg([Number.NaN]), [1]);
});

Deno.test("evaluateDimension: grup kecil dimasking, selisih besar adverse", () => {
  const result = evaluateDimension("Negara/wilayah", [
    { key: "AA", n: 200, median: 80, atOrAbove: 100 },
    { key: "BB", n: 200, median: 55, atOrAbove: 40 },
    { key: "CC", n: 5, median: 70 },
  ]);
  assertEquals(result.referenceKey, "AA");
  assertEquals(result.masked, ["CC"]);
  assertEquals(result.groups.length, 2);
  const bb = result.groups.find((g) => g.key === "BB");
  assert(bb);
  close(bb!.impactRatio, 0.4);
  assert(bb!.qValue < 0.05);
  assertEquals(bb!.adverse, true);
  assertEquals(result.adverseCount, 1);
});

Deno.test("evaluateDimension: perbedaan kecil tidak ditandai", () => {
  const result = evaluateDimension("Bahasa utama", [
    { key: "Go", n: 200, median: 80, atOrAbove: 100 },
    { key: "Rust", n: 200, median: 79, atOrAbove: 95 },
  ]);
  assertEquals(result.adverseCount, 0);
  assertEquals(result.groups.every((g) => !g.adverse), true);
});

Deno.test("evaluateDimension: tanpa grup reportable tidak error", () => {
  const result = evaluateDimension("Role", [{ key: "Data", n: "<30>" }]);
  assertEquals(result.referenceKey, null);
  assertEquals(result.groups.length, 0);
  assertEquals(result.masked, ["Data"]);
});

Deno.test("formatter v1: memuat metode, masking, tanpa field identitas", () => {
  const report: BiasV1Report = {
    generatedAt: "2026-11-10T00:00:00Z",
    scoreVersion: 2,
    threshold: 70,
    minimumGroupSize: 30,
    overall: { key: "keseluruhan", n: 430, median: 74, atOrAbove: 215 },
    byCountry: [
      { key: "ID", n: 300, median: 76, atOrAbove: 180 },
      { key: "SG", n: 130, median: 70, atOrAbove: 35 },
      { key: "EG", n: "<30>" },
    ],
    byLanguage: [],
    byRole: [],
  };
  const md = renderBiasV1Markdown(report, "sintetis");
  assert(md.includes("# Audit Bias v1"));
  assert(md.includes("Benjamini-Hochberg"));
  assert(md.includes("| ID | 300 |"));
  assert(md.includes("Dimasking (n < ambang): EG"));
  assert(md.includes("Acuan impact ratio: **ID**"));
  assertNotMatch(md, /avatarUrl|githubLogin|\| login \|/);
  assertEquals(md.includes("_Tidak ada kelompok reportable._"), true);
});
