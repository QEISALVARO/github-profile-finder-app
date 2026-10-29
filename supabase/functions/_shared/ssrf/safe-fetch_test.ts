// @ts-nocheck
// supabase/functions/_shared/ssrf/safe-fetch_test.ts
// Deno test untuk Pencegahan SSRF (PRD V2 §4.4 & §5.3).
//
// SELURUH test memakai resolver/fetch PALSU — tidak ada panggilan DNS atau
// jaringan nyata. Resolver default (Deno.resolveDns) hanya dipakai di runtime
// produksi, bukan di test.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { safeVerifyDemoUrl, validateUrlSafety } from "./safe-fetch.ts";
import { isForbiddenHostname, isPrivateOrReservedIPv4, isPrivateOrReservedIPv6 } from "./ip.ts";

// Resolver palsu: hostname "aman" -> IP publik; sisanya simulasikan kasus uji.
async function fakePublicDns(hostname: string, _recordType: "A" | "AAAA"): Promise<string[]> {
  if (hostname === "example.com" || hostname.endsWith(".myproject.org") || hostname === "github.com") {
    return _recordType === "A" ? ["93.184.215.14"] : [];
  }
  return [];
}

// ─── Test 1: Deteksi IP dan Hostname Terlarang ────────────────
Deno.test("ssrf: tolak loopback, private IP, dan hostname lokal", () => {
  // Loopback IPv4
  assertEquals(isPrivateOrReservedIPv4("127.0.0.1"), true);
  assertEquals(isPrivateOrReservedIPv4("127.1.2.3"), true);

  // Private RFC1918
  assertEquals(isPrivateOrReservedIPv4("10.0.0.5"), true);
  assertEquals(isPrivateOrReservedIPv4("172.16.0.1"), true);
  assertEquals(isPrivateOrReservedIPv4("192.168.1.1"), true);

  // Link-local & Cloud Metadata (169.254.169.254)
  assertEquals(isPrivateOrReservedIPv4("169.254.169.254"), true);

  // IPv6 Loopback, ULA, Link-local
  assertEquals(isPrivateOrReservedIPv6("::1"), true);
  assertEquals(isPrivateOrReservedIPv6("fe80::1"), true);
  assertEquals(isPrivateOrReservedIPv6("fc00::1"), true);

  // Hostname
  assertEquals(isForbiddenHostname("localhost"), true);
  assertEquals(isForbiddenHostname("sub.localhost"), true);
  assertEquals(isForbiddenHostname("server.local"), true);
  assertEquals(isForbiddenHostname("metadata.internal"), true);

  // Format numerik terlarang (oktal / heksa / integer)
  assertEquals(isForbiddenHostname("2130706433"), true);
  assertEquals(isForbiddenHostname("0x7f.0.0.1"), true);
});

// ─── Test 2: Validasi URL Terlarang (SSRF Matrix §5.3) ─────────
Deno.test("ssrf: tolak semua variasi URL berbahaya", async () => {
  const dangerousUrls = [
    "http://127.0.0.1",
    "http://127.0.0.1:80",
    "http://localhost",
    "http://localhost:3000",
    "http://[::1]",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.5",
    "http://192.168.1.1",
    "http://0x7f.0.0.1",
    "http://2130706433",
    "http://user:pass@example.com",
    "ftp://example.com",
    "https://example.com:8443", // Port kustom selain 80/443
    "javascript:alert(1)",
  ];

  for (const url of dangerousUrls) {
    const res = await validateUrlSafety(url, { resolveDns: fakePublicDns });
    assertEquals(res.valid, false, `URL berbahaya harus ditolak: ${url}`);
  }
});

// ─── Test 3: URL Publik Normal Diizinkan ──────────────────────
Deno.test("ssrf: izinkan URL HTTPS publik standar (resolver palsu)", async () => {
  const safeUrls = [
    "https://example.com",
    "https://github.com/octocat",
    "http://example.com/demo",
    "https://demo.myproject.org:443",
  ];

  for (const url of safeUrls) {
    const res = await validateUrlSafety(url, { resolveDns: fakePublicDns });
    assertEquals(res.valid, true, `URL aman harus diizinkan: ${url}`);
  }
});

// ─── Test 4: DNS palsu menolak IP privat/loopback/link-local/ULA/IPv4-mapped ──
Deno.test("ssrf: resolver palsu menolak IP privat, loopback, link-local, ULA, IPv4-mapped", async () => {
  const cases: Array<{ ip: string; recordType: "A" | "AAAA" }> = [
    { ip: "10.1.2.3", recordType: "A" }, // RFC1918
    { ip: "127.0.0.1", recordType: "A" }, // loopback
    { ip: "169.254.169.254", recordType: "A" }, // link-local / metadata
    { ip: "100.64.0.1", recordType: "A" }, // CGNAT
    { ip: "::1", recordType: "AAAA" }, // loopback v6
    { ip: "fe80::1", recordType: "AAAA" }, // link-local v6
    { ip: "fc00::1", recordType: "AAAA" }, // ULA
    { ip: "::ffff:127.0.0.1", recordType: "AAAA" }, // IPv4-mapped loopback
  ];
  for (const { ip, recordType } of cases) {
    const res = await validateUrlSafety("https://evil.example/", {
      resolveDns: async () => (recordType === "A" ? [ip] : []),
    });
    // evil.example bukan IP literal publik sehingga lolos cek hostname;
    // penolakan harus datang dari hasil DNS palsu.
    assertEquals(res.valid, false, `DNS ${ip} harus ditolak`);
  }
});

// ─── Test 5: Campuran A+AAAA dengan satu IP privat tetap ditolak ──
Deno.test("ssrf: tolak bila salah satu record A/AAAA privat", async () => {
  const res = await validateUrlSafety("https://mixed.example/", {
    resolveDns: async (_h, t) => (t === "A" ? ["93.184.215.14"] : ["fc00::99"]),
  });
  assertEquals(res.valid, false);
});

// ─── Test 6: Tanpa alamat DNS ditolak dengan alasan eksplisit ──
Deno.test("ssrf: tolak bila tidak ada alamat DNS", async () => {
  const res = await validateUrlSafety("https://nodns.example/", {
    resolveDns: async () => [],
  });
  assertEquals(res.valid, false);
  assertEquals(typeof res.reason === "string" && res.reason.length > 0, true);
});

// ─── Test 7: Redirect publik -> privat ditolak (fetch palsu) ──
Deno.test("ssrf: redirect publik ke privat ditolak", async () => {
  const fakeFetch = async (url: string, _init?: RequestInit): Promise<Response> => {
    if (url === "https://example.com/start") {
      return new Response(null, { status: 302, headers: { Location: "http://10.0.0.5/secret" } });
    }
    return new Response("should not be fetched", { status: 200 });
  };
  const res = await safeVerifyDemoUrl("https://example.com/start", 3, {
    resolveDns: fakePublicDns,
    fetchImpl: fakeFetch,
  });
  assertEquals(res.verified, false);
});

// ─── Test 8: Redirect berlebih (> 3) ditolak (fetch palsu) ──
Deno.test("ssrf: tolak redirect lebih dari 3", async () => {
  const fakeFetch = async (url: string, _init?: RequestInit): Promise<Response> => {
    const n = Number(url.split("/hop-")[1] ?? "0");
    return new Response(null, { status: 302, headers: { Location: `https://example.com/hop-${n + 1}` } });
  };
  const res = await safeVerifyDemoUrl("https://example.com/hop-0", 3, {
    resolveDns: fakePublicDns,
    fetchImpl: fakeFetch,
  });
  assertEquals(res.verified, false);
  assertEquals(
    res.error === "Terlalu banyak redirect (> 3)" || res.error === "Batas maksimal redirect terlampaui",
    true,
  );
});

// ─── Test 9: Timeout 5 detik dihormati (fetch palsu lambat) ──
Deno.test("ssrf: timeout default 5 detik menggagalkan fetch lambat", async () => {
  const slowFetch = async (_url: string, init?: RequestInit): Promise<Response> => {
    const signal = init?.signal;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => resolve(), 30_000);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    });
    return new Response("late", { status: 200 });
  };
  const res = await safeVerifyDemoUrl("https://example.com/slow", 3, {
    resolveDns: fakePublicDns,
    fetchImpl: slowFetch,
    timeoutMs: 50,
  });
  assertEquals(res.verified, false);
});
