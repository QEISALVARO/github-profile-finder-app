// supabase/functions/publish-project/handler.ts
// Logika publish-project dengan dependensi disuntikkan (GitHub, DB, verifikasi
// demo) agar dapat diuji offline tanpa jaringan. Entrypoint HTTP ada di
// index.ts; perilaku respons identik dengan BE-3.
// Strict TypeScript (tanpa @ts-nocheck, tanpa `any`).

import { corsHeaders, errorResponse, json } from "../_shared/http.ts";
import { sanitizeNoEmail } from "../_shared/github/facts.ts";
import { PublishProjectInput, PublishProjectResult } from "../../../contracts/src/projects.ts";
import {
  isActiveRepo,
  mapInferredRoleToFeedRole,
  repoScore,
  top3Stack,
  type FeedRole,
  type LanguageBytes,
} from "../_shared/scoring/publish.ts";
import { UpstreamFailure } from "../_shared/github/upstream.ts";

export interface CallerIdentity {
  id: string;
}

export interface PublishProfile {
  githubId: number | null;
  githubLogin: string | null;
  roles: string[];
  countryCode: string | null;
}

export interface RepoNode {
  databaseId: number;
  name: string;
  nameWithOwner: string;
  description: string | null;
  isFork: boolean;
  isPrivate: boolean;
  isEmpty: boolean;
  pushedAt: string | null;
  stargazerCount: number;
  homepageUrl: string | null;
  diskUsage: number;
  ownerDatabaseId: number | null;
  languages: LanguageBytes[];
}

export interface ExistingProject {
  id: string;
  ownerId: string;
}

export interface SavedProject {
  id: string;
  visible: boolean;
  countryCode: string | null;
}

export interface DemoVerification {
  verified: boolean;
  finalUrl?: string | null;
}

export interface PublishDeps {
  authenticate(req: Request): Promise<{ caller: CallerIdentity | null; error: string | null }>;
  getProfile(userId: string): Promise<PublishProfile | null>;
  checkRateLimit(userId: string): Promise<{ allowed: boolean; retryAfter: number }>;
  findRepo(login: string, repoId: number): Promise<RepoNode | null>;
  readManifests(ownerLogin: string, repoName: string): Promise<Record<string, string>>;
  inferRole(
    primaryLanguage: string,
    manifests: Record<string, string>,
    languages: LanguageBytes[],
  ): string;
  detectSubstance(repo: RepoNode, manifests: Record<string, string>): number;
  verifyDemo(url: string): Promise<DemoVerification>;
  findExistingProject(repoId: number): Promise<ExistingProject | null>;
  insertProject(row: Record<string, unknown>): Promise<SavedProject>;
  updateProject(id: string, row: Record<string, unknown>): Promise<SavedProject>;
}

const GITHUB_FAILED_MESSAGE = "Gagal menghubungi GitHub API";
const NOT_FOUND_MESSAGE = "Repositori tidak ditemukan atau bukan milik Anda";

export function createPublishHandler(deps: PublishDeps) {
  return async function handle(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return errorResponse("VALIDATION", "Hanya metode POST yang diizinkan", 405);
    }

    const { caller, error: authError } = await deps.authenticate(req);
    if (authError || !caller) {
      return errorResponse("UNAUTHORIZED", authError ?? "Token autentikasi tidak valid", 401);
    }

    const profile = await deps.getProfile(caller.id);
    const roles = profile?.roles ?? [];
    if (!roles.includes("developer")) {
      return errorResponse(
        "FORBIDDEN",
        "Hanya peran developer yang dapat mempublikasikan proyek",
        403,
      );
    }
    const githubId = profile?.githubId ?? null;
    if (!githubId) {
      return errorResponse("VALIDATION", "Profil GitHub pemanggil belum terhubung", 400);
    }

    // Rate limit 20/jam (kegagalan pemeriksaan bersifat lunak, seperti BE-3).
    let rate: { allowed: boolean; retryAfter: number } = { allowed: true, retryAfter: 0 };
    try {
      rate = await deps.checkRateLimit(caller.id);
    } catch {
      // lunak: lanjutkan bila pemeriksaan tidak tersedia
    }
    if (!rate.allowed) {
      const retryAfter = rate.retryAfter > 0 ? rate.retryAfter : 60;
      return errorResponse(
        "RATE_LIMITED",
        `Batas publikasi tercapai. Coba lagi dalam ${retryAfter} detik.`,
        429,
        retryAfter,
      );
    }

    let input: ReturnType<typeof PublishProjectInput.parse>;
    try {
      input = PublishProjectInput.parse(await req.json());
    } catch {
      return errorResponse(
        "VALIDATION",
        "Input tidak valid (githubRepoId/role/demoUrl/description)",
        400,
      );
    }

    const login = (profile?.githubLogin ?? "").toLowerCase();
    let repo: RepoNode | null = null;
    try {
      repo = await deps.findRepo(login, input.githubRepoId);
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
          return errorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }
      }
      return errorResponse("UPSTREAM_ERROR", GITHUB_FAILED_MESSAGE, 502);
    }

    if (!repo) {
      return errorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    // Verifikasi D1/D3: pemilik, publik, bukan fork, tidak kosong.
    if (repo.ownerDatabaseId !== githubId) {
      return errorResponse("FORBIDDEN", "Repositori ini bukan milik Anda", 403);
    }
    if (repo.isPrivate) {
      return errorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }
    if (repo.isFork) {
      return errorResponse("VALIDATION", "Fork tidak dapat dipublikasikan", 400);
    }
    if ((repo.diskUsage ?? 0) <= 0) {
      return errorResponse("VALIDATION", "Repositori kosong tidak dapat dipublikasikan", 400);
    }

    const stack = top3Stack(repo.languages);
    const primaryLanguage = stack[0]?.name ?? "TypeScript";

    let manifests: Record<string, string> = {};
    try {
      manifests = await deps.readManifests(login, repo.name);
    } catch {
      manifests = {}; // manifest hilang = bukan sinyal
    }

    let inferred = "Back-End Developer";
    try {
      inferred = deps.inferRole(primaryLanguage, manifests, repo.languages);
    } catch {
      inferred = "Back-End Developer";
    }
    const role: FeedRole = input.role ?? mapInferredRoleToFeedRole(inferred);

    let substance = 0;
    try {
      substance = deps.detectSubstance(repo, manifests);
    } catch {
      substance = 0;
    }

    // Demo: input.demoUrl bila ada, selain itu homepageUrl. URL TIDAK disimpan
    // bila gagal/tidak aman (SSRF-safe, hanya 2xx yang verified).
    const candidateDemo = input.demoUrl ?? repo.homepageUrl ?? null;
    let demoUrl: string | null = null;
    let demoVerified = false;
    if (candidateDemo) {
      try {
        const check = await deps.verifyDemo(candidateDemo);
        if (check.verified) {
          demoUrl = check.finalUrl ?? candidateDemo;
          demoVerified = true;
        }
      } catch {
        demoVerified = false;
      }
    }

    const score = repoScore(repo.isFork, demoVerified, substance);
    const active = isActiveRepo(repo.pushedAt, Date.now());
    const description =
      sanitizeNoEmail((input.description ?? repo.description ?? "").slice(0, 500)) ?? "";

    let existing: ExistingProject | null = null;
    try {
      existing = await deps.findExistingProject(input.githubRepoId);
    } catch {
      existing = null;
    }

    if (existing && existing.ownerId !== caller.id) {
      return errorResponse("FORBIDDEN", "Repositori sudah dipublikasikan pemilik lain", 403);
    }

    const row: Record<string, unknown> = {
      owner_id: caller.id,
      github_repo_id: input.githubRepoId,
      name: repo.name,
      description,
      role,
      stack,
      score,
      published: true,
      is_hidden: false,
      demo_url: demoUrl,
      demo_verified: demoVerified,
      stars: repo.stargazerCount ?? 0,
      pushed_at: repo.pushedAt ?? null,
    };

    let saved: SavedProject;
    try {
      saved = existing
        ? await deps.updateProject(existing.id, row)
        : await deps.insertProject(row);
    } catch {
      return errorResponse("UPSTREAM_ERROR", "Gagal menyimpan proyek", 502);
    }

    const result = PublishProjectResult.safeParse({
      projectId: saved.id,
      name: repo.name,
      role,
      stack,
      active,
      demoUrl,
      demoVerified,
      score,
      published: true,
      visible: saved.visible,
      countryCode: saved.countryCode ?? profile?.countryCode ?? null,
    });

    if (!result.success) {
      return errorResponse("UPSTREAM_ERROR", "Gagal menyusun respons proyek", 502);
    }

    return json(result.data);
  };
}
