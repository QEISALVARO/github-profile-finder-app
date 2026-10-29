// @ts-nocheck
// supabase/functions/list-my-repos/index.ts
// BE-3: daftar repo PUBLIK milik pemanggil untuk dipilih (MyRepoItem[]).
// Login diambil dari profiles.login pemanggil — TIDAK menerima login dari klien.
// Rate limit: 60/jam (app_rate_limits.list_my_repos). Peran developer wajib.

import { corsHeaders, json, errorResponse } from "../_shared/http.ts";
import { authenticateCaller, getAdminClient } from "../_shared/supabase.ts";
import { createGitHubAuth } from "../_shared/github/auth.ts";
import { executeGraphQL, GitHubGraphQLError } from "../_shared/github/graphql.ts";

const OWNER_REPOS_QUERY = `
query OwnerRepos($login: String!, $after: String) {
  rateLimit { cost remaining resetAt }
  user(login: $login) {
    repositories(
      first: 20
      after: $after
      ownerAffiliations: OWNER
      privacy: PUBLIC
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        databaseId
        nameWithOwner
        name
        description
        primaryLanguage { name }
        stargazerCount
        pushedAt
        isFork
        isArchived
        isEmpty
        homepageUrl
      }
    }
  }
}`;

function toCursor(obj: unknown): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}
function fromCursor<T>(s: string): T {
  return JSON.parse(decodeURIComponent(escape(atob(s))));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse("VALIDATION", "Hanya metode GET/POST yang diizinkan", 405);
  }

  const { user: caller, error: authError } = await authenticateCaller(
    req.headers.get("Authorization"),
  );
  if (authError || !caller) {
    return errorResponse("UNAUTHORIZED", authError ?? "Token autentikasi tidak valid", 401);
  }

  const adminClient = getAdminClient();

  // Profil pemanggil (login + peran).
  const { data: profile } = await adminClient
    .from("profiles")
    .select("github_login, roles")
    .eq("id", caller.id)
    .maybeSingle();

  const login = (profile?.github_login ?? caller.githubLogin ?? "").toLowerCase();
  if (!login) {
    return errorResponse("VALIDATION", "Profil GitHub pemanggil belum terhubung", 400);
  }
  if (!((profile?.roles ?? []) as string[]).includes("developer")) {
    return errorResponse("FORBIDDEN", "Hanya peran developer yang dapat mempublikasi proyek", 403);
  }

  // Rate limit 60/jam.
  try {
    const { data: rl } = await adminClient.rpc("check_rate_limit", {
      p_user: caller.id,
      p_key: "list_my_repos",
      p_max: 60,
      p_window: "1 hour",
    });
    if (rl?.[0] && !rl[0].allowed) {
      return errorResponse(
        "RATE_LIMITED",
        `Batas daftar repo tercapai. Coba lagi dalam ${rl[0].retry_after ?? 60} detik.`,
        429,
        rl[0].retry_after ?? 60,
      );
    }
  } catch { /* abaikan kegagalan rate-limit lunak */ }

  // Kursor dari query string (GET) atau body (POST).
  let after: string | null = null;
  try {
    if (req.method === "GET") {
      const u = new URL(req.url);
      const c = u.searchParams.get("cursor");
      if (c) after = (fromCursor<{ after?: string }>(c).after as string) ?? null;
    } else {
      const body = await req.json().catch(() => ({}));
      if (typeof body.cursor === "string" && body.cursor) {
        after = (fromCursor<{ after?: string }>(body.cursor).after as string) ?? null;
      }
    }
  } catch {
    return errorResponse("VALIDATION", "Format kursor tidak valid", 400);
  }

  // Repo milik pemanggil (server-side, token layanan).
  const auth = createGitHubAuth();
  let gql: any;
  try {
    gql = await executeGraphQL(OWNER_REPOS_QUERY, { login, after }, auth);
  } catch (err: unknown) {
    if (err instanceof GitHubGraphQLError) {
      if (err.isRateLimited) {
        return errorResponse("RATE_LIMITED", "Kuota GitHub API habis. Coba lagi nanti.", 429, err.retryAfter ?? 60);
      }
      if (err.isNotFound) return errorResponse("NOT_FOUND", "Akun GitHub tidak ditemukan", 404);
    }
    return errorResponse("UPSTREAM_ERROR", "Gagal menghubungi GitHub API", 502);
  }

  const conn = gql?.data?.user?.repositories;
  if (!conn) return errorResponse("NOT_FOUND", "Akun GitHub tidak ditemukan", 404);
  const nodes = conn.nodes ?? [];

  // alreadyPublished dari DB (service role).
  const repoIds = nodes.map((n: any) => n.databaseId).filter(Boolean);
  let published = new Set<number>();
  if (repoIds.length > 0) {
    const { data: rows } = await adminClient
      .from("projects")
      .select("github_repo_id")
      .in_("github_repo_id", repoIds);
    published = new Set((rows ?? []).map((r: any) => r.github_repo_id));
  }

  const items = nodes.map((n: any) => {
    const isFork = n.isFork === true;
    const isEmpty = n.isEmpty === true;
    const notOwner = false; // query sudah ownerAffiliations: OWNER
    const ineligibleReason = isFork ? "FORK" : isEmpty ? "EMPTY" : null;
    return {
      githubRepoId: n.databaseId,
      fullName: n.nameWithOwner,
      name: n.name,
      description: n.description ?? null,
      language: n.primaryLanguage?.name ?? null,
      stars: n.stargazerCount ?? 0,
      pushedAt: n.pushedAt ?? null,
      isFork,
      isArchived: n.isArchived === true,
      homepageUrl: n.homepageUrl ?? null,
      alreadyPublished: published.has(n.databaseId),
      eligible: !isFork && !isEmpty && !notOwner,
      ineligibleReason,
    };
  });

  const nextCursor = conn.pageInfo?.hasNextPage && conn.pageInfo?.endCursor
    ? toCursor({ after: conn.pageInfo.endCursor })
    : null;

  return json({ items, nextCursor });
});
