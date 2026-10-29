// @ts-nocheck
// supabase/functions/analyze-developer/index_test.ts
// Deno test untuk endpoint Edge Function analyze-developer (PRD V2 §5.2).

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildAnalysisVM } from "../_shared/scoring/vm.ts";
import { sanitizeNoEmail } from "../_shared/github/facts.ts";
import { AnalysisVM } from "../../../contracts/src/analysis.ts";

const g1Facts = JSON.parse(
  await Deno.readTextFile(new URL("../_fixtures/github/g1_facts.json", import.meta.url))
);

// ─── Test 1: Sanitasi Email (POL-2) ───────────────────────────
Deno.test("analyze-developer: sanitasi POL-2 membuang seluruh alamat email dari profil dan bio", () => {
  const bioWithEmail = "Contact me at dev@example.com for jobs or at support@domain.org";
  const sanitized = sanitizeNoEmail(bioWithEmail);
  assert(!sanitized?.includes("dev@example.com"), "Email harus disanitasi");
  assert(!sanitized?.includes("support@domain.org"), "Email harus disanitasi");
  assert(sanitized?.includes("[REDACTED_EMAIL]"));
});

// ─── Test 2: Validasi Format Login GitHub ─────────────────────
Deno.test("analyze-developer: validasi login GitHub menolak karakter ilegal", () => {
  const GITHUB_LOGIN_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

  assertEquals(GITHUB_LOGIN_REGEX.test("valid-user"), true);
  assertEquals(GITHUB_LOGIN_REGEX.test("octocat"), true);
  assertEquals(GITHUB_LOGIN_REGEX.test("user123"), true);

  // Karakter terlarang
  assertEquals(GITHUB_LOGIN_REGEX.test("-invalid"), false);     // diawali hyphen
  assertEquals(GITHUB_LOGIN_REGEX.test("invalid-"), false);     // diakhiri hyphen
  assertEquals(GITHUB_LOGIN_REGEX.test("user--name"), false);   // double hyphen
  assertEquals(GITHUB_LOGIN_REGEX.test("user@name"), false);    // simbol @
  assertEquals(GITHUB_LOGIN_REGEX.test("user.name"), false);    // titik
});

// ─── Test 3: Status Source 'stale' Saat Kegagalan Hulu ─────────
Deno.test("analyze-developer: menghasilkan source 'stale' dan staleSince saat upstream gagal", () => {
  const createdAt = "2026-10-25T12:00:00Z";
  const staleVm = buildAnalysisVM(g1Facts, {
    source: "stale",
    staleSince: createdAt,
    countryCode: "ID",
    city: "Jakarta",
  });

  assertEquals(staleVm.source, "stale");
  assertEquals(staleVm.staleSince, createdAt);
  assert(staleVm.authenticity > 0);

  // Pastikan tetap lolos skema AnalysisVM
  const parsed = AnalysisVM.parse(staleVm);
  assertEquals(parsed.source, "stale");
});

// ─── Test 4: Status Source 'cache' Saat Masih Segar ───────────
Deno.test("analyze-developer: menghasilkan source 'cache' untuk data yang tersimpan", () => {
  const cachedVm = buildAnalysisVM(g1Facts, {
    source: "cache",
    countryCode: "ID",
    city: "Jakarta",
  });

  assertEquals(cachedVm.source, "cache");
  assertEquals(cachedVm.staleSince, undefined);

  const parsed = AnalysisVM.parse(cachedVm);
  assertEquals(parsed.source, "cache");
});
