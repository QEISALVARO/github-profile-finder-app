// scripts/backend/bench-discover.ts
// Benchmark Discover (BE-4). Menjalankan >= 200 panggilan RPC dengan filter
// bervariasi dan halaman dalam, lalu menulis data mentah ke
// docs/backend/evidence/discover-bench-<tanggal>.json.
//
// Prasyarat: Supabase lokal + JWT recruiter + data seed (make bench-seed +
// >= 5.000 developer listed beranalisis sintetis). Tanpa prasyarat ini JANGAN
// mengisi angka — status gate tetap BELUM DIUKUR.
//
// EXPLAIN (ANALYZE, BUFFERS) dijalankan terpisah lewat psql karena RPC REST
// tidak mengekspos rencana kueri:
//   npx supabase db execute --local -c \
//     "explain (analyze, buffers) select public.discover_developers(null,null,null,null,null,null,20)"

interface Sample {
  i: number;
  role: string | null;
  minScore: number | null;
  countries: string[] | null;
  page: number;
  ms: number;
  totalCount: number;
  items: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function callDiscover(
  url: string,
  jwt: string,
  anonKey: string,
  params: Record<string, unknown>,
): Promise<{ ms: number; body: { totalCount?: number; items?: unknown[] } }> {
  const start = performance.now();
  const res = await fetch(`${url}/rest/v1/rpc/discover_developers`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  const ms = performance.now() - start;
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const body = await res.json() as { totalCount?: number; items?: unknown[] };
  return { ms, body };
}

async function main(): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const jwt = Deno.env.get("RECRUITER_JWT") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!url || !jwt || !anon) {
    console.error("SUPABASE_URL, SUPABASE_ANON_KEY, dan RECRUITER_JWT wajib diisi.");
    Deno.exit(2);
  }

  const roles: Array<string | null> = [null, "Back-End", "Front-End", "Mobile", "Data"];
  const minScores: Array<number | null> = [null, 70, 80, 90];
  const countrySets: Array<string[] | null> = [null, ["ID"], ["ID", "SG"], ["US", "GB"]];
  const samples: Sample[] = [];
  let cursor: string | null = null;

  for (let i = 0; i < 220; i++) {
    const role = roles[i % roles.length];
    const minScore = minScores[Math.floor(i / roles.length) % minScores.length];
    const countries = countrySets[Math.floor(i / (roles.length * minScores.length)) % countrySets.length];

    const { ms, body } = await callDiscover(url, jwt, anon, {
      p_role: role,
      p_min_score: minScore,
      p_countries: countries,
      p_language: null,
      p_availability: null,
      p_cursor: null,
      p_lim: 20,
    });
    samples.push({
      i,
      role,
      minScore,
      countries,
      page: 1,
      ms,
      totalCount: body.totalCount ?? 0,
      items: body.items?.length ?? 0,
    });

    // Halaman dalam: telusuri kursor pada sebagian iterasi.
    if (i % 10 === 0) {
      cursor = (body as { nextCursor?: string | null }).nextCursor ?? null;
      let page = 2;
      while (cursor && page <= 5) {
        const deep = await callDiscover(url, jwt, anon, {
          p_role: role,
          p_min_score: minScore,
          p_countries: countries,
          p_cursor: cursor,
          p_lim: 20,
        });
        samples.push({
          i,
          role,
          minScore,
          countries,
          page,
          ms: deep.ms,
          totalCount: deep.body.totalCount ?? 0,
          items: deep.body.items?.length ?? 0,
        });
        cursor = (deep.body as { nextCursor?: string | null }).nextCursor ?? null;
        page++;
      }
    }
  }

  const times = samples.map((s) => s.ms).sort((a, b) => a - b);
  const result = {
    generatedAt: new Date().toISOString(),
    environment: "local-supabase",
    calls: samples.length,
    p50Ms: percentile(times, 50),
    p95Ms: percentile(times, 95),
    targetP95Ms: 500,
    targetMet: percentile(times, 95) < 500,
    samples,
  };

  const out = `docs/backend/evidence/discover-bench-${today()}.json`;
  await Deno.writeTextFile(out, JSON.stringify(result, null, 2));
  console.log(`p95=${result.p95Ms.toFixed(1)}ms -> ${out}`);
}

if (import.meta.main) {
  await main();
}
