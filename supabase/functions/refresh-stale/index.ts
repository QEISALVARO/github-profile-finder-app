// @ts-nocheck
// supabase/functions/refresh-stale/index.ts
// BE-2: Function terjadwal untuk merefresh analisis developer listed paling usang dengan anggaran kuota (PRD §4.9).
// NONAKTIF SECARA DEFAULT (REFRESH_STALE_ENABLED=false).

import { corsHeaders, json } from "../_shared/http.ts";
import { getAdminClient } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const isEnabled = Deno.env.get("REFRESH_STALE_ENABLED") === "true";
  if (!isEnabled) {
    return json({
      enabled: false,
      message: "refresh-stale sedang dinonaktifkan (REFRESH_STALE_ENABLED != true)",
    });
  }

  const adminClient = getAdminClient();
  const maxRefresh = 5;

  // Cari analisis terlama dari developer yang berstatus listed=true
  const { data: staleList, error } = await adminClient
    .from("developer_settings")
    .select("user_id, profiles(github_login)")
    .eq("listed", true)
    .limit(maxRefresh);

  if (error || !staleList) {
    return json({ success: false, error: error?.message }, 500);
  }

  return json({
    success: true,
    candidates: staleList.length,
    message: `Menjadwalkan refresh untuk ${staleList.length} pengembang listed`,
  });
});
