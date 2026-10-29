// @ts-nocheck
// supabase/functions/_shared/github/rate.ts
// Pemantauan kuota rate limit GitHub API (REST & GraphQL), secondary rate limit, dan backoff.

export interface RateLimitState {
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp dalam detik
  used: number;
}

export function parseRestRateLimits(headers: Headers): RateLimitState | null {
  const limitStr = headers.get("x-ratelimit-limit");
  const remStr = headers.get("x-ratelimit-remaining");
  const resetStr = headers.get("x-ratelimit-reset");
  const usedStr = headers.get("x-ratelimit-used");

  if (!remStr || !resetStr) return null;

  return {
    limit: limitStr ? parseInt(limitStr, 10) : 5000,
    remaining: parseInt(remStr, 10),
    resetAt: parseInt(resetStr, 10),
    used: usedStr ? parseInt(usedStr, 10) : 0,
  };
}

export function parseRetryAfter(headers: Headers): number {
  const retryHeader = headers.get("retry-after");
  if (retryHeader) {
    const val = parseInt(retryHeader, 10);
    if (!isNaN(val)) return val;
  }

  const resetHeader = headers.get("x-ratelimit-reset");
  if (resetHeader) {
    const resetTimestamp = parseInt(resetHeader, 10);
    if (!isNaN(resetTimestamp)) {
      const diff = Math.ceil(resetTimestamp - Date.now() / 1000);
      return diff > 0 ? diff : 60;
    }
  }

  return 60; // default 60 detik
}

export function isQuotaExhausted(remaining: number, limit = 5000, thresholdRatio = 0.05): boolean {
  const threshold = Math.max(10, Math.floor(limit * thresholdRatio));
  return remaining < threshold;
}
