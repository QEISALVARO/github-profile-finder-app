// @ts-nocheck
// supabase/functions/analyze-developer/index.ts
// BE-2: Edge Function analyze-developer (Deno / Supabase Edge Functions)
// Mengambil data publik GitHub di sisi server, menghitung scoring v2, men-cache hasil, dan mengembalikan AnalysisVM.

import { corsHeaders, json, errorResponse } from "../_shared/http.ts";
import { authenticateCaller, getAdminClient } from "../_shared/supabase.ts";
import { createGitHubAuth } from "../_shared/github/auth.ts";
import { executeGraphQL, GitHubGraphQLError } from "../_shared/github/graphql.ts";
import {
  PROFILE_AND_REPOS_QUERY,
  CONTRIBUTIONS_12M_QUERY,
  CONTRIBUTIONS_PREV_12M_QUERY,
  REPO_MANIFEST_QUERY,
} from "../_shared/github/queries.ts";
import { extractFactsFromGraphQL, Facts } from "../_shared/github/facts.ts";
import { safeVerifyDemoUrl } from "../_shared/ssrf/safe-fetch.ts";
import { buildAnalysisVM } from "../_shared/scoring/vm.ts";
import { isQuotaExhausted } from "../_shared/github/rate.ts";

// Regex validasi login GitHub (alfanumerik/hyphen, 1–39 karakter, tidak diawali/diakhiri hyphen, tanpa --)
const GITHUB_LOGIN_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // 1. CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("VALIDATION", "Hanya metode POST yang diizinkan", 405);
  }

  // 2. Autentikasi Pengguna
  const authHeader = req.headers.get("Authorization");
  const { user: caller, error: authError } = await authenticateCaller(authHeader);

  if (authError || !caller) {
    return errorResponse("UNAUTHORIZED", authError ?? "Token autentikasi tidak valid", 401);
  }

  // 3. Parsing & Validasi Request Body
  let body: { login?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return errorResponse("VALIDATION", "Body permintaan harus berupa format JSON valid", 400);
  }

  const rawLogin = body.login?.trim();
  if (!rawLogin || !GITHUB_LOGIN_REGEX.test(rawLogin)) {
    return errorResponse(
      "VALIDATION",
      "Format username GitHub tidak valid (1-39 karakter alfanumerik atau tanda hubung tunggal)",
      400
    );
  }

  const normalizedLogin = rawLogin.toLowerCase();
  const isForce = Boolean(body.force);

  // 4. Otorisasi (AIR-3): Recruiter ATAU Developer yang melihat profilnya sendiri
  const isRecruiter = caller.roles.includes("recruiter");
  const isSelf = caller.githubLogin?.toLowerCase() === normalizedLogin;

  if (!isRecruiter && !isSelf) {
    return errorResponse(
      "FORBIDDEN",
      "Hanya akun recruiter atau pemilik akun GitHub itu sendiri yang berhak meminta analisis",
      403
    );
  }

  const adminClient = getAdminClient();

  // 5. Rate Limit per Pengguna (30 request per jam)
  try {
    const { data: rlData, error: rlError } = await adminClient.rpc("check_rate_limit", {
      p_user: caller.id,
      p_key: "analyze",
      p_max: 30,
      p_window: "1 hour",
    });

    if (rlError) {
      console.error(`[${requestId}] Error saat memeriksa rate limit:`, rlError);
    } else if (rlData && rlData.length > 0 && !rlData[0].allowed) {
      const retryAfter = rlData[0].retry_after || 60;
      return errorResponse(
        "RATE_LIMITED",
        `Batas frekuensi permintaan analisis terlampaui. Coba lagi dalam ${retryAfter} detik.`,
        429,
        retryAfter
      );
    }
  } catch (err) {
    console.warn(`[${requestId}] Gagal mengecek rate limit:`, err);
  }

  // 6. Cek Profil Terdaftar & Status Listing
  let isListedDeveloper = false;
  let registeredCountryCode: string | null = null;
  let registeredCity: string | null = null;

  try {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("country_code, city, developer_settings(listed)")
      .eq("github_login", normalizedLogin)
      .maybeSingle();

    if (profile) {
      registeredCountryCode = profile.country_code ?? null;
      registeredCity = profile.city ?? null;
      if (profile.developer_settings && (profile.developer_settings as any).listed) {
        isListedDeveloper = true;
      }
    }
  } catch (err) {
    console.warn(`[${requestId}] Gagal memeriksa status profil:`, err);
  }

  // TTL: 12 jam bila listed, selainnya 24 jam
  const ttlMs = isListedDeveloper ? 12 * 3600 * 1000 : 24 * 3600 * 1000;

  // 7. Cek Cache Analisis di Database
  let existingAnalysis: any = null;
  try {
    const { data: cached } = await adminClient
      .from("analyses")
      .select("*")
      .eq("github_login", normalizedLogin)
      .eq("score_version", 2)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      existingAnalysis = cached;
      const createdAtMs = new Date(cached.created_at).getTime();
      const ageMs = Date.now() - createdAtMs;

      // Jika masih dalam TTL
      if (ageMs < ttlMs) {
        // Jika force diminta tapi usia analisis < 15 menit, force diabaikan dan kembalikan cache
        if (isForce && ageMs < 15 * 60 * 1000) {
          const cachedVm = buildAnalysisVM(cached.facts, {
            source: "cache",
            countryCode: registeredCountryCode,
            city: registeredCity,
          });
          return json(cachedVm);
        }

        // Jika force tidak aktif, kembalikan cache langsung
        if (!isForce) {
          const cachedVm = buildAnalysisVM(cached.facts, {
            source: "cache",
            countryCode: registeredCountryCode,
            city: registeredCity,
          });
          return json(cachedVm);
        }
      }
    }
  } catch (err) {
    console.warn(`[${requestId}] Gagal memeriksa cache:`, err);
  }

  // 8. Ambil Data Segar dari GitHub (Ingestion)
  const auth = createGitHubAuth();

  // Hitung rentang 1 tahun terakhir dan 1 tahun sebelumnya untuk kontribusi
  const now = new Date();
  const toDateStr = now.toISOString();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
  const fromDateStr = oneYearAgo.toISOString();
  const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 3600 * 1000);
  const prevFromDateStr = twoYearsAgo.toISOString();

  let q1Result: any;
  let q3Result: any;
  let q4Result: any;

  try {
    // Jalankan Q1, Q3, Q4 secara paralel dengan batas waktu total 20 dtk
    const [q1, q3, q4] = await Promise.all([
      executeGraphQL(PROFILE_AND_REPOS_QUERY, { login: normalizedLogin }, auth),
      executeGraphQL(CONTRIBUTIONS_12M_QUERY, { login: normalizedLogin, from: fromDateStr, to: toDateStr }, auth),
      executeGraphQL(CONTRIBUTIONS_PREV_12M_QUERY, { login: normalizedLogin, from: prevFromDateStr, to: fromDateStr }, auth),
    ]);

    q1Result = q1;
    q3Result = q3;
    q4Result = q4;

    // Pantau kuota rate limit
    const remaining = q1.rateLimit?.remaining ?? 5000;
    if (isQuotaExhausted(remaining)) {
      console.warn(`[${requestId}] Kuota GitHub API hampir habis: remaining=${remaining}`);
    }
  } catch (err: unknown) {
    console.error(`[${requestId}] Upstream error saat memanggil GitHub GraphQL:`, err);

    // KETENTUAN GITHUB ERROR: Bila ada analisis lama -> KEMBALIKAN STALE!
    if (existingAnalysis) {
      const staleVm = buildAnalysisVM(existingAnalysis.facts, {
        source: "stale",
        staleSince: existingAnalysis.created_at,
        countryCode: registeredCountryCode,
        city: registeredCity,
      });
      return json(staleVm);
    }

    // Jika tidak ada analisis lama, berikan error terstruktur (TIDAK PERNAH DATA PALSU!)
    if (err instanceof GitHubGraphQLError) {
      if (err.isNotFound) {
        return errorResponse("NOT_FOUND", "Pengguna GitHub tidak ditemukan", 404);
      }
      if (err.isRateLimited) {
        return errorResponse(
          "RATE_LIMITED",
          "Batas kuota GitHub API tercapai pada server hulu",
          429,
          err.retryAfter ?? 60
        );
      }
      if (err.status === 401) {
        return errorResponse("UPSTREAM_ERROR", "Autentikasi hulu GitHub gagal", 502);
      }
    }

    return errorResponse("UPSTREAM_ERROR", "Gagal menghubungi layanan GitHub API", 502);
  }

  // Periksa apakah user benar-benar ada di respon Q1
  if (!q1Result?.data?.user) {
    if (existingAnalysis) {
      const staleVm = buildAnalysisVM(existingAnalysis.facts, {
        source: "stale",
        staleSince: existingAnalysis.created_at,
        countryCode: registeredCountryCode,
        city: registeredCity,
      });
      return json(staleVm);
    }
    return errorResponse("NOT_FOUND", "Pengguna GitHub tidak ditemukan", 404);
  }

  // 9. Q2 — Ambil Manifest untuk <= 5 Repo Teratas
  const rawRepos = q1Result.data.user.repositories?.nodes ?? [];
  const topRepos = rawRepos.slice(0, 5);
  const manifestsMap: Record<string, Record<string, string>> = {};

  await Promise.all(
    topRepos.map(async (repo: any) => {
      try {
        const manifestRes = await executeGraphQL(
          REPO_MANIFEST_QUERY,
          { owner: normalizedLogin, name: repo.name },
          auth,
          fetch,
          5000
        );
        const repoManifests: Record<string, string> = {};
        const repData = manifestRes?.data?.repository;
        if (repData) {
          if (repData.packageJson?.text) repoManifests["package.json"] = repData.packageJson.text;
          if (repData.pubspecYaml?.text) repoManifests["pubspec.yaml"] = repData.pubspecYaml.text;
          if (repData.goMod?.text) repoManifests["go.mod"] = repData.goMod.text;
          if (repData.requirementsTxt?.text) repoManifests["requirements.txt"] = repData.requirementsTxt.text;
          if (repData.pyprojectToml?.text) repoManifests["pyproject.toml"] = repData.pyprojectToml.text;
          if (repData.cargoToml?.text) repoManifests["Cargo.toml"] = repData.cargoToml.text;
        }
        manifestsMap[repo.name] = repoManifests;
      } catch (err) {
        console.warn(`[${requestId}] Gagal mengambil manifest repo ${repo.name}:`, err);
      }
    })
  );

  // 10. Verifikasi Demo SSRF-safe (Maksimal 10 repo dengan homepageUrl, concurrency <= 5)
  const reposWithHomepage = rawRepos
    .filter((r: any) => Boolean(r.homepageUrl))
    .slice(0, 10);

  const verifiedDemosMap: Record<string, boolean> = {};

  // Batasi konkurensi verifikasi demo <= 5
  const demoChunks: any[][] = [];
  for (let i = 0; i < reposWithHomepage.length; i += 5) {
    demoChunks.push(reposWithHomepage.slice(i, i + 5));
  }

  for (const chunk of demoChunks) {
    await Promise.all(
      chunk.map(async (repo: any) => {
        try {
          const demoResult = await safeVerifyDemoUrl(repo.homepageUrl);
          verifiedDemosMap[repo.name] = demoResult.verified;
        } catch {
          verifiedDemosMap[repo.name] = false;
        }
      })
    );
  }

  // 11. Ekstraksi Fakta Bersih (POL-2: buang email)
  const facts: Facts = extractFactsFromGraphQL(
    q1Result.data,
    q3Result.data,
    q4Result.data,
    manifestsMap,
    verifiedDemosMap
  );

  // 12. Resolusi Negara & Kota
  let resolvedCountryCode = registeredCountryCode;
  let resolvedCity = registeredCity;

  if (!resolvedCountryCode && facts.profile.location) {
    try {
      const { data: normData } = await adminClient.rpc("normalize_location", {
        p_location: facts.profile.location,
      });
      if (normData && normData.length > 0) {
        const norm = normData[0];
        // Hanya terima bila confidence >= 80 (PRD §4.6)
        if (norm.confidence >= 80 && norm.country_code) {
          resolvedCountryCode = norm.country_code;
          resolvedCity = norm.city ?? null;
        }
      }
    } catch (err) {
      console.warn(`[${requestId}] Gagal normalisasi lokasi:`, err);
    }
  }

  // 13. Rakit AnalysisVM
  const analysisVm = buildAnalysisVM(facts, {
    source: "fresh",
    countryCode: resolvedCountryCode,
    city: resolvedCity,
  });

  // 14. Simpan ke Database (github_snapshots & analyses)
  const nowIso = new Date().toISOString();
  // Retensi: NULL bila listed, selainnya 24 jam untuk snapshot dan 7 hari untuk analisis lookup (POL-5)
  const snapshotExpiresAt = isListedDeveloper ? null : new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const analysisExpiresAt = isListedDeveloper ? null : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  try {
    // Upsert snapshot
    await adminClient.from("github_snapshots").upsert({
      login: normalizedLogin,
      github_id: q1Result.data.user.databaseId ?? null,
      user_json: facts.profile,
      repos_json: facts.repos,
      fetched_at: nowIso,
      expires_at: snapshotExpiresAt,
    });

    // Simpan analisis
    await adminClient.from("analyses").insert({
      github_login: normalizedLogin,
      score: analysisVm.authenticity,
      authenticity: analysisVm.authenticity,
      confidence: analysisVm.confidence,
      tier: analysisVm.tier,
      score_version: analysisVm.scoreVersion,
      breakdown_json: analysisVm.breakdown,
      metrics_json: analysisVm.metrics,
      heatmap_arr: analysisVm.heatmap,
      repos_json: analysisVm.repos,
      inferred_role: analysisVm.inferredRole,
      primary_language: analysisVm.primaryLanguage,
      facts,
      is_lookup: !isListedDeveloper,
      expires_at: analysisExpiresAt,
    });
  } catch (err) {
    console.error(`[${requestId}] Gagal menyimpan hasil analisis ke database:`, err);
  }

  // 15. Log Terstruktur (Jangan log token atau isi profil lengkap)
  const durationMs = Date.now() - startTime;
  console.log(
    JSON.stringify({
      request_id: requestId,
      login: normalizedLogin,
      source: "fresh",
      duration_ms: durationMs,
      graphql_cost: q1Result?.data?.rateLimit?.cost ?? 1,
      remaining_quota: q1Result?.data?.rateLimit?.remaining ?? null,
    })
  );

  return json(analysisVm);
});
