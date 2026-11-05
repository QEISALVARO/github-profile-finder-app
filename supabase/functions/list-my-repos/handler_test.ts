// supabase/functions/list-my-repos/handler_test.ts
// A2: uji list-my-repos dengan DB dan GitHub DIMOCK. Tanpa jaringan.

import { assert, assertEquals, assertNotMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { MyReposPage } from "../../../contracts/src/projects.ts";
import {
  createListMyReposHandler,
  decodeRepoCursor,
  type ListReposDeps,
  type RepoSummary,
} from "./handler.ts";
import { UpstreamFailure } from "../_shared/github/upstream.ts";

const CALLER_ID = "33333333-3333-4333-8333-333333333333";
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function repo(over: Partial<RepoSummary> = {}): RepoSummary {
  return {
    databaseId: 5001,
    nameWithOwner: "dev/alpha",
    name: "alpha",
    description: "Repo alpha",
    primaryLanguage: "Go",
    stargazers: 42,
    pushedAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
    isFork: false,
    isArchived: false,
    isEmpty: false,
    homepageUrl: null,
    ...over,
  };
}

function makeDeps(over: Partial<ListReposDeps> = {}): ListReposDeps {
  return {
    authenticate: async () => ({
      caller: { id: CALLER_ID, githubLogin: "dev" },
      error: null,
    }),
    getProfile: async () => ({ githubLogin: "dev", roles: ["developer"] }),
    checkRateLimit: async () => ({ allowed: true, retryAfter: 0 }),
    listRepos: async () => ({
      nodes: [repo()],
      hasNextPage: false,
      endCursor: null,
    }),
    publishedRepoIds: async () => [],
    ...over,
  };
}

function req(
  method: "GET" | "POST" = "GET",
  init: { body?: unknown; headers?: Record<string, string>; url?: string } = {},
): Request {
  const url = init.url ?? "http://localhost/list-my-repos";
  return new Request(url, {
    method,
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    body: method === "POST" ? JSON.stringify(init.body ?? {}) : undefined,
  });
}

async function call(deps: ListReposDeps, request: Request = req()) {
  const res = await createListMyReposHandler(deps)(request);
  const text = await res.text();
  return { res, text, json: JSON.parse(text) as Record<string, unknown> };
}

Deno.test("list-my-repos: login dari profil, bukan input klien", async () => {
  let seenLogin = "";
  const deps = makeDeps({
    listRepos: async (login) => {
      seenLogin = login;
      return { nodes: [repo()], hasNextPage: false, endCursor: null };
    },
  });
  const { res, json } = await call(
    deps,
    req("POST", { body: { login: "attacker", cursor: null } }),
  );
  assertEquals(res.status, 200);
  assertEquals(seenLogin, "dev");
  const parsed = MyReposPage.safeParse(json);
  assert(parsed.success, "respons harus lolos MyReposPage");
});

Deno.test("list-my-repos: alreadyPublished diisi dari DB", async () => {
  const deps = makeDeps({ publishedRepoIds: async () => [5001] });
  const { json } = await call(deps);
  const items = json.items as Array<Record<string, unknown>>;
  assertEquals(items[0].alreadyPublished, true);
});

Deno.test("list-my-repos: eligible/ineligibleReason benar", async () => {
  const deps = makeDeps({
    listRepos: async () => ({
      nodes: [
        repo(),
        repo({ databaseId: 5002, isFork: true }),
        repo({ databaseId: 5003, isEmpty: true }),
        repo({ databaseId: 5004, isFork: true, isEmpty: true }),
        repo({ databaseId: 5005, isArchived: true }),
      ],
      hasNextPage: false,
      endCursor: null,
    }),
  });
  const { json } = await call(deps);
  const items = json.items as Array<Record<string, unknown>>;
  assertEquals(items[0].eligible, true);
  assertEquals(items[0].ineligibleReason, null);

  assertEquals(items[1].eligible, false);
  assertEquals(items[1].ineligibleReason, "FORK");

  assertEquals(items[2].eligible, false);
  assertEquals(items[2].ineligibleReason, "EMPTY");

  // Fork menang atas EMPTY (urutan cek kontrak).
  assertEquals(items[3].ineligibleReason, "FORK");

  // Arsip tidak menghalangi publikasi.
  assertEquals(items[4].eligible, true);
  assertEquals(items[4].ineligibleReason, null);
});

Deno.test("list-my-repos: non-developer -> 403, tanpa JWT -> 401", async () => {
  const forbidden = await call(
    makeDeps({ getProfile: async () => ({ githubLogin: "dev", roles: ["recruiter"] }) }),
  );
  assertEquals(forbidden.res.status, 403);
  assertEquals(forbidden.json.code, "FORBIDDEN");

  const unauth = await call(
    makeDeps({ authenticate: async () => ({ caller: null, error: "Header Authorization diperlukan" }) }),
  );
  assertEquals(unauth.res.status, 401);
  assertEquals(unauth.json.code, "UNAUTHORIZED");
});

Deno.test("list-my-repos: paginasi kursor diteruskan ke GitHub", async () => {
  const seen: Array<string | null> = [];
  const deps = makeDeps({
    listRepos: async (_login, after) => {
      seen.push(after);
      return {
        nodes: [repo({ databaseId: after ? 6002 : 6001 })],
        hasNextPage: after === null,
        endCursor: "CURSOR_PAGE_1",
      };
    },
  });

  const page1 = await call(deps);
  assertEquals(page1.res.status, 200);
  const nextCursor = page1.json.nextCursor as string | null;
  assert(nextCursor !== null, "halaman 1 harus memiliki nextCursor");
  if (nextCursor) {
    assertEquals(decodeRepoCursor(nextCursor), "CURSOR_PAGE_1");
    const page2 = await call(
      deps,
      req("GET", { url: `http://localhost/list-my-repos?cursor=${encodeURIComponent(nextCursor)}` }),
    );
    assertEquals(page2.res.status, 200);
    assertEquals(page2.json.nextCursor, null);
  }
  assertEquals(seen, [null, "CURSOR_PAGE_1"]);
});

Deno.test("list-my-repos: kursor rusak -> 400 VALIDATION", async () => {
  const { res, json } = await call(
    makeDeps(),
    req("GET", { url: "http://localhost/list-my-repos?cursor=!!!" }),
  );
  assertEquals(res.status, 400);
  assertEquals(json.code, "VALIDATION");
});

Deno.test("list-my-repos: rate limit -> 429 dengan retry_after", async () => {
  const deps = makeDeps({ checkRateLimit: async () => ({ allowed: false, retryAfter: 12 }) });
  const { res, json } = await call(deps);
  assertEquals(res.status, 429);
  assertEquals(json.code, "RATE_LIMITED");
  assertEquals(json.retry_after, 12);
});

Deno.test("list-my-repos: kegagalan GitHub -> 502/429/404", async () => {
  const other = await call(
    makeDeps({
      listRepos: async () => {
        throw new UpstreamFailure("other", "gagal");
      },
    }),
  );
  assertEquals(other.res.status, 502);
  assertEquals(other.json.code, "UPSTREAM_ERROR");

  const limited = await call(
    makeDeps({
      listRepos: async () => {
        throw new UpstreamFailure("rate_limited", "kuota", 30);
      },
    }),
  );
  assertEquals(limited.res.status, 429);
  assertEquals(limited.json.code, "RATE_LIMITED");
  assertEquals(limited.json.retry_after, 30);

  const missing = await call(
    makeDeps({
      listRepos: async () => {
        throw new UpstreamFailure("not_found", "tidak ada");
      },
    }),
  );
  assertEquals(missing.res.status, 404);
  assertEquals(missing.json.code, "NOT_FOUND");
});

Deno.test("list-my-repos: tanpa email di respons", async () => {
  const { text } = await call(makeDeps());
  assertNotMatch(text, EMAIL_RE);
});

Deno.test("list-my-repos: metode salah -> 405", async () => {
  const res = await createListMyReposHandler(makeDeps())(
    new Request("http://localhost/list-my-repos", { method: "DELETE" }),
  );
  assertEquals(res.status, 405);
});
