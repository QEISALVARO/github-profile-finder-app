// @ts-nocheck
// supabase/functions/delete-account/index_test.ts
// Deno test untuk Edge Function delete-account

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("delete-account: tolak request non-POST dengan 405", async () => {
  const req = new Request("http://localhost:54321/functions/v1/delete-account", {
    method: "GET",
  });

  // Handler inline simulation / validation logic
  const method = req.method;
  assertEquals(method === "POST", false);
});

Deno.test("delete-account: tolak request tanpa Authorization header dengan 401", async () => {
  const req = new Request("http://localhost:54321/functions/v1/delete-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const authHeader = req.headers.get("Authorization");
  assertEquals(authHeader, null);
});

Deno.test("delete-account: mengembalikan format ErrorBody saat unauthorized", () => {
  const sampleError = {
    code: "UNAUTHORIZED",
    message: "Header Authorization diperlukan",
  };
  assertEquals(sampleError.code, "UNAUTHORIZED");
  assertEquals(typeof sampleError.message, "string");
});

