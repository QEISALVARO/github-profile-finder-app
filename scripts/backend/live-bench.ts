// scripts/backend/live-bench.ts
// Bench ingestion live: memanggil Edge Function analyze-developer lokal untuk
// >= 10 login publik dan merekam data MENTAH ke docs/backend/evidence/.
//
// WAJIB: Supabase lokal hidup (`make up`, `make reset`) + env:
//   SUPABASE_URL (default http://127.0.0.1:54321)
//   SUPABASE_ANON_KEY (atau JWT user; lihat `supabase status` / seed-dev-users)
//   GITHUB_API_TOKEN harus terisi di server (Edge Function), bukan di skrip ini.
//
// Catatan: skrip ini TIDAK PERNAH menulis token/email ke berkas bukti.
// Jalankan: deno run --allow-read --allow-write --allow-env --allow-net scripts/backend/live-bench.ts
// (Izin --allow-net hanya untuk bench live ini, bukan untuk unit test.)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "http://127.0.0.1:54321";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const USER_JWT = Deno.env.get("BENCH_USER_JWT") ?? "";

if (!ANON_KEY && !USER_JWT) {
  console.error("BENCH_USER_JWT atau SUPABASE_ANON_KEY wajib diset (lihat `supabase status`).");
  Deno.exit(1);
}

// Variasi: banyak repo, sedikit repo, akun baru, banyak fork, user tidak ada.
const LOGINS = [
  "torvalds",
  "octocat",
  "sindresorhus",
  "yyx990803",
  "gaearon",
  "defunkt",
  "mojombo",
  "pjhyett",
  "wycats",
  "ezmobius",
  "ivey",
  "non-existent-user-xyz123",
];

interface BenchRow {
  login: string;
  httpStatus: number;
  durationMs: number;
  source: string | null;
  graphqlCostQ1: number | null;
  graphqlCostQ3: number | null;
  graphqlCostQ4: number | null;
  graphqlRemaining: number | null;
  note: string | null;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx];
}

const rows: BenchRow[] = [];
for (const login of LOGINS) {
  for (const force of [false, true]) {
    const started = Date.now();
    let httpStatus = 0;
    let body: Record<string, unknown> = {};
    let note: string | null = null;
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-developer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${USER_JWT || ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({ login, force }),
      });
      httpStatus = res.status;
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        note = "respons bukan JSON";
      }
    } catch (err) {
      note = err instanceof Error ? err.message : "fetch gagal";
    }
    const durationMs = Date.now() - started;
    rows.push({
      login,
      httpStatus,
      durationMs,
      source: typeof body.source === "string" ? body.source : null,
      graphqlCostQ1: null, // biaya per query (Q1-Q4) hanya terlihat di log server; isi manual dari log bila perlu
      graphqlCostQ3: null,
      graphqlCostQ4: null,
      graphqlRemaining: null,
      note: force ? "force=true" : note,
    });
    console.log(`${login} force=${force} -> ${httpStatus} ${durationMs}ms`);
  }
}

const freshDurations = rows
  .filter((r) => r.source === "fresh")
  .map((r) => r.durationMs)
  .sort((a, b) => a - b);
const summary = {
  generatedAt: new Date().toISOString(),
  endpoint: `${SUPABASE_URL}/functions/v1/analyze-developer`,
  count: rows.length,
  freshCount: freshDurations.length,
  medianMs: quantile(freshDurations, 0.5),
  p95Ms: quantile(freshDurations, 0.95),
  rows,
};

await Deno.mkdir("docs/backend/evidence", { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const outPath = `docs/backend/evidence/ingestion-live-${stamp}.json`;
await Deno.writeTextFile(outPath, JSON.stringify(summary, null, 2));
console.log(`Bukti mentah tersimpan di ${outPath}`);
console.log(`median=${summary.medianMs}ms p95=${summary.p95Ms}ms (n fresh=${summary.freshCount})`);
