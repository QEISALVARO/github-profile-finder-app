// @ts-nocheck
// scripts/backend/record-github-fixtures.ts
// Skrip mandiri untuk merekam respons mentah dari GitHub API ke supabase/functions/_fixtures/github/
// PENTING: Token API dan alamat email TIDAK PERNAH ditulis ke file fixture (POL-2).

import * as fs from "node:fs";
import * as path from "node:path";

const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN;
const login = process.argv[2] || "octocat";

if (!GITHUB_API_TOKEN) {
  console.error("ERROR: GITHUB_API_TOKEN harus diset di environment variables sebelum menjalankan skrip ini.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${GITHUB_API_TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "Gitscope-Fixture-Recorder/2.0",
};

async function record() {
  console.log(`Merekam fixture GitHub untuk pengguna: ${login}...`);

  // 1. REST User
  const userRes = await fetch(`https://api.github.com/users/${login}`, { headers });
  if (!userRes.ok) {
    console.error(`Gagal mengambil data user: ${userRes.status}`);
    return;
  }
  const userJson = await userRes.json();
  // Sanitasi email
  delete userJson.email;

  // 2. REST Repos
  const reposRes = await fetch(`https://api.github.com/users/${login}/repos?per_page=30&sort=pushed`, { headers });
  const reposJson = reposRes.ok ? await reposRes.json() : [];

  const targetDir = path.resolve(process.cwd(), "supabase/functions/_fixtures/github");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const fixturePayload = {
    recordedAt: new Date().toISOString(),
    login,
    user: userJson,
    repos: reposJson,
  };

  const targetFile = path.join(targetDir, `${login.toLowerCase()}_fixture.json`);
  fs.writeFileSync(targetFile, JSON.stringify(fixturePayload, null, 2), "utf-8");
  console.log(`✓ Berhasil menyimpan fixture ke: ${targetFile}`);
}

record().catch(console.error);
