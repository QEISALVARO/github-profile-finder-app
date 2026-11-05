// @ts-nocheck
// supabase/functions/list-my-repos/index.ts
// BE-3: daftar repo PUBLIK milik pemanggil untuk dipilih (MyRepoItem[]).
// Logika ada di handler.ts (dapat diuji offline); berkas ini hanya wiring
// dependensi nyata. Login diambil dari profiles.github_login pemanggil.

import { getAdminClient, authenticateCaller } from "../_shared/supabase.ts";
import { createGitHubAuth } from "../_shared/github/auth.ts";
import { executeGraphQL, GitHubGraphQLError } from "../_shared/github/graphql.ts";
import { UpstreamFailure } from "../_shared/github/upstream.ts";
import { createListMyReposHandler, type ListReposDeps } from "./handler.ts";

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

function mapGitHubError(err: unknown): never {
  if (err instanceof GitHubGraphQLError) {
    if (err.isRateLimited) throw new UpstreamFailure("rate_limited", err.message, err.retryAfter);
    if (err.isNotFound) throw new UpstreamFailure("not_found", err.message);
  }
  throw new UpstreamFailure("other", err instanceof Error ? err.message : String(err));
}

export function createDefaultDeps(): ListReposDeps {
  const adminClient = getAdminClient();
  const auth = createGitHubAuth();

  return {
    async authenticate(req) {
      const { user, error } = await authenticateCaller(req.headers.get("Authorization"));
      return {
        caller: user ? { id: user.id, githubLogin: user.githubLogin } : null,
        error,
      };
    },

    async getProfile(userId) {
      const { data } = await adminClient
        .from("profiles")
        .select("github_login, roles")
        .eq("id", userId)
        .maybeSingle();
      if (!data) return null;
      return {
        githubLogin: data.github_login ?? null,
        roles: (data.roles ?? []) as string[],
      };
    },

    async checkRateLimit(userId) {
      const { data } = await adminClient.rpc("check_rate_limit", {
        p_user: userId,
        p_key: "list_my_repos",
        p_max: 60,
        p_window: "1 hour",
      });
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) return { allowed: true, retryAfter: 0 };
      return { allowed: row.allowed === true, retryAfter: row.retry_after ?? 0 };
    },

    async listRepos(login, after) {
      let gql: { data?: { user?: { repositories?: unknown } } };
      try {
        gql = await executeGraphQL(OWNER_REPOS_QUERY, { login, after }, auth);
      } catch (err) {
        mapGitHubError(err);
      }
      const conn = gql?.data?.user?.repositories as
        | {
          pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
          nodes?: Array<Record<string, unknown>>;
        }
        | undefined;
      if (!conn) throw new UpstreamFailure("not_found", "Akun GitHub tidak ditemukan");

      return {
        nodes: (conn.nodes ?? []).map((n) => ({
          databaseId: Number(n.databaseId),
          nameWithOwner: String(n.nameWithOwner ?? ""),
          name: String(n.name ?? ""),
          description: (n.description as string | null) ?? null,
          primaryLanguage:
            (n.primaryLanguage as { name?: string } | null | undefined)?.name ?? null,
          stargazers: Number(n.stargazerCount ?? 0),
          pushedAt: (n.pushedAt as string | null) ?? null,
          isFork: n.isFork === true,
          isArchived: n.isArchived === true,
          isEmpty: n.isEmpty === true,
          homepageUrl: (n.homepageUrl as string | null) ?? null,
        })),
        hasNextPage: conn.pageInfo?.hasNextPage === true,
        endCursor: conn.pageInfo?.endCursor ?? null,
      };
    },

    async publishedRepoIds(ids) {
      const { data } = await adminClient
        .from("projects")
        .select("github_repo_id")
        .in("github_repo_id", ids);
      return ((data ?? []) as Array<{ github_repo_id: number | null }>)
        .map((r) => r.github_repo_id)
        .filter((id): id is number => typeof id === "number");
    },
  };
}

const handle = createListMyReposHandler(createDefaultDeps());

Deno.serve(handle);
