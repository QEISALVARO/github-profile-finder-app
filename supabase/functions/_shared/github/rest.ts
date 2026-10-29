// @ts-nocheck
// supabase/functions/_shared/github/rest.ts
// GitHub REST API helper untuk panggilan langsung, fallback, dan conditional ETag.

import { GitHubAuth } from "./auth.ts";
import { parseRestRateLimits, parseRetryAfter, RateLimitState } from "./rate.ts";

export interface RestResult<T = any> {
  data?: T;
  status: number;
  rateLimit: RateLimitState | null;
  etag?: string | null;
  notModified: boolean;
}

export async function fetchGitHubRest<T = any>(
  path: string,
  auth: GitHubAuth,
  etag?: string | null,
  customFetch: typeof fetch = fetch
): Promise<RestResult<T>> {
  const token = await auth.getToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "Gitscope-Backend/2.0",
  };

  if (etag) {
    headers["If-None-Match"] = etag;
  }

  const res = await customFetch(`https://api.github.com${path}`, {
    headers,
    signal: AbortSignal.timeout(10000),
  });

  const rateLimit = parseRestRateLimits(res.headers);
  const responseEtag = res.headers.get("etag");

  if (res.status === 304) {
    return {
      status: 304,
      rateLimit,
      etag: responseEtag,
      notModified: true,
    };
  }

  if (res.status === 404) {
    return { status: 404, rateLimit, notModified: false };
  }

  if (res.status === 403 || res.status === 429) {
    const retryAfter = parseRetryAfter(res.headers);
    throw new Error(`GitHub REST rate limited (status ${res.status}, retry_after: ${retryAfter})`);
  }

  if (!res.ok) {
    throw new Error(`GitHub REST request gagal dengan status ${res.status}`);
  }

  const data = await res.json();
  return {
    data,
    status: res.status,
    rateLimit,
    etag: responseEtag,
    notModified: false,
  };
}
