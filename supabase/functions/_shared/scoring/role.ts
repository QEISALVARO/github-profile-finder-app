// @ts-nocheck
// supabase/functions/_shared/scoring/role.ts
// Inferensi peran developer deterministik berdasarkan bahasa dominan dan framework (PRD §4.6).

export type InferredRole =
  | "Front-End Developer"
  | "Mobile Developer"
  | "AI / Data Engineer"
  | "Back-End Developer";

export function inferDeveloperRole(
  primaryLanguage: string,
  frameworks: string[],
  languageBytesMap: Record<string, number>
): InferredRole {
  const fwSet = new Set(frameworks.map((f) => f.toLowerCase()));
  const primLang = primaryLanguage.toLowerCase();

  // 1. Mobile (Flutter / React Native / Expo, atau bahasa dominan Kotlin/Swift/Dart)
  if (
    fwSet.has("flutter") ||
    fwSet.has("react native") ||
    fwSet.has("expo") ||
    primLang === "dart" ||
    primLang === "kotlin" ||
    primLang === "swift"
  ) {
    return "Mobile Developer";
  }

  // 2. AI / Data Engineer (Python + torch/tensorflow/pandas/sklearn, atau dominan Jupyter Notebook/R)
  const isPython = primLang === "python";
  const hasAiFramework =
    fwSet.has("pytorch") ||
    fwSet.has("tensorflow") ||
    fwSet.has("pandas") ||
    fwSet.has("scikit-learn");

  if (
    (isPython && hasAiFramework) ||
    primLang === "jupyter notebook" ||
    primLang === "r"
  ) {
    return "AI / Data Engineer";
  }

  // 3. Front-End Developer (JS/TS/HTML/CSS dengan framework UI atau tanpa framework backend)
  const isWebLanguage =
    primLang === "javascript" ||
    primLang === "typescript" ||
    primLang === "html" ||
    primLang === "css";

  const hasUiFramework =
    fwSet.has("react") ||
    fwSet.has("vue") ||
    fwSet.has("svelte") ||
    fwSet.has("angular") ||
    fwSet.has("next.js") ||
    fwSet.has("nuxt") ||
    fwSet.has("vite") ||
    fwSet.has("tailwind css");

  const hasBackendFramework =
    fwSet.has("express") ||
    fwSet.has("nestjs") ||
    fwSet.has("fastify") ||
    fwSet.has("django") ||
    fwSet.has("flask") ||
    fwSet.has("fastapi") ||
    fwSet.has("gin") ||
    fwSet.has("fiber") ||
    fwSet.has("echo") ||
    fwSet.has("actix") ||
    fwSet.has("tokio");

  if (isWebLanguage && (hasUiFramework || !hasBackendFramework)) {
    return "Front-End Developer";
  }

  // 4. Back-End Developer (selain itu: Go, Rust, Java, C++, Python backend, dll.)
  return "Back-End Developer";
}
