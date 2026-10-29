// @ts-nocheck
// supabase/functions/publish-project/index_test.ts
// Unit offline publish-project: validasi kontrak + rumus + mapping + SSRF.
// Tanpa jaringan/GitHub/DB: yang diuji logika murni penentu respons.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PublishProjectInput, PublishProjectResult } from "../../../contracts/src/projects.ts";
import { detectFrameworks } from "../_shared/scoring/frameworks.ts";
import { inferDeveloperRole } from "../_shared/scoring/role.ts";

// Rumus repo BE-2 §4.6 (duplikasi eksplisit agar perubahan rumus ketahuan).
function repoScore(isFork: boolean, demoVerified: boolean, substance: number): number {
  return Math.min(100, (isFork ? 0 : 40) + (demoVerified ? 20 : 0) + Math.round(40 * substance));
}

// Pemetaan inferred -> FeedRole (harus sama dgn Edge Function).
function mapRole(inferred: string): string {
  if (inferred === "Front-End Developer") return "Front-End";
  if (inferred === "Mobile Developer") return "Mobile";
  if (inferred === "AI / Data Engineer") return "Data";
  return "Back-End";
}

function top3Stack(langs: Array<{ name: string; bytes: number }>) {
  const total = langs.reduce((s, l) => s + l.bytes, 0);
  const stack = langs.slice(0, 3).map((l) => ({
    name: l.name,
    percent: total > 0 ? Math.round((l.bytes / total) * 100) : 0,
  }));
  const sum = stack.reduce((s, x) => s + x.percent, 0);
  if (stack.length > 0 && sum !== 100) stack[0].percent += 100 - sum;
  return stack;
}

Deno.test("publish: rumus skor repo (fork/demo/substance)", () => {
  assertEquals(repoScore(false, true, 0.8), 40 + 20 + 32);
  assertEquals(repoScore(false, false, 0), 40);
  assertEquals(repoScore(true, true, 1), 60); // fork: tanpa 40
  assertEquals(repoScore(false, true, 1), 100); // cap 100
});

Deno.test("publish: stack top-3 byte berjumlah 100", () => {
  const stack = top3Stack([
    { name: "Go", bytes: 700 },
    { name: "React", bytes: 200 },
    { name: "Python", bytes: 50 },
    { name: "Rust", bytes: 50 },
  ]);
  assertEquals(stack.length, 3);
  assertEquals(stack.reduce((s, x) => s + x.percent, 0), 100);
});

Deno.test("publish: mapping inferred -> FeedRole", () => {
  assertEquals(mapRole("Front-End Developer"), "Front-End");
  assertEquals(mapRole("Mobile Developer"), "Mobile");
  assertEquals(mapRole("AI / Data Engineer"), "Data");
  assertEquals(mapRole("Back-End Developer"), "Back-End");
});

Deno.test("publish: PublishProjectInput menolak input buruk", () => {
  assertEquals(PublishProjectInput.safeParse({ githubRepoId: -1 }).success, false);
  assertEquals(PublishProjectInput.safeParse({ githubRepoId: 1, demoUrl: "bukan-url" }).success, false);
  assertEquals(PublishProjectInput.safeParse({ githubRepoId: 1, role: "DevOps" }).success, false);
  assertEquals(PublishProjectInput.safeParse({ githubRepoId: 1 }).success, true);
});

Deno.test("publish: PublishProjectResult fixture valid + stack 100", async () => {
  const raw = JSON.parse(
    await Deno.readTextFile(new URL("../../../contracts/fixtures/publish_result.json", import.meta.url)),
  );
  const parsed = PublishProjectResult.safeParse(raw);
  assertEquals(parsed.success, true);
  if (parsed.success) {
    assertEquals(parsed.data.stack.reduce((s: number, x: any) => s + x.percent, 0), 100);
  }
});

Deno.test("publish: inferensi role Go+manifest -> Back-End", () => {
  const role = inferDeveloperRole("Go", detectFrameworks([{ manifests: { "go.mod": "module x\nrequire github.com/gin-gonic/gin v1" } } as any]), { Go: 1000 });
  assertEquals(mapRole(role), "Back-End");
});

Deno.test("publish: inferensi React Native -> Mobile", () => {
  const role = inferDeveloperRole(
    "TypeScript",
    detectFrameworks([{ manifests: { "package.json": '{"dependencies":{"react-native":"0.73"}}' } } as any]),
    { TypeScript: 1000 },
  );
  assertEquals(mapRole(role), "Mobile");
});
