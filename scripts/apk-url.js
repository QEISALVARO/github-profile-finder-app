#!/usr/bin/env node
// Prints the download URL of the newest Android APK produced by EAS.
// Usage: npm run apk:url   (requires `npx eas-cli login`)
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;

function latestAndroidBuild() {
  const raw = execSync(
    'npx eas-cli@latest build:list --platform android --limit 1 --json --non-interactive',
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  const builds = JSON.parse(raw);
  if (!Array.isArray(builds) || builds.length === 0) return null;
  return builds[0];
}

const build = latestAndroidBuild();
if (!build) {
  console.log('Belum ada build Android. Jalankan dulu: npm run build:apk');
  process.exit(1);
}

const apkUrl = build.artifacts?.buildUrl;
if (!apkUrl) {
  console.log(`Build ${build.id} belum selesai (status: ${build.status}).`);
  console.log('Cek progres: ' + dashboardUrl(build.id));
  process.exit(1);
}

console.log('APK   : ' + apkUrl);
console.log('Halaman build: ' + dashboardUrl(build.id));

function dashboardUrl(buildId) {
  const account = appConfig.owner;
  const slug = appConfig.slug;
  return `https://expo.dev/accounts/${account}/projects/${slug}/builds/${buildId}`;
}
