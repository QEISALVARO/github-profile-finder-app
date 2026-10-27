// @ts-nocheck
// supabase/functions/_shared/github/graphql.ts
// Eksekutor GraphQL GitHub dengan pemantauan kuota rateLimit dan penanganan error terstruktur.

import { GitHubAuth } from "./auth.ts";

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; type?: string; path?: string[] }>;
  rateLimit?: {
    cost: number;
    remaining: number;
    resetAt: string;
  };
}

export class GitHubGraphQLError extends Error {
  status: number;
  retryAfter?: number;
  isRateLimited: boolean;
  isNotFound: boolean;

  constructor(message: string, status = 502, retryAfter?: number, isRateLimited = false, isNotFound = false) {
    super(message);
    this.name = "GitHubGraphQLError";
    this.status = status;
    this.retryAfter = retryAfter;
    this.isRateLimited = isRateLimited;
    this.isNotFound = isNotFound;
  }
}

export async function executeGraphQL<T = any>(
  query: string,
  variables: Record<string, any>,
  auth: GitHubAuth,
  customFetch: typeof fetch = fetch,
  timeoutMs = 15000
): Promise<GraphQLResponse<T>> {
  const token = await auth.getToken();
  const signal = AbortSignal.timeout(timeoutMs);

  let res: Response;
  try {
    res = await customFetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Gitscope-Backend/2.0",
      },
      body: JSON.stringify({ query, variables }),
      signal,
    });
  } catch (err: unknown) {
    throw new GitHubGraphQLError(`Koneksi jaringan ke GitHub GraphQL gagal: ${err instanceof Error ? err.message : String(err)}`, 502);
  }

  // Tangani status HTTP error
  if (!res.ok) {
    if (res.status === 401) {
      throw new GitHubGraphQLError("Token GitHub API tidak valid atau kedaluwarsa", 401);
    }
    if (res.status === 403 || res.status === 429) {
      const retryHeader = res.headers.get("retry-after");
      const retryAfter = retryHeader ? parseInt(retryHeader, 10) : 60;
      throw new GitHubGraphQLError("Rate limit GitHub API tercapai", 429, retryAfter, true);
    }
    throw new GitHubGraphQLError(`GitHub GraphQL mengembalikan status HTTP ${res.status}`, 502);
  }

  const payload: GraphQLResponse<T> = await res.json();

  if (payload.errors && payload.errors.length > 0) {
    const notFoundError = payload.errors.find(
      (e) => e.type === "NOT_FOUND" || e.message.toLowerCase().includes("could not resolve to a user")
    );
    if (notFoundError) {
      throw new GitHubGraphQLError("Pengguna GitHub tidak ditemukan", 404, undefined, false, true);
    }

    const rateLimitError = payload.errors.find(
      (e) => e.type === "RATE_LIMITED" || e.message.toLowerCase().includes("rate limit")
    );
    if (rateLimitError) {
      throw new GitHubGraphQLError("Rate limit GitHub GraphQL tercapai", 429, 60, true);
    }
  }

  return payload;
}
