// @ts-nocheck
// supabase/functions/_shared/normalize-login.ts
// Utilitas murni: normalisasi login GitHub ke lowercase (tanpa karakter ilegal).
// Dipisah agar dapat di-mock/suntik di Deno test tanpa dependensi DB.

import { z } from "npm:zod@^3.24.0";

export const GITHUB_LOGIN_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export function normalizeLogin(raw: string | null | undefined): string {
  if (raw == null) return "";
  return raw.trim().toLowerCase();
}

export function isValidGitHubLogin(raw: string): boolean {
  return GITHUB_LOGIN_REGEX.test(raw);
}

export const LoginSchema = z.string().min(1).max(39).refine((v) => GITHUB_LOGIN_REGEX.test(v), {
  message: "Format username GitHub tidak valid (1-39 karakter alfanumerik/hyphen, tidak diawali/akhiri hyphen, tanpa --)",
});
