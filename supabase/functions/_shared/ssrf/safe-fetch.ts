// @ts-nocheck
// supabase/functions/_shared/ssrf/safe-fetch.ts
// Verifikasi URL demo yang aman dari serangan SSRF, loopback, private network, dan DNS rebinding.

import { isForbiddenHostname, isForbiddenIp } from "./ip.ts";

export interface SafeFetchResult {
  verified: boolean;
  finalUrl?: string;
  statusCode?: number;
  error?: string;
}

export async function validateUrlSafety(urlStr: string): Promise<{ valid: boolean; reason?: string; url?: URL }> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, reason: "Format URL tidak valid" };
  }

  // 1. Protokol hanya http atau https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, reason: `Protokol tidak diizinkan: ${parsed.protocol}` };
  }

  // 2. Tidak boleh ada userinfo (user:pass@host)
  if (parsed.username || parsed.password) {
    return { valid: false, reason: "Userinfo pada URL dilarang" };
  }

  // 3. Port hanya standar 80 / 443 atau kosong
  const port = parsed.port;
  if (port && port !== "80" && port !== "443") {
    return { valid: false, reason: `Port kustom tidak diizinkan: ${port}` };
  }

  // 4. Hostname dilarang (localhost, internal, numerik)
  const hostname = parsed.hostname.replace(/^\[|\]$/g, ""); // lepas kurung IPv6 jika ada
  if (isForbiddenHostname(hostname)) {
    return { valid: false, reason: `Hostname dilarang: ${hostname}` };
  }

  // 5. Cek apakah hostname adalah IP literal
  if (isForbiddenIp(hostname)) {
    return { valid: false, reason: `Alamat IP privat atau terlarang: ${hostname}` };
  }

  // 6. Resolusi DNS bila diizinkan di runtime
  if (typeof Deno !== "undefined" && typeof Deno.resolveDns === "function") {
    try {
      const ipv4Addresses = await Deno.resolveDns(hostname, "A").catch(() => []);
      for (const ip of ipv4Addresses) {
        if (isForbiddenIp(ip)) {
          return { valid: false, reason: `DNS resolve ke IP terlarang: ${ip}` };
        }
      }

      const ipv6Addresses = await Deno.resolveDns(hostname, "AAAA").catch(() => []);
      for (const ip of ipv6Addresses) {
        if (isForbiddenIp(ip)) {
          return { valid: false, reason: `DNS resolve ke IPv6 terlarang: ${ip}` };
        }
      }
    } catch {
      // Jika DNS gagal resolve, URL tidak dapat diakses
      return { valid: false, reason: `Gagal me-resolve DNS untuk hostname: ${hostname}` };
    }
  }

  return { valid: true, url: parsed };
}

export async function safeVerifyDemoUrl(targetUrl: string, maxRedirects = 3): Promise<SafeFetchResult> {
  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const safety = await validateUrlSafety(currentUrl);
    if (!safety.valid) {
      return { verified: false, error: safety.reason };
    }

    try {
      const signal = AbortSignal.timeout(5000); // Batas 5 detik

      // Coba HEAD terlebih dahulu
      let res = await fetch(currentUrl, {
        method: "HEAD",
        headers: { "User-Agent": "Gitscope-Demo-Verifier/2.0" },
        redirect: "manual",
        signal,
      });

      // Tangani redirect manual
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("Location");
        if (!location) {
          return { verified: false, statusCode: res.status, error: "Redirect tanpa header Location" };
        }

        redirectsCount++;
        if (redirectsCount > maxRedirects) {
          return { verified: false, error: "Terlalu banyak redirect (> 3)" };
        }

        // Resolusikan redirect relative URL ke absolute
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      // Jika server menolak HEAD (405 Method Not Allowed), coba GET dengan batas transfer
      if (res.status === 405 || res.status === 501) {
        res = await fetch(currentUrl, {
          method: "GET",
          headers: { "User-Agent": "Gitscope-Demo-Verifier/2.0" },
          redirect: "manual",
          signal,
        });

        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get("Location");
          if (!location) return { verified: false, statusCode: res.status };
          redirectsCount++;
          if (redirectsCount > maxRedirects) return { verified: false, error: "Terlalu banyak redirect (> 3)" };
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }
      }

      // 2xx = Berhasil
      const isOk = res.status >= 200 && res.status < 300;
      return {
        verified: isOk,
        finalUrl: currentUrl,
        statusCode: res.status,
      };
    } catch (err: unknown) {
      return {
        verified: false,
        error: err instanceof Error ? err.message : "Gagal menghubungi URL",
      };
    }
  }

  return { verified: false, error: "Batas maksimal redirect terlampaui" };
}
