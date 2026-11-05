// supabase/functions/publish-project/handler_test.ts
// A2: uji end-to-end publish-project dengan GitHub, DB, dan verifikasi demo
// DIMOCK. Tanpa jaringan. Setiap respons diperiksa terhadap ErrorBody /
// PublishProjectResult.

import { assert, assertEquals, assertMatch, assertNotMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PublishProjectResult } from "../../../contracts/src/projects.ts";
import {
  createPublishHandler,
  type PublishDeps,
  type RepoNode,
} from "./handler.ts";
import { UpstreamFailure } from "../_shared/github/upstream.ts";

const CALLER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

const baseRepo: RepoNode = {
  databaseId: 1296269,
  name: "hello-world",
  nameWithOwner: "dev/hello-world",
  description: "Demo app",
  isFork: false,
  isPrivate: false,
  isEmpty: false,
  pushedAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
  stargazerCount: 12,
  homepageUrl: null,
  diskUsage: 120,
  ownerDatabaseId: 4242,
  languages: [
    { name: "Go", bytes: 700 },
    { name: "React", bytes: 200 },
    { name: "Python", bytes: 50 },
    { name: "Rust", bytes: 50 },
  ],
};

function makeDeps(over: Partial<PublishDeps> = {}): PublishDeps {
  return {
    authenticate: async () => ({
      caller: { id: CALLER_ID },
      error: null,
    }),
    getProfile: async () => ({
      githubId: 4242,
      githubLogin: "dev",
      roles: ["developer"],
      countryCode: "ID",
    }),
    checkRateLimit: async () => ({ allowed: true, retryAfter: 0 }),
    findRepo: async () => ({ ...baseRepo }),
    readManifests: async () => ({}),
    inferRole: () => "Back-End Developer",
    detectSubstance: () => 0.8,
    verifyDemo: async () => ({ verified: false }),
    findExistingProject: async () => null,
    insertProject: async () => ({ id: PROJECT_ID, visible: true, countryCode: "ID" }),
    updateProject: async () => ({ id: PROJECT_ID, visible: true, countryCode: "ID" }),
    ...over,
  };
}

function post(body: unknown, headers: Record<string, string> = {
  Authorization: "Bearer test",
}): Request {
  return new Request("http://localhost/publish-project", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function call(deps: PublishDeps, body: unknown, headers?: Record<string, string>) {
  const res = await createPublishHandler(deps)(post(body, headers));
  const text = await res.text();
  return { res, text, json: JSON.parse(text) as Record<string, unknown> };
}

Deno.test("publish: sukses — stack 100, role terpetakan, skor rumus, kontrak valid", async () => {
  const deps = makeDeps({
    verifyDemo: async () => ({ verified: true, finalUrl: "https://demo.example.com" }),
  });
  const { res, text, json } = await call(deps, {
    githubRepoId: 1296269,
    demoUrl: "https://demo.example.com",
  });
  assertEquals(res.status, 200);

  const parsed = PublishProjectResult.safeParse(json);
  assert(parsed.success, "respons harus lolos PublishProjectResult");
  if (parsed.success) {
    assertEquals(parsed.data.stack.reduce((s, x) => s + x.percent, 0), 100);
    assertEquals(parsed.data.stack[0].name, "Go");
    assertEquals(parsed.data.role, "Back-End");
    assertEquals(parsed.data.score, 92); // 40 + 20 + round(40×0.8)
    assertEquals(parsed.data.active, true);
    assertEquals(parsed.data.demoVerified, true);
    assertEquals(parsed.data.visible, true);
    assertEquals(parsed.data.countryCode, "ID");
  }
  assertNotMatch(text, EMAIL_RE, "respons tidak boleh memuat email");
});

Deno.test("publish: role input eksplisit dihormati (Mobile)", async () => {
  const { json } = await call(makeDeps(), { githubRepoId: 1296269, role: "Mobile" });
  assertEquals(json.role, "Mobile");
});

Deno.test("publish: bukan pemilik -> 403 FORBIDDEN", async () => {
  const deps = makeDeps({ findRepo: async () => ({ ...baseRepo, ownerDatabaseId: 999 }) });
  const { res, json } = await call(deps, { githubRepoId: 1296269 });
  assertEquals(res.status, 403);
  assertEquals(json.code, "FORBIDDEN");
});

Deno.test("publish: fork -> 400 VALIDATION", async () => {
  const deps = makeDeps({ findRepo: async () => ({ ...baseRepo, isFork: true }) });
  const { res, json } = await call(deps, { githubRepoId: 1296269 });
  assertEquals(res.status, 400);
  assertEquals(json.code, "VALIDATION");
});

Deno.test("publish: privat atau tidak ada -> 404 NOT_FOUND", async () => {
  const priv = await call(
    makeDeps({ findRepo: async () => ({ ...baseRepo, isPrivate: true }) }),
    { githubRepoId: 1296269 },
  );
  assertEquals(priv.res.status, 404);
  assertEquals(priv.json.code, "NOT_FOUND");

  const absent = await call(makeDeps({ findRepo: async () => null }), {
    githubRepoId: 1296269,
  });
  assertEquals(absent.res.status, 404);
  assertEquals(absent.json.code, "NOT_FOUND");
});

Deno.test("publish: repo kosong -> 400 VALIDATION", async () => {
  const deps = makeDeps({ findRepo: async () => ({ ...baseRepo, diskUsage: 0 }) });
  const { res, json } = await call(deps, { githubRepoId: 1296269 });
  assertEquals(res.status, 400);
  assertEquals(json.code, "VALIDATION");
});

Deno.test("publish: demo tidak terverifikasi (SSRF) tidak disimpan", async () => {
  let stored: Record<string, unknown> | null = null;
  const deps = makeDeps({
    verifyDemo: async () => ({ verified: false }),
    insertProject: async (row) => {
      stored = row;
      return { id: PROJECT_ID, visible: true, countryCode: "ID" };
    },
  });
  const { res, json } = await call(deps, {
    githubRepoId: 1296269,
    demoUrl: "http://169.254.169.254/latest/meta-data",
  });
  assertEquals(res.status, 200);
  assertEquals(json.demoVerified, false);
  assertEquals(json.demoUrl, null);
  const row = stored as Record<string, unknown> | null;
  assert(row !== null, "insert harus dipanggil");
  if (row) {
    assertEquals(row.demo_url, null);
    assertEquals(row.demo_verified, false);
  }
});

Deno.test("publish: upsert idempoten milik sendiri (update, bukan insert)", async () => {
  let inserts = 0;
  let updates = 0;
  const deps = makeDeps({
    findExistingProject: async () => ({ id: PROJECT_ID, ownerId: CALLER_ID }),
    insertProject: async () => {
      inserts++;
      return { id: PROJECT_ID, visible: true, countryCode: "ID" };
    },
    updateProject: async () => {
      updates++;
      return { id: PROJECT_ID, visible: true, countryCode: "ID" };
    },
  });
  const { res, json } = await call(deps, { githubRepoId: 1296269 });
  assertEquals(res.status, 200);
  assertEquals(json.projectId, PROJECT_ID);
  assertEquals(inserts, 0);
  assertEquals(updates, 1);
});

Deno.test("publish: konflik pemilik lain -> 403 FORBIDDEN", async () => {
  const deps = makeDeps({
    findExistingProject: async () => ({ id: PROJECT_ID, ownerId: "other-user" }),
  });
  const { res, json } = await call(deps, { githubRepoId: 1296269 });
  assertEquals(res.status, 403);
  assertEquals(json.code, "FORBIDDEN");
});

Deno.test("publish: rate limit -> 429 dengan retry_after", async () => {
  const deps = makeDeps({ checkRateLimit: async () => ({ allowed: false, retryAfter: 37 }) });
  const { res, json } = await call(deps, { githubRepoId: 1296269 });
  assertEquals(res.status, 429);
  assertEquals(json.code, "RATE_LIMITED");
  assertEquals(json.retry_after, 37);
});

Deno.test("publish: input salah -> 400 VALIDATION", async () => {
  for (const body of [
    { githubRepoId: -1 },
    { githubRepoId: "bukan-angka" },
    { githubRepoId: 1, demoUrl: "bukan-url" },
    { githubRepoId: 1, role: "DevOps" },
  ]) {
    const { res, json } = await call(makeDeps(), body);
    assertEquals(res.status, 400, `body ${JSON.stringify(body)} harus ditolak`);
    assertEquals(json.code, "VALIDATION");
  }
});

Deno.test("publish: kegagalan GitHub -> 502, tanpa data karangan", async () => {
  let wrote = false;
  const deps = makeDeps({
    findRepo: async () => {
      throw new UpstreamFailure("other", "koneksi gagal");
    },
    insertProject: async () => {
      wrote = true;
      return { id: PROJECT_ID, visible: true, countryCode: "ID" };
    },
  });
  const { res, json } = await call(deps, { githubRepoId: 1296269 });
  assertEquals(res.status, 502);
  assertEquals(json.code, "UPSTREAM_ERROR");
  assertEquals(wrote, false, "tidak boleh menulis proyek saat hulu gagal");
});

Deno.test("publish: rate limit hulu GitHub -> 429", async () => {
  const deps = makeDeps({
    findRepo: async () => {
      throw new UpstreamFailure("rate_limited", "kuota habis", 45);
    },
  });
  const { res, json } = await call(deps, { githubRepoId: 1296269 });
  assertEquals(res.status, 429);
  assertEquals(json.code, "RATE_LIMITED");
  assertEquals(json.retry_after, 45);
});

Deno.test("publish: tanpa JWT -> 401; non-developer -> 403", async () => {
  const unauth = await call(
    makeDeps({ authenticate: async () => ({ caller: null, error: "Header Authorization diperlukan" }) }),
    { githubRepoId: 1296269 },
  );
  assertEquals(unauth.res.status, 401);
  assertEquals(unauth.json.code, "UNAUTHORIZED");

  const forbidden = await call(
    makeDeps({
      getProfile: async () => ({
        githubId: 4242,
        githubLogin: "dev",
        roles: ["recruiter"],
        countryCode: "ID",
      }),
    }),
    { githubRepoId: 1296269 },
  );
  assertEquals(forbidden.res.status, 403);
  assertEquals(forbidden.json.code, "FORBIDDEN");
});

Deno.test("publish: email di deskripsi repo disanitasi sebelum disimpan", async () => {
  let stored: Record<string, unknown> | null = null;
  const deps = makeDeps({
    findRepo: async () => ({ ...baseRepo, description: "hubungi dev@example.com" }),
    insertProject: async (row) => {
      stored = row;
      return { id: PROJECT_ID, visible: true, countryCode: "ID" };
    },
  });
  const { text } = await call(deps, { githubRepoId: 1296269 });
  assertNotMatch(text, EMAIL_RE);
  const row = stored as Record<string, unknown> | null;
  if (row) assertMatch(String(row.description), /\[REDACTED_EMAIL\]/);
});

Deno.test("publish: metode salah -> 405", async () => {
  const deps = makeDeps();
  const req = new Request("http://localhost/publish-project", { method: "GET" });
  const res = await createPublishHandler(deps)(req);
  assertEquals(res.status, 405);
});
