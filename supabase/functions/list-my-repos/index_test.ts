// @ts-nocheck
// supabase/functions/list-my-repos/index_test.ts
// Unit offline list-my-repos: kelayakan repo + kursor + kontrak.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { MyRepoItem, MyReposPage } from "../../../contracts/src/projects.ts";

function eligibleOf(n: { isFork: boolean; isEmpty: boolean }) {
  const ineligibleReason = n.isFork ? "FORK" : n.isEmpty ? "EMPTY" : null;
  return { eligible: !n.isFork && !n.isEmpty, ineligibleReason };
}

function toCursor(o: unknown): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
function fromCursor<T>(s: string): T {
  return JSON.parse(decodeURIComponent(escape(atob(s))));
}

Deno.test("list-my-repos: eligible/ineligibleReason per aturan", () => {
  assertEquals(eligibleOf({ isFork: false, isEmpty: false }), { eligible: true, ineligibleReason: null });
  assertEquals(eligibleOf({ isFork: true, isEmpty: false }), { eligible: false, ineligibleReason: "FORK" });
  assertEquals(eligibleOf({ isFork: false, isEmpty: true }), { eligible: false, ineligibleReason: "EMPTY" });
  // Fork menang atas EMPTY (urutan cek kontrak).
  assertEquals(eligibleOf({ isFork: true, isEmpty: true }), { eligible: false, ineligibleReason: "FORK" });
});

Deno.test("list-my-repos: kursor roundtrip", () => {
  const c = toCursor({ after: "Y3Vyc29yOnYy" });
  assertEquals((fromCursor<{ after?: string }>(c).after as string), "Y3Vyc29yOnYy");
  let threw = false;
  try { fromCursor("!!!"); } catch { threw = true; }
  assertEquals(threw, true);
});

Deno.test("list-my-repos: fixture MyReposPage valid", async () => {
  const raw = JSON.parse(
    await Deno.readTextFile(new URL("../../../contracts/fixtures/my_repos.json", import.meta.url)),
  );
  const parsed = MyReposPage.safeParse(raw);
  assertEquals(parsed.success, true);
});

Deno.test("list-my-repos: MyRepoItem menolak ineligibleReason asing", () => {
  const bad = MyRepoItem.safeParse({
    githubRepoId: 1, fullName: "a/b", name: "b", description: null, language: null,
    stars: 0, pushedAt: null, isFork: false, isArchived: false, homepageUrl: null,
    alreadyPublished: false, eligible: false, ineligibleReason: "PRIVATE",
  });
  assertEquals(bad.success, false);
});
