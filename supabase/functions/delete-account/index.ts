// @ts-nocheck
// supabase/functions/delete-account/index.ts
// BE-1: Edge Function delete-account (Deno / Supabase Edge Functions)
// Menghapus akun pengguna dan seluruh data terkait secara tuntas (cascade) sesuai POL / GDPR.

import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ErrorResponseBody {
  code: string;
  message: string;
  retry_after?: number;
}

Deno.serve(async (req: Request) => {
  // Tangani preflight OPTIONS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    const error: ErrorResponseBody = {
      code: "VALIDATION",
      message: "Hanya metode POST yang diizinkan",
    };
    return new Response(JSON.stringify(error), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      const error: ErrorResponseBody = {
        code: "UNAUTHORIZED",
        message: "Header Authorization diperlukan",
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseServiceKey) {
      const error: ErrorResponseBody = {
        code: "UPSTREAM_ERROR",
        message: "Konfigurasi server tidak lengkap (missing service role key)",
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Verifikasi JWT pengguna menggunakan anon client dengan token pengguna
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      const error: ErrorResponseBody = {
        code: "UNAUTHORIZED",
        message: "Token autentikasi tidak valid atau sudah kedaluwarsa",
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // 2. Gunakan admin client (service_role) untuk menghapus seluruh data pengguna secara berurutan
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Urutan pembersihan cascade manual demi kepastian penuh:
    // a. messages & conversations (sebagai sender atau peserta)
    await adminClient.from("messages").delete().eq("sender_id", userId);
    await adminClient.from("conversations").delete().or(`recruiter_id.eq.${userId},developer_id.eq.${userId}`);

    // b. pipeline, reports, blocks, abuse reports, push tokens
    await adminClient.from("pipeline_entries").delete().eq("recruiter_id", userId);
    await adminClient.from("reports").delete().eq("reporter_id", userId);
    await adminClient.from("push_tokens").delete().eq("user_id", userId);
    await adminClient.from("blocks").delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    await adminClient.from("abuse_reports").delete().eq("reporter_id", userId);

    // c. projects & settings
    await adminClient.from("projects").delete().eq("owner_id", userId);
    await adminClient.from("developer_settings").delete().eq("user_id", userId);
    await adminClient.from("recruiter_profiles").delete().eq("user_id", userId);

    // d. profiles
    await adminClient.from("profiles").delete().eq("id", userId);

    // e. auth.users (mencabut sesi dan kredensial secara permanen)
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error("Gagal menghapus auth.users:", deleteUserError);
      const error: ErrorResponseBody = {
        code: "UPSTREAM_ERROR",
        message: "Gagal menghapus akun pengguna dari auth server",
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Akun dan seluruh data pengguna berhasil dihapus secara permanen.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const error: ErrorResponseBody = {
      code: "UPSTREAM_ERROR",
      message: err instanceof Error ? err.message : "Terjadi kesalahan internal server",
    };
    return new Response(JSON.stringify(error), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

