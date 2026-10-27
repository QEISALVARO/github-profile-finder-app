// @ts-nocheck
// supabase/functions/_shared/http.ts
// Utilitas HTTP bersama: CORS, response helper, dan errorResponse berbasis ErrorBody (SP-0).

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export type ErrorCode =
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_OPEN_TO_MESSAGES"
  | "BLOCKED"
  | "CONVERSATION_LIMIT";

export interface ErrorBody {
  code: ErrorCode;
  message: string;
  retry_after?: number;
}

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status = 400,
  retryAfter?: number,
  extraHeaders: Record<string, string> = {}
): Response {
  const body: ErrorBody = { code, message };
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  if (retryAfter !== undefined && retryAfter > 0) {
    body.retry_after = retryAfter;
    headers["Retry-After"] = String(retryAfter);
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}
