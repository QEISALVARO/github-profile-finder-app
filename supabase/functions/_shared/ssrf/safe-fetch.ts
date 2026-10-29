// @ts-nocheck
// supabase/functions/_shared/ssrf/safe-fetch.ts
// Verifikasi URL demo yang aman dari serangan SSRF, loopback, private network, dan DNS rebinding.

import { isForbiddenHostname, isForbiddenIp, isIpLiteral } from "./ip.ts";

export interface SafeFetchResult {
  verified: boolean;
  finalUrl?: string;
  statusCode?: number;
  error?: string;
}

export type DnsRecordType = "A" | "AAAA";

export type DnsResolver = (hostname: string, recordType: DnsRecordType) => Promise<string[]>;

async function defaultDnsResolve(hostname: string, recordType: DnsRecordType): Promise<string[]> {
  if (typeof Deno !== "undefined" && typeof Deno.resolveDns === "function") {
    return await Deno.resolveDns(hostname, recordType).catch(() => []);
  }
  return [];
}

export interface ValidateOptions {
  resolveDns?: DnsResolver;
}

export async function validateUrlSafety(
  urlStr: string,
  options: ValidateOptions = {},
): Promise<{ valid: boolean; reason?: string; url?: URL }> {
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

  // 5. Cek apakah hostname adalah IP literal (hanya IP literal yang dinilai;
  // hostname biasa seperti example.com lolos ke pemeriksaan DNS di bawah)
  if (isIpLiteral(hostname)) {
    // IPv6 dilipat ke bentuk tanpa kurung oleh URL; normalisasi di sini aman.
    const literal = hostname.replace(/^\[|\]$/g, "");
    if (isForbiddenIp(literal)) {
      return { valid: false, reason: `Alamat IP privat atau terlarang: ${hostname}` };
    }
  }

  // 6. Resolusi DNS (dapat disuntik untuk pengujian tanpa jaringan;
  // default memakai runtime Deno bila tersedia)
  {
    const resolveDns = options.resolveDns ?? defaultDnsResolve;
    let ipv4Addresses: string[] = [];
    let ipv6Addresses: string[] = [];
    try {
      ipv4Addresses = await resolveDns(hostname, "A");
    } catch {
      // Resolver gagal = hostname tidak dapat diakses
      return { valid: false, reason: `Gagal me-resolve DNS untuk hostname: ${hostname}` };
    }
    try {
      ipv6Addresses = await resolveDns(hostname, "AAAA");
    } catch {
      return { valid: false, reason: `Gagal me-resolve DNS untuk hostname: ${hostname}` };
    }
    // Campuran A+AAAA dengan satu IP privat tetap ditolak; tidak ada alamat
    // sama sekali juga ditolak dengan alasan eksplisit.
    if (ipv4Addresses.length === 0 && ipv6Addresses.length === 0) {
      return { valid: false, reason: `Tidak ada alamat DNS untuk hostname: ${hostname}` };
    }
    for (const ip of ipv4Addresses) {
      if (isForbiddenIp(ip)) {
        return { valid: false, reason: `DNS resolve ke IP terlarang: ${ip}` };
      }
    }
    for (const ip of ipv6Addresses) {
      if (isForbiddenIp(ip)) {
        return { valid: false, reason: `DNS resolve ke IPv6 terlarang: ${ip}` };
      }
    }
  }

  return { valid: true, url: parsed };
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface VerifyOptions extends ValidateOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

export async function safeVerifyDemoUrl(
  targetUrl: string,
  maxRedirects = 3,
  options: VerifyOptions = {},
): Promise<SafeFetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 5000;
  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const safety = await validateUrlSafety(currentUrl, { resolveDns: options.resolveDns });
    if (!safety.valid) {
      return { verified: false, error: safety.reason };
    }

    try {
      const signal = AbortSignal.timeout(timeoutMs); // Batas 5 detik (default)

      // Coba HEAD terlebih dahulu
      let res = await fetchImpl(currentUrl, {
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
        res = await fetchImpl(currentUrl, {
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
