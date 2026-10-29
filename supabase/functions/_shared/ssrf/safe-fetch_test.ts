// @ts-nocheck
// supabase/functions/_shared/ssrf/safe-fetch_test.ts
// Deno test untuk Pencegahan SSRF (PRD V2 §4.4 & §5.3).

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateUrlSafety } from "./safe-fetch.ts";
import { isForbiddenHostname, isPrivateOrReservedIPv4, isPrivateOrReservedIPv6 } from "./ip.ts";

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
    const res = await validateUrlSafety(url);
    assertEquals(res.valid, false, `URL berbahaya harus ditolak: ${url}`);
  }
});

// ─── Test 3: URL Publik Normal Diizinkan ──────────────────────
Deno.test("ssrf: izinkan URL HTTPS publik standar", async () => {
  const safeUrls = [
    "https://example.com",
    "https://github.com/octocat",
    "http://example.com/demo",
    "https://demo.myproject.org:443",
  ];

  for (const url of safeUrls) {
    const res = await validateUrlSafety(url);
    assertEquals(res.valid, true, `URL aman harus diizinkan: ${url}`);
  }
});
