// @ts-nocheck
// supabase/functions/publish-project/index.ts
// BE-3: publikasi repo milik pemanggil menjadi proyek feed (verifikasi server).
// Logika ada di handler.ts (dapat diuji offline); berkas ini hanya wiring
// dependensi nyata: Supabase, GitHub GraphQL, dan verifikasi demo SSRF-safe.

import { getAdminClient, authenticateCaller } from "../_shared/supabase.ts";
import { createGitHubAuth } from "../_shared/github/auth.ts";
import { executeGraphQL, GitHubGraphQLError } from "../_shared/github/graphql.ts";
import { extractFactsFromGraphQL } from "../_shared/github/facts.ts";
import { detectFrameworks } from "../_shared/scoring/frameworks.ts";
import { inferDeveloperRole } from "../_shared/scoring/role.ts";
import { safeVerifyDemoUrl } from "../_shared/ssrf/safe-fetch.ts";
import { createPublishHandler, type PublishDeps, type RepoNode } from "./handler.ts";
import { UpstreamFailure } from "../_shared/github/upstream.ts";

const REPO_MANIFEST_QUERY = `
query RepoManifest($owner: String!, $name: String!, $expression: String!) {
  rateLimit { cost remaining resetAt }
  repository(owner: $owner, name: $name) {
    object(expression: $expression) {
      ... on Blob { text }
    }
  }
}`;

const FIND_REPO_QUERY = `
query FindRepo($login: String!) {
  rateLimit { cost remaining resetAt }
  user(login: $login) {
    repositories(first: 30, ownerAffiliations: OWNER, privacy: PUBLIC, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        databaseId name nameWithOwner description isFork isArchived isPrivate isEmpty
        createdAt pushedAt stargazerCount homepageUrl url diskUsage
        licenseInfo { spdxId }
        owner { ... on User { databaseId login } }
        languages(first: 6, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } }
      }
    }
  }
}`;

const MANIFEST_FILES = [
  "package.json",
  "pubspec.yaml",
  "go.mod",
  "Cargo.toml",
  "requirements.txt",
  "pyproject.toml",
];

function mapGitHubError(err: unknown): never {
  if (err instanceof GitHubGraphQLError) {
    if (err.isRateLimited) {
      throw new UpstreamFailure("rate_limited", err.message, err.retryAfter);
    }
    if (err.isNotFound) {
      throw new UpstreamFailure("not_found", err.message);
    }
  }
  throw new UpstreamFailure("other", err instanceof Error ? err.message : String(err));
}

export function createDefaultDeps(): PublishDeps {
  const adminClient = getAdminClient();
  const auth = createGitHubAuth();

  return {
    async authenticate(req) {
      const { user, error } = await authenticateCaller(req.headers.get("Authorization"));
      return { caller: user ? { id: user.id } : null, error };
    },

    async getProfile(userId) {
      const { data } = await adminClient
        .from("profiles")
        .select("github_id, github_login, roles, country_code, city, developer_settings(listed)")
        .eq("id", userId)
        .maybeSingle();
      if (!data) return null;
      return {
        githubId: data.github_id ?? null,
        githubLogin: data.github_login ?? null,
        roles: (data.roles ?? []) as string[],
        countryCode: data.country_code ?? null,
      };
    },

    async checkRateLimit(userId) {
      const { data } = await adminClient.rpc("check_rate_limit", {
        p_user: userId,
        p_key: "publish_project",
        p_max: 20,
        p_window: "1 hour",
      });
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) return { allowed: true, retryAfter: 0 };
      return {
        allowed: row.allowed === true,
        retryAfter: row.retry_after ?? 0,
      };
    },

    async findRepo(login, repoId): Promise<RepoNode | null> {
      let found: { data?: { user?: { repositories?: { nodes?: unknown[] } } } };
      try {
        found = await executeGraphQL(FIND_REPO_QUERY, { login }, auth);
      } catch (err) {
        mapGitHubError(err);
      }
      const nodes = (found?.data?.user?.repositories?.nodes ?? []) as Array<
        Record<string, unknown>
      >;
      const node = nodes.find((n) => n.databaseId === repoId);
      if (!node) return null;

      const languages = ((node.languages as {
        edges?: Array<{ size?: number; node?: { name?: string } }>;
      })?.edges ?? [])
        .map((e) => ({ name: e.node?.name ?? "", bytes: e.size ?? 0 }))
        .filter((l) => l.name !== "");

      const owner = node.owner as { databaseId?: number | null } | undefined;

      return {
        databaseId: Number(node.databaseId),
        name: String(node.name ?? ""),
        nameWithOwner: String(node.nameWithOwner ?? ""),
        description: (node.description as string | null) ?? null,
        isFork: node.isFork === true,
        isPrivate: node.isPrivate === true,
        isEmpty: node.isEmpty === true,
        pushedAt: (node.pushedAt as string | null) ?? null,
        stargazerCount: Number(node.stargazerCount ?? 0),
        homepageUrl: (node.homepageUrl as string | null) ?? null,
        diskUsage: Number(node.diskUsage ?? 0),
        ownerDatabaseId: owner?.databaseId ?? null,
        languages,
      };
    },

    async readManifests(ownerLogin, repoName) {
      const manifests: Record<string, string> = {};
      for (const file of MANIFEST_FILES) {
        try {
          const res = await executeGraphQL(
            REPO_MANIFEST_QUERY,
            { owner: ownerLogin, name: repoName, expression: `HEAD:${file}` },
            auth,
          );
          const text = res?.data?.repository?.object?.text;
          if (typeof text === "string" && text.length > 0 && text.length < 200000) {
            manifests[file] = text;
          }
        } catch {
          // manifest hilang = bukan sinyal
        }
      }
      return manifests;
    },

    inferRole(primaryLanguage, manifests, languages) {
      const frameworks = detectFrameworks([{ manifests }]);
      const languageBytesMap: Record<string, number> = {};
      for (const l of languages) languageBytesMap[l.name] = l.bytes;
      return inferDeveloperRole(primaryLanguage, frameworks, languageBytesMap);
    },

    detectSubstance(repo, manifests) {
      const node = {
        databaseId: repo.databaseId,
        name: repo.name,
        description: repo.description,
        isFork: repo.isFork,
        isArchived: false,
        pushedAt: repo.pushedAt,
        stargazerCount: repo.stargazerCount,
        homepageUrl: repo.homepageUrl,
        url: `https://github.com/${repo.nameWithOwner}`,
        diskUsage: repo.diskUsage,
        languages: {
          edges: repo.languages.map((l) => ({ size: l.bytes, node: { name: l.name } })),
        },
      };
      const facts = extractFactsFromGraphQL(
        { user: { login: repo.nameWithOwner.split("/")[0], repositories: { nodes: [node] } } },
        null,
        null,
        { [repo.name]: manifests },
      );
      return facts.repos[0]?.substance ?? 0;
    },

    async verifyDemo(url) {
      const check = await safeVerifyDemoUrl(url);
      return { verified: check.verified, finalUrl: check.finalUrl ?? null };
    },

    async findExistingProject(repoId) {
      const { data } = await adminClient
        .from("projects")
        .select("id, owner_id")
        .eq("github_repo_id", repoId)
        .maybeSingle();
      if (!data) return null;
      return { id: data.id, ownerId: data.owner_id };
    },

    async insertProject(row) {
      const { data, error } = await adminClient.from("projects").insert(row).select("id").single();
      if (error || !data) throw new Error("insert projects gagal");
      const { data: saved } = await adminClient
        .from("projects")
        .select("visible, country_code")
        .eq("id", data.id)
        .maybeSingle();
      return {
        id: data.id,
        visible: saved?.visible ?? false,
        countryCode: saved?.country_code ?? null,
      };
    },

    async updateProject(id, row) {
      const { error } = await adminClient.from("projects").update(row).eq("id", id);
      if (error) throw new Error("update projects gagal");
      const { data: saved } = await adminClient
        .from("projects")
        .select("visible, country_code")
        .eq("id", id)
        .maybeSingle();
      return {
        id,
        visible: saved?.visible ?? false,
        countryCode: saved?.country_code ?? null,
      };
    },
  };
}

const handle = createPublishHandler(createDefaultDeps());

Deno.serve(handle);
