// @ts-nocheck
// supabase/functions/_shared/scoring/score_test.ts
// Deno test untuk Scoring Engine v2 (PRD V2 §9 & §5.1).

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calculateScore } from "./score.ts";
import { deriveLanguageStats, deriveMetrics } from "./derive.ts";
import { detectFrameworks } from "./frameworks.ts";
import { inferDeveloperRole } from "./role.ts";
import { buildAnalysisVM, rescore } from "./vm.ts";
import { AnalysisVM } from "../../../../contracts/src/analysis.ts";

const g1Facts = JSON.parse(
  await Deno.readTextFile(new URL("../../_fixtures/github/g1_facts.json", import.meta.url))
);

// ─── Test 1: Golden G1 Test (§4.5 & §5.1) ─────────────────────
Deno.test("scoring: G1 golden test menghasilkan authenticity 77 dan tier medium", () => {
  // Gunakan now = 2026-10-27 agar jarak push terbaru (2026-10-17) tepat 10 hari (d <= 30)
  const now = new Date("2026-10-27T00:00:00Z");
  const result = calculateScore(g1Facts, { now });

  assertEquals(result.authenticity, 77);
  assertEquals(result.tier, "medium");
  assertEquals(result.breakdown.originality, 24);
  assertEquals(result.breakdown.activity, 20);
  assertEquals(result.breakdown.proof, 9);
  assertEquals(result.breakdown.substance, 12);
  assertEquals(result.breakdown.depth, 12);
});

// ─── Test 2: Semua Repo Fork -> Originality 0 ─────────────────
Deno.test("scoring: semua repo fork menghasilkan originality 0", () => {
  const allForkFacts = structuredClone(g1Facts);
  allForkFacts.repos.forEach((r: any) => {
    r.isFork = true;
  });

  const result = calculateScore(allForkFacts, { now: new Date("2026-10-27T00:00:00Z") });
  assertEquals(result.breakdown.originality, 0);
});

// ─── Test 3: Akun Baru (<90 hari) dengan Skor Mentah Tinggi Dibatasi 70 ─
Deno.test("scoring: akun baru (<90 hari) dibatasi maksimal 70 + evidence", () => {
  const newAccountFacts = structuredClone(g1Facts);
  // Akun baru dibuat 20 hari lalu
  newAccountFacts.accountCreatedAt = "2026-10-07T00:00:00Z";

  const result = calculateScore(newAccountFacts, { now: new Date("2026-10-27T00:00:00Z") });
  assertEquals(result.authenticity, 70);

  const hasNewAccountEvidence = result.breakdown.evidence.some((e: any) =>
    e.label.includes("Akun Baru")
  );
  assert(hasNewAccountEvidence, "Wajib menyertakan evidence Akun Baru");
});

// ─── Test 4: Deteksi Burst Pembuatan Repo (>=10 dalam 24 jam) ───
Deno.test("scoring: burst pembuatan repo (>=10 repo/24 jam) terkena penalti -10", () => {
  const burstFacts = structuredClone(g1Facts);
  // Set 10 repo dibuat pada hari yang sama
  burstFacts.repos.forEach((r: any, idx: number) => {
    r.createdAt = `2026-05-01T${String(idx).padStart(2, "0")}:00:00Z`;
  });

  const result = calculateScore(burstFacts, { now: new Date("2026-10-27T00:00:00Z") });
  const hasBurstEvidence = result.breakdown.evidence.some((e: any) =>
    e.label.includes("Pembuatan Repo Massal")
  );
  assert(hasBurstEvidence, "Wajib menyertakan evidence pembuatan repo massal");
});

// ─── Test 5: Akun Tanpa Repo -> Low Authenticity & Confidence <= 60 ─
Deno.test("scoring: akun tanpa repo menghasilkan confidence <= 60", () => {
  const noRepoFacts = structuredClone(g1Facts);
  noRepoFacts.repos = [];
  noRepoFacts.profile.publicReposTotal = 0;
  noRepoFacts.profile.originalPublicCount = 0;

  const result = calculateScore(noRepoFacts, { now: new Date("2026-10-27T00:00:00Z") });
  assert(result.confidence <= 60, `Confidence harus <= 60, didapat: ${result.confidence}`);
  assertEquals(result.breakdown.originality, 0);
  assertEquals(result.breakdown.proof, 0);
  assertEquals(result.breakdown.substance, 0);
});

// ─── Test 6: Akun Tanpa Kalender Kontribusi ───────────────────
Deno.test("scoring: tanpa kalender kontribusi confidence -20 dan streakWeeks 0", () => {
  const noCalFacts = structuredClone(g1Facts);
  noCalFacts.calendar = {
    totalContributions: 0,
    weeks: [],
    days84: Array(84).fill(0),
    activeWeeks52: 0,
    activeWeeks12: 0,
    streakWeeks: 0,
  };

  const result = calculateScore(noCalFacts, { now: new Date("2026-10-27T00:00:00Z") });
  assert(result.confidence <= 80);

  const metrics = deriveMetrics(noCalFacts, noCalFacts.repos);
  assertEquals(metrics.streakWeeks, 0);
  assertEquals(metrics.commitHealth, "Sporadic");
});

// ─── Test 7: Tanpa Demo & Tanpa Rilis -> Proof 0 ──────────────
Deno.test("scoring: tanpa demo dan tanpa rilis menghasilkan proof 0", () => {
  const noProofFacts = structuredClone(g1Facts);
  noProofFacts.repos.forEach((r: any) => {
    r.demoVerified = false;
    r.releasesCount = 0;
  });

  const result = calculateScore(noProofFacts, { now: new Date("2026-10-27T00:00:00Z") });
  assertEquals(result.breakdown.proof, 0);
});

// ─── Test 8: Inferred Role Tests ──────────────────────────────
Deno.test("role: klasifikasi peran inferensi deterministik sesuai aturan prioritas", () => {
  // Mobile
  assertEquals(inferDeveloperRole("Dart", ["Flutter"], {}), "Mobile Developer");
  assertEquals(inferDeveloperRole("TypeScript", ["React Native"], {}), "Mobile Developer");
  assertEquals(inferDeveloperRole("Kotlin", [], {}), "Mobile Developer");

  // AI / Data Engineer
  assertEquals(inferDeveloperRole("Python", ["PyTorch"], {}), "AI / Data Engineer");
  assertEquals(inferDeveloperRole("Jupyter Notebook", [], {}), "AI / Data Engineer");

  // Front-End Developer
  assertEquals(inferDeveloperRole("TypeScript", ["React", "Tailwind CSS"], {}), "Front-End Developer");
  assertEquals(inferDeveloperRole("JavaScript", ["Vue"], {}), "Front-End Developer");

  // Back-End Developer
  assertEquals(inferDeveloperRole("Go", ["Gin"], {}), "Back-End Developer");
  assertEquals(inferDeveloperRole("JavaScript", ["Express"], {}), "Back-End Developer");
  assertEquals(inferDeveloperRole("Rust", ["Tokio"], {}), "Back-End Developer");
});

// ─── Test 9: Language Stats (Byte-Based & Ignore Tooling) ──────
Deno.test("languages: statistik bahasa berbasis byte dan mengabaikan Dockerfile/Makefile", () => {
  const mockRepos = [
    {
      languagesBytes: {
        TypeScript: 60000,
        JavaScript: 40000,
        Dockerfile: 50000, // Diabaikan
        Makefile: 10000,   // Diabaikan
      },
    },
  ];

  const { languageStats, primaryLanguage } = deriveLanguageStats(mockRepos as any);
  assertEquals(primaryLanguage, "TypeScript");
  assertEquals(languageStats.length, 2);
  assertEquals(languageStats[0].name, "TypeScript");
  assertEquals(languageStats[0].value, 60);
  assertEquals(languageStats[1].name, "JavaScript");
  assertEquals(languageStats[1].value, 40);
});

// ─── Test 10: AnalysisVM Mematuhi Zod Schema SP-0 ─────────────
Deno.test("vm: seluruh keluaran AnalysisVM berhasil divalidasi oleh Zod schema", () => {
  const vm = buildAnalysisVM(g1Facts, {
    source: "fresh",
    countryCode: "ID",
    city: "Jakarta",
  });

  // Validasi dengan skema Zod
  const parsed = AnalysisVM.parse(vm);
  assertEquals(parsed.user.login, "g1_developer");
  assertEquals(parsed.heatmap.length, 84);
  assert(parsed.repos.length <= 8);
  assertEquals(parsed.source, "fresh");
});

// ─── Test 11: Re-scoring dari Facts Tersimpan ─────────────────
Deno.test("vm: re-scoring murni dari Facts tanpa fetch ulang", () => {
  const rescored = rescore(g1Facts, "cache");
  assertEquals(rescored.source, "cache");
  assertEquals(rescored.authenticity, 77);
});
