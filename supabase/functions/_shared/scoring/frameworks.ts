// @ts-nocheck
// supabase/functions/_shared/scoring/frameworks.ts
// Deteksi framework teknologi dari manifest dependensi proyek (package.json, pubspec, go.mod, dll.).

import { RepoFact } from "../github/facts.ts";

interface FrameworkDefinition {
  name: string;
  manifestKey: string;
  pattern: RegExp;
}

const FRAMEWORK_DEFINITIONS: FrameworkDefinition[] = [
  // JavaScript / TypeScript / Node
  { name: "React", manifestKey: "package.json", pattern: /"(?:react|react-dom)":/i },
  { name: "React Native", manifestKey: "package.json", pattern: /"react-native":/i },
  { name: "Expo", manifestKey: "package.json", pattern: /"expo":/i },
  { name: "Next.js", manifestKey: "package.json", pattern: /"next":/i },
  { name: "Vue", manifestKey: "package.json", pattern: /"vue":/i },
  { name: "Nuxt", manifestKey: "package.json", pattern: /"nuxt":/i },
  { name: "Svelte", manifestKey: "package.json", pattern: /"svelte":/i },
  { name: "Angular", manifestKey: "package.json", pattern: /"@angular\/core":/i },
  { name: "Express", manifestKey: "package.json", pattern: /"express":/i },
  { name: "NestJS", manifestKey: "package.json", pattern: /"@nestjs\/core":/i },
  { name: "Fastify", manifestKey: "package.json", pattern: /"fastify":/i },
  { name: "Tailwind CSS", manifestKey: "package.json", pattern: /"tailwindcss":/i },
  { name: "Vite", manifestKey: "package.json", pattern: /"vite":/i },

  // Mobile (Dart/Flutter)
  { name: "Flutter", manifestKey: "pubspec.yaml", pattern: /flutter:\s*sdk:\s*flutter/i },

  // Go
  { name: "Gin", manifestKey: "go.mod", pattern: /github\.com\/gin-gonic\/gin/i },
  { name: "Fiber", manifestKey: "go.mod", pattern: /github\.com\/gofiber\/fiber/i },
  { name: "Echo", manifestKey: "go.mod", pattern: /github\.com\/labstack\/echo/i },

  // Python
  { name: "PyTorch", manifestKey: "requirements.txt", pattern: /\btorch\b/i },
  { name: "PyTorch", manifestKey: "pyproject.toml", pattern: /\btorch\b/i },
  { name: "TensorFlow", manifestKey: "requirements.txt", pattern: /\btensorflow\b/i },
  { name: "TensorFlow", manifestKey: "pyproject.toml", pattern: /\btensorflow\b/i },
  { name: "FastAPI", manifestKey: "requirements.txt", pattern: /\bfastapi\b/i },
  { name: "FastAPI", manifestKey: "pyproject.toml", pattern: /\bfastapi\b/i },
  { name: "Django", manifestKey: "requirements.txt", pattern: /\bdjango\b/i },
  { name: "Django", manifestKey: "pyproject.toml", pattern: /\bdjango\b/i },
  { name: "Flask", manifestKey: "requirements.txt", pattern: /\bflask\b/i },
  { name: "Flask", manifestKey: "pyproject.toml", pattern: /\bflask\b/i },
  { name: "Pandas", manifestKey: "requirements.txt", pattern: /\bpandas\b/i },
  { name: "Pandas", manifestKey: "pyproject.toml", pattern: /\bpandas\b/i },
  { name: "Scikit-Learn", manifestKey: "requirements.txt", pattern: /\bscikit-learn\b/i },
  { name: "Scikit-Learn", manifestKey: "pyproject.toml", pattern: /\bscikit-learn\b/i },

  // Rust
  { name: "Tokio", manifestKey: "Cargo.toml", pattern: /\btokio\b/i },
  { name: "Actix", manifestKey: "Cargo.toml", pattern: /\bactix-web\b/i },
];

export function detectFrameworks(repos: RepoFact[]): string[] {
  const scores: Record<string, number> = {};

  // Urut repo berdasarkan recency
  const sortedRepos = [...repos].sort(
    (a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime()
  );

  sortedRepos.forEach((repo, index) => {
    // Bobot recency: repo lebih baru mendapatkan poin lebih besar
    const weight = Math.max(1, 10 - index);
    const manifests = repo.manifests ?? {};

    for (const def of FRAMEWORK_DEFINITIONS) {
      const manifestContent = manifests[def.manifestKey];
      if (manifestContent && def.pattern.test(manifestContent)) {
        scores[def.name] = (scores[def.name] ?? 0) + weight;
      }
    }
  });

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 6);
}
