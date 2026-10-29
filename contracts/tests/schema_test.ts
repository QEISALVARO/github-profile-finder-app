// @ts-nocheck
// contracts/tests/schema_test.ts
// Deno test: parse semua fixture dengan skema zod yang sesuai
// Jalankan: deno test --allow-read contracts/tests/

import { assertEquals } from "jsr:@std/assert";
import { z } from "npm:zod@^3.24.0";
import { AnalysisVM } from "../src/analysis.ts";
import { FeedPage, CountryFacet } from "../src/feed.ts";
import { DiscoverPage, PipelineEntry } from "../src/talent.ts";
import { StartConversationInput, Message } from "../src/chat.ts";
import { ErrorBody } from "../src/common.ts";
import {
  CityFacet,
  FeedRole,
  MyRepoItem,
  MyReposPage,
  PublishProjectInput,
  PublishProjectResult,
} from "../src/projects.ts";

const fixturesDir = new URL("../fixtures/", import.meta.url);

async function loadFixture(name: string): Promise<unknown> {
  const path = new URL(name, fixturesDir);
  const text = await Deno.readTextFile(path);
  return JSON.parse(text);
}

Deno.test("AnalysisVM fixtures parse correctly", async () => {
  const raw = await loadFixture("analysis_vm.json") as unknown[];
  assertEquals(Array.isArray(raw), true, "should be array");
  for (const item of raw) {
    const result = AnalysisVM.safeParse(item);
    if (!result.success) {
      const desc = (item as Record<string, string>)._description ?? "unknown";
      throw new Error(`AnalysisVM parse failed for "${desc}": ${result.error.message}`);
    }
  }
});

Deno.test("FeedPage fixture parses correctly", async () => {
  const raw = await loadFixture("feed_page.json");
  const result = FeedPage.safeParse(raw);
  if (!result.success) throw new Error(`FeedPage parse failed: ${result.error.message}`);
  assertEquals(result.data.items.length, 2);
});

Deno.test("DiscoverPage fixture parses correctly", async () => {
  const raw = await loadFixture("discover_page.json");
  const result = DiscoverPage.safeParse(raw);
  if (!result.success) throw new Error(`DiscoverPage parse failed: ${result.error.message}`);
  assertEquals(result.data.items.length, 2);
});

Deno.test("CountryFacet fixtures parse correctly", async () => {
  const raw = await loadFixture("country_facets.json") as unknown[];
  for (const item of raw) {
    const result = CountryFacet.safeParse(item);
    if (!result.success) throw new Error(`CountryFacet parse failed: ${result.error.message}`);
  }
});

Deno.test("ErrorBody fixtures parse correctly", async () => {
  const raw = await loadFixture("error_body.json") as unknown[];
  for (const item of raw) {
    const result = ErrorBody.safeParse(item);
    if (!result.success) throw new Error(`ErrorBody parse failed: ${result.error.message}`);
  }
});

Deno.test("StartConversationInput fixture parses correctly", async () => {
  const raw = await loadFixture("start_conversation.json");
  const result = StartConversationInput.safeParse(raw);
  if (!result.success) throw new Error(`StartConversationInput parse failed: ${result.error.message}`);
});

Deno.test("Message fixture parses correctly", async () => {
  const raw = await loadFixture("message.json");
  const result = Message.safeParse(raw);
  if (!result.success) throw new Error(`Message parse failed: ${result.error.message}`);
});

Deno.test("CountryFacet supports <5 privacy mask", () => {
  const result = CountryFacet.safeParse({ iso2: "NO", count: "<5" });
  if (!result.success) throw new Error(`CountryFacet <5 parse failed: ${result.error.message}`);
  assertEquals(result.data.count, "<5");
});

Deno.test("CountryFacet supports numeric counts", () => {
  const result = CountryFacet.safeParse({ iso2: "US", count: 1247 });
  if (!result.success) throw new Error(`CountryFacet numeric parse failed: ${result.error.message}`);
  assertEquals(result.data.count, 1247);
});

Deno.test("CityFacet fixtures parse correctly (incl <5 mask)", async () => {
  const raw = await loadFixture("city_facets.json") as unknown[];
  assertEquals(Array.isArray(raw), true, "should be array");
  for (const item of raw) {
    const result = CityFacet.safeParse(item);
    if (!result.success) throw new Error(`CityFacet parse failed: ${result.error.message}`);
  }
});

Deno.test("MyReposPage fixture parses correctly", async () => {
  const raw = await loadFixture("my_repos.json");
  const result = MyReposPage.safeParse(raw);
  if (!result.success) throw new Error(`MyReposPage parse failed: ${result.error.message}`);
  assertEquals(result.data.items.length, 2);
  assertEquals(result.data.items[0].eligible, true);
  assertEquals(result.data.items[1].ineligibleReason, "FORK");
});

Deno.test("PublishProjectResult fixture parses correctly", async () => {
  const raw = await loadFixture("publish_result.json");
  const result = PublishProjectResult.safeParse(raw);
  if (!result.success) throw new Error(`PublishProjectResult parse failed: ${result.error.message}`);
  const total = result.data.stack.reduce((s, x) => s + x.percent, 0);
  assertEquals(total, 100);
});

Deno.test("PublishProjectInput rejects bad input", () => {
  const bad = PublishProjectInput.safeParse({ githubRepoId: -1, demoUrl: "not-a-url" });
  assertEquals(bad.success, false);
  const noDesc = PublishProjectInput.safeParse({ githubRepoId: 1 });
  assertEquals(noDesc.success, true);
});

Deno.test("FeedRole accepts BE-3 roles only", () => {
  assertEquals(FeedRole.safeParse("Back-End").success, true);
  assertEquals(FeedRole.safeParse("AI / Data Engineer").success, false);
});

Deno.test("MyRepoItem rejects bad ineligibleReason", () => {
  const bad = MyRepoItem.safeParse({
    githubRepoId: 1, fullName: "a/b", name: "b", description: null, language: null,
    stars: 0, pushedAt: null, isFork: false, isArchived: false, homepageUrl: null,
    alreadyPublished: false, eligible: false, ineligibleReason: "PRIVATE",
  });
  assertEquals(bad.success, false);
});

