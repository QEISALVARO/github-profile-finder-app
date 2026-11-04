// @ts-nocheck
// supabase/functions/_shared/scoring/role-map.ts
// Pemetaan role yang diinferensi (untuk developer) menjadi FeedRole
// (Front-End, Back-End, Mobile, Data) yang digunakan di contract.
// Semua pemetaan harus konsisten dengan yang digunakan di Edge Function
// publish-project dan rekursif jika diperlukan.

import { InferredRole } from "./role.ts";
import { FeedRole } from "../../../../contracts/src/projects.ts";

export function mapRole(inferred: InferredRole): z.infer<typeof FeedRole> {
  if (inferred === "Front-End Developer") return "Front-End";
  if (inferred === "Mobile Developer") return "Mobile";
  if (inferred === "AI / Data Engineer") return "Data";
  return "Back-End";
}
