// scripts/backend/bench-feed.ts
// Bench feed BE-3: >= 200 panggilan search_projects + country_facets via
// PostgREST lokal + EXPLAIN (ANALYZE, BUFFERS) kueri utama.
// BUTUH: Supabase lokal hidup, bench.sql sudah dimuat (make bench-seed),
// JWT (BENCH_JWT) + anon key. TANPA token GitHub.
// Jalankan: deno run --allow-read --allow-write --allow-env --allow-net scripts/backend/bench-feed.ts
// (Izin --allow-net hanya untuk bench ini, bukan unit test.)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "http://127.0.0.1:54321";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const JWT = Deno.env.get("BENCH_JWT") ?? "";

if (!ANON_KEY || !JWT) {
  console.error("SUPABASE_ANON_KEY dan BENCH_JWT wajib diset.");
  Deno.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  apikey: ANON_KEY,
  Authorization: `Bearer ${JWT}`,
};

async function rpc(fn: string, params: Record<string, unknown>): Promise<{ ms: number; ok: boolean }> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });
    await res.text();
    return { ms: Date.now() - t0, ok: res.ok };
  } catch {
    return { ms: Date.now() - t0, ok: false };
  }
}

const calls: Array<[string, Record<string, unknown>]> = [];
const keywords = ["go", "golang", "ml", "e-commerce", "e commerce", "react", "machine", "tokoonline", "pipeline", ""];
const countrySets: Array<string[] | null> = [null, ["ID"], ["ID", "SG"], ["US"], ["GB", "NO"]];
const roles = [null, "Back-End", "Data"];
for (let i = 0; i < 200; i++) {
  const q = keywords[i % keywords.length];
  const c = countrySets[i % countrySets.length];
  const role = roles[i % roles.length];
  calls.push(["search_projects", {
    p_q: q || null,
    p_role: role,
    p_countries: c,
    p_city: c && c.length === 1 && i % 5 === 0 ? "Jakarta" : null,
    p_active_only: i % 7 === 0,
    p_min_score: i % 9 === 0 ? 70 : null,
    p_cursor: null,
    p_lim: 20,
    p_include_unknown: false,
  }]);
  if (i % 4 === 0) calls.push(["country_facets", { p_q: q || null, p_role: role }]);
  if (i % 10 === 0) calls.push(["city_facets", { p_country: "ID" }]);
  if (i % 25 === 0) calls.push(["featured_projects", { p_lim: 10 }]);
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

const durations: number[] = [];
let okCount = 0;
for (const [fn, params] of calls) {
  const r = await rpc(fn, params);
  durations.push(r.ms);
  if (r.ok) okCount++;
  if (durations.length % 50 === 0) console.log(`... ${durations.length}/${calls.length}`);
}
durations.sort((a, b) => a - b);
const summary = {
  generatedAt: new Date().toISOString(),
  calls: calls.length,
  ok: okCount,
  medianMs: quantile(durations, 0.5),
  p95Ms: quantile(durations, 0.95),
  maxMs: durations[durations.length - 1] ?? 0,
  durationsMs: durations,
};
await Deno.mkdir("docs/backend/evidence", { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const outPath = `docs/backend/evidence/feed-bench-${stamp}.json`;
await Deno.writeTextFile(outPath, JSON.stringify(summary, null, 1));
console.log(`Bukti mentah tersimpan di ${outPath}`);
console.log(`n=${summary.calls} ok=${summary.ok} median=${summary.medianMs}ms p95=${summary.p95Ms}ms max=${summary.maxMs}ms`);
console.log("Target: p95 < 500 ms pada >= 10 rb proyek. BELUM DIUKUR bila skrip belum dijalankan.");
