#!/usr/bin/env node
// scripts/check-auth-config.mjs
// Preflight konfigurasi auth Supabase (email confirmation + recovery) TANPA
// mencetak secret. Berbeda dari oauth:check, script ini tidak menghubungi
// jaringan; ia memeriksa env, redirect, dan mode data.
//
// Pemakaian:
//   npm run auth:check
//   npm run auth:check -- --strict
//
// Exit code 1 bila ada kegagalan (atau peringatan dengan --strict).

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STRICT = process.argv.slice(2).includes('--strict');

const results = [];
function add(level, section, message, fix) {
  results.push({ level, section, message, fix });
}
const ok = (section, message) => add('ok', section, message);
const info = (section, message) => add('info', section, message);
const warn = (section, message, fix) => add('warn', section, message, fix);
const fail = (section, message, fix) => add('fail', section, message, fix);

function readText(relativePath) {
  const full = resolve(ROOT, relativePath);
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
}

function readJson(relativePath) {
  const text = readText(relativePath);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseEnvFile(relativePath) {
  const map = new Map();
  const text = readText(relativePath);
  if (text === null) return map;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    map.set(match[1], value);
  }
  return map;
}

const envFiles = new Map([...parseEnvFile('.env'), ...parseEnvFile('.env.local')]);
const getEnv = (name) => (process.env[name] ?? envFiles.get(name) ?? '').trim();
const placeholder = (value) => /^<.*>$/.test(value) || /your[-_]|<project-ref>/i.test(value);

function maskedHost(value) {
  try {
    const url = new URL(value);
    return url.host;
  } catch {
    return '(URL tidak valid)';
  }
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

const appJson = readJson('app.json');
const scheme = appJson?.expo?.scheme;
const appScheme = Array.isArray(scheme) ? scheme[0] : scheme;

const url = getEnv('EXPO_PUBLIC_SUPABASE_URL');
const publishable = getEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const anon = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
const key = publishable || anon;
const redirectOverride = getEnv('EXPO_PUBLIC_AUTH_REDIRECT_URL');
const dsKeys = [
  'EXPO_PUBLIC_DS_AUTH',
  'EXPO_PUBLIC_DS_FEED',
  'EXPO_PUBLIC_DS_ANALYSIS',
  'EXPO_PUBLIC_DS_TALENT',
  'EXPO_PUBLIC_DS_CHAT',
  'EXPO_PUBLIC_DS_REPORTS',
];
const ds = Object.fromEntries(dsKeys.map((name) => [name, getEnv(name)]));
const production =
  getEnv('APP_ENV').toLowerCase() === 'production' ||
  getEnv('EAS_BUILD_PROFILE').toLowerCase() === 'production' ||
  getEnv('NODE_ENV').toLowerCase() === 'production';
const anyApi = Object.values(ds).some((value) => value === 'api');

// ─── Environment ────────────────────────────────────────────────────────────
if (!url) {
  (production || anyApi ? fail : warn)(
    'Environment',
    'EXPO_PUBLIC_SUPABASE_URL belum diisi.',
    'Isi URL project Supabase (lokal: http://127.0.0.1:54321, hosted: https://<ref>.supabase.co).',
  );
} else if (!/^https?:\/\//.test(url) || placeholder(url)) {
  fail(
    'Environment',
    `EXPO_PUBLIC_SUPABASE_URL tidak valid atau masih placeholder (${maskedHost(url)}).`,
    'Gunakan URL http(s) nyata dari Supabase Dashboard / `supabase status`.',
  );
} else {
  ok('Environment', `Supabase URL valid: ${maskedHost(url)}`);
}

if (!key) {
  (production || anyApi ? fail : warn)(
    'Environment',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY / ANON_KEY belum diisi.',
    'Isi publishable/anon key. Jangan pernah memakai service_role key di EXPO_PUBLIC_*.',
  );
} else if (placeholder(key)) {
  fail('Environment', 'Supabase key masih placeholder.', 'Salin key dari Supabase Dashboard / `supabase status`.');
} else {
  const payload = decodeJwtPayload(key);
  if (payload?.role === 'service_role') {
    fail(
      'Environment',
      'EXPO_PUBLIC_SUPABASE_* berisi key service_role — ini bypass RLS dan tidak boleh ada di bundle klien.',
      'Ganti dengan anon/publishable key; simpan service_role hanya untuk server/CI.',
    );
  } else {
    ok('Environment', 'Kunci klien bukan service_role (tidak dicetak).');
  }
}

// ─── Redirect & deep link ──────────────────────────────────────────────────
if (!appScheme) {
  fail('Deep link', 'app.json belum punya expo.scheme.', 'Tambahkan "scheme": "gitscope".');
} else {
  ok('Deep link', `Scheme app: ${appScheme}`);
}

if (redirectOverride) {
  if (placeholder(redirectOverride)) {
    fail('Deep link', 'EXPO_PUBLIC_AUTH_REDIRECT_URL masih placeholder.');
  } else if (/^exp:\/\//.test(redirectOverride)) {
    warn(
      'Deep link',
      'Redirect OAuth memakai URL Expo Go (exp://).',
      'Hanya untuk development; build standalone harus memakai scheme app.',
    );
  } else if (!/^https?:\/\//.test(redirectOverride) && !redirectOverride.startsWith(`${appScheme}:`)) {
    fail(
      'Deep link',
      'EXPO_PUBLIC_AUTH_REDIRECT_URL tidak cocok dengan scheme app.',
      `Gunakan ${appScheme}://auth/callback atau URL web yang terdaftar.`,
    );
  } else {
    ok('Deep link', 'Redirect override memakai scheme/URL yang dikenali.');
  }
} else {
  info('Deep link', `Redirect default: ${appScheme}://auth/callback (recovery: /auth/update-password).`);
}

// ─── Local config (hosted TIDAK mengikuti file ini) ────────────────────────
const configText = readText('supabase/config.toml');
if (configText === null) {
  warn('Config lokal', 'supabase/config.toml tidak ditemukan.', 'File ini hanya untuk stack lokal.');
} else {
  const hasCallback = configText.includes('auth/callback');
  const hasRecovery = configText.includes('auth/update-password');
  const confirmations = /enable_confirmations\s*=\s*true/.test(configText);
  if (!hasCallback) warn('Config lokal', 'Redirect auth/callback tidak ada di config.toml.');
  if (!hasRecovery) {
    warn(
      'Config lokal',
      'Redirect auth/update-password belum ada di additional_redirect_urls.',
      'Tambahkan deep link recovery agar tautan reset lokal tidak ditolak.',
    );
  }
  if (hasCallback && hasRecovery) ok('Config lokal', 'Redirect callback & recovery terdaftar.');
  if (confirmations) ok('Config lokal', 'Email confirmation aktif untuk Supabase lokal.');
  else warn('Config lokal', 'Email confirmation lokal nonaktif — perilaku hosted bisa berbeda.');
  info(
    'Config lokal',
    'config.toml hanya mengatur Supabase lokal; hosted harus diatur di Dashboard (lihat docs/auth-hosted-setup.md).',
  );
}

// ─── Mode data ──────────────────────────────────────────────────────────────
const mockDomains = dsKeys.filter((name) => ds[name] === 'mock');
const missingDomains = dsKeys.filter((name) => ds[name] !== 'api' && ds[name] !== 'mock');

if (production) {
  if (mockDomains.length > 0) {
    fail(
      'Mode data',
      `Build production masih menyetel ${mockDomains.join(', ')} = mock.`,
      'Production selalu memaksa api, tetapi env mock menandakan konfigurasi rilis belum siap.',
    );
  }
  if (missingDomains.length > 0) {
    fail(
      'Mode data',
      `Build production belum menyetel ${missingDomains.join(', ')}.`,
      'Setiap domain production harus eksplisit `api`.',
    );
  }
  if (mockDomains.length === 0 && missingDomains.length === 0) {
    ok('Mode data', 'Semua domain production disetel ke api.');
  }
} else {
  info(
    'Mode data',
    `Mode non-production: ${Object.entries(ds)
      .map(([name, value]) => `${name.replace('EXPO_PUBLIC_DS_', '').toLowerCase()}=${value || 'mock(default)'}`)
      .join(', ')}`,
  );
  if (production === false && anyApi && (!url || !key)) {
    warn('Mode data', 'Ada domain `api` tetapi env Supabase belum lengkap.');
  }
}

// ─── Report ─────────────────────────────────────────────────────────────────
const sectionOrder = ['Environment', 'Deep link', 'Config lokal', 'Mode data'];
console.log('\nPemeriksaan konfigurasi auth Supabase\n' + '─'.repeat(48));
for (const section of sectionOrder) {
  const items = results.filter((item) => item.section === section);
  if (items.length === 0) continue;
  console.log(`\n${section}`);
  for (const { level, message, fix } of items) {
    const tag = level === 'ok' ? '  OK  ' : level === 'warn' ? ' WARN ' : level === 'fail' ? 'GAGAL ' : ' INFO ';
    console.log(`[${tag}] ${message}`);
    if (fix) console.log(`         → ${fix}`);
  }
}

const failed = results.filter((item) => item.level === 'fail').length;
const warned = results.filter((item) => item.level === 'warn').length;
const passed = results.filter((item) => item.level === 'ok').length;
console.log('\n' + '─'.repeat(48));
console.log(`Ringkasan: ${passed} OK · ${warned} peringatan · ${failed} gagal`);
if (failed > 0) {
  console.log('Perbaiki item GAGAL sebelum build. Script ini tidak membuktikan konfigurasi hosted.');
} else if (warned > 0) {
  console.log('Tidak ada kegagalan; tinjau peringatan. Verifikasi hosted tetap manual (docs/auth-hosted-setup.md).');
} else {
  console.log('Konfigurasi env auth lengkap. Konfirmasi email hosted tetap diverifikasi manual.');
}
console.log('');

if (failed > 0 || (STRICT && warned > 0)) process.exit(1);
