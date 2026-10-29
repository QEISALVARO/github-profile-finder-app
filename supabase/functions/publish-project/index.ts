// @ts-nocheck
// supabase/functions/publish-project/index.ts
// BE-3: publikasi repo milik pemanggil menjadi proyek feed (verifikasi server).
// Hanya pemilik (owner.databaseId == profiles.github_id); bukan fork; publik;
// tidak kosong; demo SSRF-safe; upsert idempoten per github_repo_id.
// Rate limit: 20/jam (app_rate_limits.publish_project). Peran developer wajib.

import { corsHeaders, json, errorResponse } from "../_shared/http.ts";
import { authenticateCaller, getAdminClient } from "../_shared/supabase.ts";
import { createGitHubAuth } from "../_shared/github/auth.ts";
import { executeGraphQL, GitHubGraphQLError } from "../_shared/github/graphql.ts";
import { extractFactsFromGraphQL, sanitizeNoEmail } from "../_shared/github/facts.ts";
import { detectFrameworks } from "../_shared/scoring/frameworks.ts";
import { inferDeveloperRole } from "../_shared/scoring/role.ts";
import { safeVerifyDemoUrl } from "../_shared/ssrf/safe-fetch.ts";
import { z } from "npm:zod@^3.24.0";
import { PublishProjectInput } from "../../../contracts/src/projects.ts";

const SINGLE_REPO_QUERY = `
query SingleRepo($owner: String!, $name: String!) {
  rateLimit { cost remaining resetAt }
  repository(owner: $owner, name: $name) {
    databaseId
    name
    nameWithOwner
    description
    isFork
    isArchived
    isPrivate
    isEmpty
    createdAt
    pushedAt
    stargazerCount
    homepageUrl
    url
    diskUsage
    licenseInfo { spdxId }
    owner { ... on User { databaseId login } }
    languages(first: 6, orderBy: { field: SIZE, direction: DESC }) {
      edges { size node { name } }
    }
    defaultBranchRef {
      target {
        ... on Commit {
          history(first: 1) { nodes { committedDate } }
        }
      }
    }
  }
}`;

const REPO_MANIFEST_QUERY = `
query RepoManifest($owner: String!, $name: String!, $expression: String!) {
  rateLimit { cost remaining resetAt }
  repository(owner: $owner, name: $name) {
    object(expression: $expression) {
      ... on Blob { text }
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

function mapRole(inferred: string): "Front-End" | "Back-End" | "Mobile" | "Data" {
  if (inferred === "Front-End Developer") return "Front-End";
  if (inferred === "Mobile Developer") return "Mobile";
  if (inferred === "AI / Data Engineer") return "Data";
  return "Back-End";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("VALIDATION", "Hanya metode POST yang diizinkan", 405);
  }

  const { user: caller, error: authError } = await authenticateCaller(
    req.headers.get("Authorization"),
  );
  if (authError || !caller) {
    return errorResponse("UNAUTHORIZED", authError ?? "Token autentikasi tidak valid", 401);
  }

  const adminClient = getAdminClient();

  // Profil + peran + negara (untuk visible).
  const { data: profile } = await adminClient
    .from("profiles")
    .select("github_id, github_login, roles, country_code, city, developer_settings(listed)")
    .eq("id", caller.id)
    .maybeSingle();

  const roles = ((profile?.roles ?? []) as string[]);
  if (!roles.includes("developer")) {
    return errorResponse("FORBIDDEN", "Hanya peran developer yang dapat mempublikasikan proyek", 403);
  }
  const githubId = profile?.github_id;
  if (!githubId) {
    return errorResponse("VALIDATION", "Profil GitHub pemanggil belum terhubung", 400);
  }

  // Rate limit 20/jam.
  try {
    const { data: rl } = await adminClient.rpc("check_rate_limit", {
      p_user: caller.id,
      p_key: "publish_project",
      p_max: 20,
      p_window: "1 hour",
    });
    if (rl?.[0] && !rl[0].allowed) {
      return errorResponse(
        "RATE_LIMITED",
        `Batas publikasi tercapai. Coba lagi dalam ${rl[0].retry_after ?? 60} detik.`,
        429,
        rl[0].retry_after ?? 60,
      );
    }
  } catch { /* lunak */ }

  // Validasi input (zod kontrak).
  let input: z.infer<typeof PublishProjectInput>;
  try {
    input = PublishProjectInput.parse(await req.json());
  } catch {
    return errorResponse("VALIDATION", "Input tidak valid (githubRepoId/role/demoUrl/description)", 400);
  }

  const auth = createGitHubAuth();

  // Ambil fakta SATU repo: cari via search dulu? Tidak — butuh owner/name.
  // Karena kontrak hanya membawa githubRepoId, resolve via node(id)? GraphQL
  // `node(id: ID!)` butuh global ID, bukan databaseId. Jalur yang didukung:
  // list repo milik user login lalu cocokkan databaseId (1 query, ≤30 repo).
  let repoNode: any = null;
  try {
    const q = `
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
    const login = (profile?.github_login ?? "").toLowerCase();
    const found: any = await executeGraphQL(q, { login }, auth);
    const nodes = found?.data?.user?.repositories?.nodes ?? [];
    repoNode = nodes.find((n: any) => n.databaseId === input.githubRepoId) ?? null;
  } catch (err: unknown) {
    if (err instanceof GitHubGraphQLError && err.isRateLimited) {
      return errorResponse("RATE_LIMITED", "Kuota GitHub API habis. Coba lagi nanti.", 429, err.retryAfter ?? 60);
    }
    return errorResponse("UPSTREAM_ERROR", "Gagal menghubungi GitHub API", 502);
  }

  if (!repoNode) {
    return errorResponse("NOT_FOUND", "Repositori tidak ditemukan atau bukan milik Anda", 404);
  }

  // Verifikasi D3: pemilik, publik, bukan fork, tidak kosong.
  if (repoNode.owner?.databaseId !== githubId) {
    return errorResponse("FORBIDDEN", "Repositori ini bukan milik Anda", 403);
  }
  if (repoNode.isPrivate) {
    return errorResponse("NOT_FOUND", "Repositori tidak ditemukan atau bukan milik Anda", 404);
  }
  if (repoNode.isFork) {
    return errorResponse("VALIDATION", "Fork tidak dapat dipublikasikan", 400);
  }
  if ((repoNode.diskUsage ?? 0) <= 0) {
    return errorResponse("VALIDATION", "Repositori kosong tidak dapat dipublikasikan", 400);
  }

  // Bahasa top-3 byte -> persen bulat jumlah 100 (D2).
  const langEdges = repoNode.languages?.edges ?? [];
  const langBytes = langEdges.map((e: any) => ({ name: e.node.name, bytes: e.size ?? 0 }));
  const langTotal = langBytes.reduce((s: number, l: any) => s + l.bytes, 0);
  const top3 = langBytes.slice(0, 3);
  let stack = top3.map((l: any) => ({
    name: l.name,
    percent: langTotal > 0 ? Math.round((l.bytes / langTotal) * 100) : 0,
  }));
  const stackSum = stack.reduce((s: number, x: any) => s + x.percent, 0);
  if (stack.length > 0 && stackSum !== 100) {
    stack[0].percent += 100 - stackSum;
  }

  // Framework via manifest (reuse detektor BE-2) — hanya untuk inferensi role.
  const [ownerLogin, repoName] = (repoNode.nameWithOwner as string).split("/");
  const manifests: Record<string, string> = {};
  for (const f of MANIFEST_FILES) {
    try {
      const mr: any = await executeGraphQL(
        REPO_MANIFEST_QUERY,
        { owner: ownerLogin, name: repoName, expression: `HEAD:${f}` },
        auth,
      );
      const text = mr?.data?.repository?.object?.text;
      if (typeof text === "string" && text.length > 0 && text.length < 200000) {
        manifests[f] = text;
      }
    } catch { /* manifest hilang = bukan sinyal */ }
  }
  const frameworks = detectFrameworks([{ manifests } as any]);
  const primaryLanguage = stack[0]?.name ?? "TypeScript";
  const languageBytesMap: Record<string, number> = {};
  for (const l of langBytes) languageBytesMap[l.name] = l.bytes;
  const inferred = inferDeveloperRole(primaryLanguage, frameworks, languageBytesMap);
  const role = input.role ?? mapRole(inferred);

  // Fakta tunggal untuk substance (reuse kalkulator BE-2).
  let substance = 0;
  try {
    const facts = extractFactsFromGraphQL(
      { user: { login: ownerLogin, repositories: { nodes: [repoNode] } } },
      null,
      null,
      { [repoNode.name]: manifests },
    );
    substance = facts.repos[0]?.substance ?? 0;
  } catch { substance = 0; }

  // Demo: input.demoUrl bila ada, selain itu homepageUrl — verifikasi SSRF-safe.
  // Hanya demo_verified jika 2xx; URL tidak disimpan bila gagal/tidak aman.
  const candidateDemo = (input.demoUrl ?? repoNode.homepageUrl ?? null) as string | null;
  let demoUrl: string | null = null;
  let demoVerified = false;
  if (candidateDemo) {
    const check = await safeVerifyDemoUrl(candidateDemo);
    if (check.verified) {
      demoUrl = check.finalUrl ?? candidateDemo;
      demoVerified = true;
    }
  }

  // Skor repo (rumus BE-2 §4.6): fork?0:40 + demo?20:0 + round(40*substance).
  const repoScore = Math.min(100, 40 + (demoVerified ? 20 : 0) + Math.round(40 * substance));

  const active = (() => {
    if (!repoNode.pushedAt) return false;
    return Date.now() - new Date(repoNode.pushedAt).getTime() < 30 * 24 * 3600 * 1000;
  })();

  const description = sanitizeNoEmail(
    (input.description ?? repoNode.description ?? "").slice(0, 500),
  ) ?? "";

  // Upsert idempoten per github_repo_id; konflik pemilik lain -> 403.
  const { data: existing } = await adminClient
    .from("projects")
    .select("id, owner_id")
    .eq("github_repo_id", input.githubRepoId)
    .maybeSingle();

  if (existing && existing.owner_id !== caller.id) {
    return errorResponse("FORBIDDEN", "Repositori sudah dipublikasikan pemilik lain", 403);
  }

  const row = {
    owner_id: caller.id,
    github_repo_id: input.githubRepoId,
    name: repoNode.name,
    description,
    role,
    stack,
    score: repoScore,
    published: true,
    is_hidden: false,
    demo_url: demoUrl,
    demo_verified: demoVerified,
    stars: repoNode.stargazerCount ?? 0,
    pushed_at: repoNode.pushedAt ?? null,
  };

  let projectId: string;
  if (existing) {
    const { error } = await adminClient.from("projects").update(row).eq("id", existing.id);
    if (error) return errorResponse("UPSTREAM_ERROR", "Gagal menyimpan proyek", 502);
    projectId = existing.id;
  } else {
    const { data, error } = await adminClient.from("projects").insert(row).select("id").single();
    if (error || !data) return errorResponse("UPSTREAM_ERROR", "Gagal menyimpan proyek", 502);
    projectId = data.id;
  }

  // Baca kembali visible + country (dihitung trigger D4).
  const { data: saved } = await adminClient
    .from("projects")
    .select("visible, country_code")
    .eq("id", projectId)
    .maybeSingle();

  return json({
    projectId,
    name: repoNode.name,
    role,
    stack,
    active,
    demoUrl,
    demoVerified,
    score: repoScore,
    published: true,
    visible: saved?.visible ?? false,
    countryCode: saved?.country_code ?? profile?.country_code ?? null,
  });
});
