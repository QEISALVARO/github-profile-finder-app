// @ts-nocheck
// supabase/functions/_shared/supabase.ts
// Supabase client helper untuk Edge Functions: Caller Client (JWT) & Admin Client (service_role).

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";

export function getCallerClient(authHeader: string): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

export function getAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di environment");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export interface CallerUser {
  id: string;
  githubLogin?: string;
  roles: string[];
}

export async function authenticateCaller(
  authHeader: string | null
): Promise<{ user: CallerUser | null; error: string | null }> {
  if (!authHeader) {
    return { user: null, error: "Header Authorization diperlukan" };
  }

  const callerClient = getCallerClient(authHeader);
  const { data: { user }, error } = await callerClient.auth.getUser();

  if (error || !user) {
    return { user: null, error: "Token autentikasi tidak valid atau sudah kedaluwarsa" };
  }

  const adminClient = getAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("github_login, roles")
    .eq("id", user.id)
    .single();

  return {
    user: {
      id: user.id,
      githubLogin: profile?.github_login ?? undefined,
      roles: profile?.roles ?? [],
    },
    error: null,
  };
}
