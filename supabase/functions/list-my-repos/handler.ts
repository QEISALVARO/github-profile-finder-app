// supabase/functions/list-my-repos/handler.ts
// Logika list-my-repos dengan dependensi disuntikkan agar dapat diuji offline.
// Login SELALU dari profil pemanggil (profiles.github_login), tidak pernah dari
// input klien. Perilaku respons identik dengan BE-3.

import { corsHeaders, errorResponse, json } from "../_shared/http.ts";
import { UpstreamFailure } from "../_shared/github/upstream.ts";
import { MyReposPage } from "../../../contracts/src/projects.ts";

export interface CallerIdentity {
  id: string;
  githubLogin?: string;
}

export interface ListProfile {
  githubLogin: string | null;
  roles: string[];
}

export interface RepoSummary {
  databaseId: number;
  nameWithOwner: string;
  name: string;
  description: string | null;
  primaryLanguage: string | null;
  stargazers: number;
  pushedAt: string | null;
  isFork: boolean;
  isArchived: boolean;
  isEmpty: boolean;
  homepageUrl: string | null;
}

export interface RepoPage {
  nodes: RepoSummary[];
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface ListReposDeps {
  authenticate(req: Request): Promise<{ caller: CallerIdentity | null; error: string | null }>;
  getProfile(userId: string): Promise<ListProfile | null>;
  checkRateLimit(userId: string): Promise<{ allowed: boolean; retryAfter: number }>;
  listRepos(login: string, after: string | null): Promise<RepoPage>;
  publishedRepoIds(ids: number[]): Promise<number[]>;
}

export function encodeRepoCursor(after: string): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify({ after }))));
}

export function decodeRepoCursor(raw: string): string | null {
  const parsed: unknown = JSON.parse(decodeURIComponent(escape(atob(raw))));
  if (parsed === null || typeof parsed !== "object") return null;
  const after = (parsed as { after?: unknown }).after;
  return typeof after === "string" && after.length > 0 ? after : null;
}

export function createListMyReposHandler(deps: ListReposDeps) {
  return async function handle(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "GET" && req.method !== "POST") {
      return errorResponse("VALIDATION", "Hanya metode GET/POST yang diizinkan", 405);
    }

    const { caller, error: authError } = await deps.authenticate(req);
    if (authError || !caller) {
      return errorResponse("UNAUTHORIZED", authError ?? "Token autentikasi tidak valid", 401);
    }

    const profile = await deps.getProfile(caller.id);
    const login = (profile?.githubLogin ?? caller.githubLogin ?? "").toLowerCase();
    if (!login) {
      return errorResponse("VALIDATION", "Profil GitHub pemanggil belum terhubung", 400);
    }
    if (!(profile?.roles ?? []).includes("developer")) {
      return errorResponse(
        "FORBIDDEN",
        "Hanya peran developer yang dapat mempublikasikan proyek",
        403,
      );
    }

    let rate: { allowed: boolean; retryAfter: number } = { allowed: true, retryAfter: 0 };
    try {
      rate = await deps.checkRateLimit(caller.id);
    } catch {
      // lunak
    }
    if (!rate.allowed) {
      const retryAfter = rate.retryAfter > 0 ? rate.retryAfter : 60;
      return errorResponse(
        "RATE_LIMITED",
        `Batas daftar repo tercapai. Coba lagi dalam ${retryAfter} detik.`,
        429,
        retryAfter,
      );
    }

    // Kursor dari query string (GET) atau body (POST); login klien diabaikan.
    let after: string | null = null;
    try {
      if (req.method === "GET") {
        const cursor = new URL(req.url).searchParams.get("cursor");
        if (cursor) after = decodeRepoCursor(cursor);
      } else {
        const body: unknown = await req.json().catch(() => ({}));
        const cursor = body !== null && typeof body === "object"
          ? (body as { cursor?: unknown }).cursor
          : undefined;
        if (typeof cursor === "string" && cursor) after = decodeRepoCursor(cursor);
      }
    } catch {
      return errorResponse("VALIDATION", "Format kursor tidak valid", 400);
    }

    let page: RepoPage;
    try {
      page = await deps.listRepos(login, after);
    } catch (err: unknown) {
      if (err instanceof UpstreamFailure) {
        if (err.kind === "rate_limited") {
          return errorResponse(
            "RATE_LIMITED",
            "Kuota GitHub API habis. Coba lagi nanti.",
            429,
            err.retryAfter ?? 60,
          );
        }
        if (err.kind === "not_found") {
          return errorResponse("NOT_FOUND", "Akun GitHub tidak ditemukan", 404);
        }
      }
      return errorResponse("UPSTREAM_ERROR", "Gagal menghubungi GitHub API", 502);
    }

    const ids = page.nodes.map((n) => n.databaseId).filter((id) => Number.isFinite(id));
    let published: number[] = [];
    if (ids.length > 0) {
      try {
        published = await deps.publishedRepoIds(ids);
      } catch {
        published = [];
      }
    }
    const publishedSet = new Set(published);

    const items = page.nodes.map((n) => {
      const ineligibleReason = n.isFork ? "FORK" : n.isEmpty ? "EMPTY" : null;
      return {
        githubRepoId: n.databaseId,
        fullName: n.nameWithOwner,
        name: n.name,
        description: n.description,
        language: n.primaryLanguage,
        stars: n.stargazers,
        pushedAt: n.pushedAt,
        isFork: n.isFork,
        isArchived: n.isArchived,
        homepageUrl: n.homepageUrl,
        alreadyPublished: publishedSet.has(n.databaseId),
        eligible: !n.isFork && !n.isEmpty,
        ineligibleReason,
      };
    });

    const nextCursor = page.hasNextPage && page.endCursor
      ? encodeRepoCursor(page.endCursor)
      : null;

    const parsed = MyReposPage.safeParse({ items, nextCursor });
    if (!parsed.success) {
      return errorResponse("UPSTREAM_ERROR", "Gagal menyusun respons daftar repo", 502);
    }

    return json(parsed.data);
  };
}
