// scripts/backend/bias-report.ts
// Menjalankan RPC bias_report_v0 (admin/service role) dan menulis
// docs/backend/evidence/bias-v0-<tanggal>.md.
//
// Prasyarat: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, database lokal berisi
// data (lihat docs/backend/bias-audit.md). Tanpa itu skrip TIDAK dijalankan.

import { renderBiasMarkdown, type BiasReport } from "./bias-format.ts";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) {
    console.error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.");
    Deno.exit(2);
  }

  const res = await fetch(`${url}/rest/v1/rpc/bias_report_v0`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!res.ok) {
    console.error(`RPC gagal: HTTP ${res.status}`);
    Deno.exit(1);
  }

  const report = (await res.json()) as BiasReport;
  const note =
    "BASELINE PADA DATA SINTETIS — bukan klaim tentang pengguna nyata. " +
    "Dihasilkan oleh scripts/backend/bias-report.ts.";
  const out = `docs/backend/evidence/bias-v0-${today()}.md`;
  await Deno.writeTextFile(out, renderBiasMarkdown(report, note));
  console.log(`Ditulis: ${out}`);
}

if (import.meta.main) {
  await main();
}
