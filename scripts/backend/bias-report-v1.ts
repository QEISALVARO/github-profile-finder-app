// scripts/backend/bias-report-v1.ts
// Menjalankan RPC bias_report_v1 (admin/service role), menghitung impact
// ratio + Wilson CI + Benjamini-Hochberg di scripts/backend/bias-v1.ts, lalu
// menulis docs/backend/evidence/bias-v1-<tanggal>.md.
//
// Prasyarat: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, database berisi data
// (lihat docs/backend/bias-audit.md). Ambang bisa diatur lewat
// BIAS_THRESHOLD (default 70) dan BIAS_MIN_GROUP (default 30).

import {
  evaluateReport,
  renderBiasV1Markdown,
  type BiasV1Report,
} from "./bias-v1.ts";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function intEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    console.error(`${name} harus bilangan bulat.`);
    Deno.exit(2);
  }
  return value;
}

async function main(): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) {
    console.error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.");
    Deno.exit(2);
  }

  const threshold = intEnv("BIAS_THRESHOLD", 70);
  const minGroup = intEnv("BIAS_MIN_GROUP", 30);

  const res = await fetch(`${url}/rest/v1/rpc/bias_report_v1`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_threshold: threshold, p_min_group: minGroup }),
  });
  if (!res.ok) {
    console.error(`RPC gagal: HTTP ${res.status} ${await res.text()}`);
    Deno.exit(1);
  }

  const report = (await res.json()) as BiasV1Report;
  const note =
    "BASELINE PADA DATA (sintetis/beta) — bukan klaim tentang pengguna nyata. " +
    "Dihasilkan oleh scripts/backend/bias-report-v1.ts.";
  const out = `docs/backend/evidence/bias-v1-${today()}.md`;
  await Deno.writeTextFile(out, renderBiasV1Markdown(report, note));

  const dimensions = evaluateReport(report);
  const adverse = dimensions.reduce((sum, d) => sum + d.adverseCount, 0);
  const reportable = dimensions.reduce((sum, d) => sum + d.groups.length, 0);
  console.log(
    `n=${report.overall?.n ?? 0} ambang=${threshold} grup=${reportable} adverse=${adverse} -> ${out}`,
  );
  for (const d of dimensions) {
    const flagged = d.groups.filter((g) => g.adverse).map((g) => g.key);
    console.log(`  ${d.dimension}: acuan=${d.referenceKey ?? "-"} adverse=${flagged.join(",") || "-"}`);
  }
}

if (import.meta.main) {
  await main();
}
