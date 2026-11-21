#!/usr/bin/env node
// scripts/check-oauth-config.mjs
// Pemeriksa konfigurasi OAuth (GitHub + Google) SEBELUM build.
//
// Yang diperiksa:
//   1. Deep link app (app.json scheme + EXPO_PUBLIC_AUTH_REDIRECT_URL).
//   2. Env Supabase yang dibutuhkan runtime (URL, anon/publishable key, flag api).
//   3. supabase/config.toml untuk stack lokal: site_url, additional_redirect_urls,
//      enable_manual_linking, dan env Client ID tiap provider.
//   4. (default) Probe langsung ke `<supabase>/auth/v1/authorize` dengan
//      redirect_to = deep link app. Dari respons redirect Supabase bisa dilihat:
//        - Client ID provider kosong/terpasang,
//        - redirect_uri (Authorization callback URL) mengarah ke Supabase,
//        - redirect_to diterima (allowlist) atau ditolak.
//
// Pemakaian:
//   npm run oauth:check
//   npm run oauth:check -- --offline   # tanpa jaringan
//   npm run oauth:check -- --strict    # peringatan juga menggagalkan exit code
//
// Tidak pernah mencetak Client Secret; Client ID disamarkan.
// Exit code 1 bila ada pemeriksaan GAGAL (atau WARN dengan --strict).

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROBE_TIMEOUT_MS = 8_000;

const args = new Set(process.argv.slice(2));
if (args.has('--help') || args.has('-h')) {
  console.log(`Pemakaian: node scripts/check-oauth-config.mjs [--offline] [--strict]

  --offline  Lewati probe jaringan ke Supabase.
  --strict   Perlakukan peringatan sebagai kegagalan (exit 1).`);
  process.exit(0);
}
const OFFLINE = args.has('--offline');
const STRICT = args.has('--strict');

// ─── Output ──────────────────────────────────────────────────────────────────

const results = [];
const SECTION_ORDER = ['Deep link app', 'Environment', 'supabase/config.toml', 'Probe Supabase'];

function add(level, section, message, fix) {
  results.push({ level, section, message, fix });
}

const ok = (section, message) => add('ok', section, message);
const info = (section, message) => add('info', section, message);
const warn = (section, message, fix) => add('warn', section, message, fix);
const fail = (section, message, fix) => add('fail', section, message, fix);

function printReport() {
  console.log('\nPemeriksaan konfigurasi OAuth\n' + '─'.repeat(46));

  for (const section of SECTION_ORDER) {
    const items = results.filter((r) => r.section === section);
    if (items.length === 0) continue;
    console.log(`\n${section}`);
    for (const { level, message, fix } of items) {
      const tag = level === 'ok' ? '  OK  ' : level === 'warn' ? ' WARN ' : level === 'fail' ? 'GAGAL ' : ' INFO ';
      console.log(`[${tag}] ${message}`);
      if (fix) console.log(`         → ${fix}`);
    }
  }

  const failed = results.filter((r) => r.level === 'fail').length;
  const warned = results.filter((r) => r.level === 'warn').length;
  const passed = results.filter((r) => r.level === 'ok').length;

  console.log('\n' + '─'.repeat(46));
  console.log(`Ringkasan: ${passed} OK · ${warned} peringatan · ${failed} gagal`);
  if (failed > 0) console.log('Perbaiki item GAGAL di atas sebelum `eas build` / `expo run:*`.');
  else if (warned > 0) console.log('Tidak ada kegagalan; tinjau peringatan di atas (mis. setelan di dashboard Supabase).');
  else console.log('Konfigurasi OAuth siap untuk build.');
  console.log('');
}

// ─── Helper baca file ────────────────────────────────────────────────────────

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

// `.env.local` menimpa `.env`; process.env menimpa keduanya (seperti Expo).
const envFiles = new Map([...parseEnvFile('.env'), ...parseEnvFile('.env.local')]);
const getEnv = (name) => (process.env[name] ?? envFiles.get(name) ?? '').trim();
const isPlaceholder = (value) => value === '' || /^<.*>$/.test(value);

/** TOML minimal: cukup untuk [auth], [auth.external.*], array multiline. */
function parseConfigToml() {
  const text = readText('supabase/config.toml');
  if (text === null) return null;

  const values = {};
  let section = '';
  let pendingKey = null;
  let pendingValue = '';

  const parseValue = (raw) => {
    const value = raw.trim();
    if (value.startsWith('[')) {
      return value
        .slice(1, value.lastIndexOf(']'))
        .split(',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .filter((item) => item !== '');
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value.replace(/^["']|["']$/g, '');
  };

  for (const rawLine of text.split(/\r?\n/)) {
    if (pendingKey !== null) {
      pendingValue += ' ' + rawLine.trim();
      if (rawLine.includes(']')) {
        values[`${section}.${pendingKey}`] = parseValue(pendingValue);
        pendingKey = null;
        pendingValue = '';
      }
      continue;
    }

    const line = rawLine.replace(/#.*$/, '').trim();
    if (line === '') continue;

    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const key = section === '' ? match[1] : `${section}.${match[1]}`;
    const rawValue = match[2].trim();
    if (rawValue.startsWith('[') && !rawValue.includes(']')) {
      pendingKey = match[1];
      pendingValue = rawValue;
      continue;
    }
    values[key] = parseValue(rawValue);
  }
  return values;
}

function envNameFromConfigValue(value) {
  const match = typeof value === 'string' ? value.match(/^env\(([A-Za-z_][A-Za-z0-9_]*)\)$/) : null;
  return match ? match[1] : null;
}

function mask(value) {
  const clean = value.trim();
  if (clean.length <= 8) return '***' + clean.slice(-2);
  return `${clean.slice(0, 4)}…${clean.slice(-4)}`;
}

/** Tampilkan URL tanpa query (bisa memuat code/token) dan tanpa melempar. */
function describeUrl(value) {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return value.slice(0, 80);
  }
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// ─── 1. Deep link app ────────────────────────────────────────────────────────

const appJson = readJson('app.json');
const expoConfig = appJson?.expo ?? {};
const schemes = Array.isArray(expoConfig.scheme) ? expoConfig.scheme : [expoConfig.scheme].filter(Boolean);
const scheme = schemes[0] ?? '';
const overrideRedirect = getEnv('EXPO_PUBLIC_AUTH_REDIRECT_URL');
const appCallback = overrideRedirect || (scheme ? `${scheme}://auth/callback` : '');

if (!scheme) {
  fail('Deep link app', 'app.json tidak punya `expo.scheme`.', 'Tambahkan "scheme": "gitscope" di app.json.');
} else {
  ok('Deep link app', `Scheme app: ${scheme}`);
}

if (overrideRedirect) {
  if (/^exp:\/\//.test(overrideRedirect)) {
    warn(
      'Deep link app',
      `Redirect override memakai URL Expo Go (${overrideRedirect}).`,
      'Hanya untuk development; build standalone memakai scheme app. Kosongkan EXPO_PUBLIC_AUTH_REDIRECT_URL di EAS production.',
    );
  } else if (scheme && !overrideRedirect.startsWith(`${scheme}:`)) {
    warn(
      'Deep link app',
      `Redirect override ${overrideRedirect} tidak memakai scheme app "${scheme}".`,
      'Pastikan deep link ini memang didaftarkan di allowlist Supabase, atau kosongkan override.',
    );
  } else {
    info('Deep link app', `Redirect override aktif: ${overrideRedirect}`);
  }
} else if (scheme) {
  ok('Deep link app', `Callback app: ${appCallback}`);
}

if (!existsSync(resolve(ROOT, 'src/app/auth/callback.tsx'))) {
  fail(
    'Deep link app',
    'Route src/app/auth/callback.tsx tidak ditemukan.',
    'Deep link `auth/callback` tidak akan tertangani saat app dibuka dingin.',
  );
}

// ─── 2. Environment ──────────────────────────────────────────────────────────

const supabaseUrl = getEnv('EXPO_PUBLIC_SUPABASE_URL').replace(/\/+$/, '');
const supabaseKey =
  getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') || getEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const authApiEnabled = getEnv('EXPO_PUBLIC_DS_AUTH').toLowerCase() === 'api';

let supabaseCallback = '';
let supabaseHost = '';

if (isPlaceholder(supabaseUrl)) {
  (authApiEnabled ? fail : warn)(
    'Environment',
    'EXPO_PUBLIC_SUPABASE_URL kosong / masih placeholder.',
    authApiEnabled
      ? 'EXPO_PUBLIC_DS_AUTH=api tetapi URL Supabase tidak ada; login OAuth tidak akan jalan.'
      : 'Diperlukan bila EXPO_PUBLIC_DS_AUTH=api (build dengan login sungguhan).',
  );
} else {
  try {
    const parsed = new URL(supabaseUrl);
    supabaseHost = parsed.host;
    supabaseCallback = `${supabaseUrl}/auth/v1/callback`;
    ok('Environment', `Supabase: ${parsed.origin}${parsed.pathname === '/' ? '' : parsed.pathname}`);
    if (parsed.protocol === 'http:' && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(parsed.hostname)) {
      warn('Environment', 'URL Supabase memakai http (bukan https).', 'Build release sebaiknya https://<ref>.supabase.co.');
    }
  } catch {
    (authApiEnabled ? fail : warn)(
      'Environment',
      'EXPO_PUBLIC_SUPABASE_URL bukan URL valid.',
      'Format: https://<PROJECT_REF>.supabase.co',
    );
  }
}

if (isPlaceholder(supabaseKey)) {
  (authApiEnabled ? fail : warn)(
    'Environment',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY / PUBLISHABLE_KEY kosong.',
    'Salin anon/publishable key dari Supabase → Project Settings → API.',
  );
} else {
  ok('Environment', 'Anon/publishable key Supabase terpasang.');
}

if (!authApiEnabled) {
  info(
    'Environment',
    'EXPO_PUBLIC_DS_AUTH bukan "api" — app berjalan dengan sesi demo; OAuth tidak dipakai runtime.',
  );
}

// Provider secrets untuk stack LOKAL (`supabase start`).
const localSecrets = [
  { label: 'GitHub', id: 'GITHUB_CLIENT_ID', secret: 'GITHUB_CLIENT_SECRET' },
  { label: 'Google', id: 'SUPABASE_AUTH_GOOGLE_CLIENT_ID', secret: 'SUPABASE_AUTH_GOOGLE_SECRET' },
];
for (const provider of localSecrets) {
  const id = getEnv(provider.id);
  const secret = getEnv(provider.secret);
  if (isPlaceholder(id) || isPlaceholder(secret)) {
    warn(
      'Environment',
      `${provider.label}: ${provider.id} / ${provider.secret} belum diisi.`,
      'Hanya diperlukan untuk `supabase start` (hosted memakai setelan dashboard). Lihat .env.example.',
    );
  } else {
    ok('Environment', `${provider.label}: Client ID lokal ${mask(id)} + secret terpasang.`);
  }
}

// ─── 3. supabase/config.toml ─────────────────────────────────────────────────

const config = parseConfigToml();

if (config === null) {
  warn('supabase/config.toml', 'File tidak ditemukan — stack Supabase lokal tidak bisa dicek.');
} else {
  const siteUrl = String(config['auth.site_url'] ?? '');
  const redirectUrls = Array.isArray(config['auth.additional_redirect_urls'])
    ? config['auth.additional_redirect_urls'].map(String)
    : [];

  if (appCallback && siteUrl !== appCallback) {
    warn(
      'supabase/config.toml',
      `auth.site_url = "${siteUrl}" (callback app: "${appCallback}").`,
      'Samakan site_url dengan deep link app agar fallback error OAuth kembali ke aplikasi.',
    );
  } else if (appCallback) {
    ok('supabase/config.toml', 'auth.site_url menunjuk ke callback app.');
  }

  if (appCallback && !redirectUrls.includes(appCallback)) {
    fail(
      'supabase/config.toml',
      `auth.additional_redirect_urls tidak memuat "${appCallback}".`,
      'Tambahkan deep link app ke daftar itu (lokal) DAN ke Supabase → Authentication → URL Configuration (hosted).',
    );
  } else if (appCallback) {
    ok('supabase/config.toml', 'Deep link app ada di additional_redirect_urls.');
  }

  if (config['auth.enable_manual_linking'] !== true) {
    fail(
      'supabase/config.toml',
      'auth.enable_manual_linking bukan true.',
      'Login Google → wajib tautkan GitHub memakai linkIdentity(); aktifkan manual linking lokal + di dashboard.',
    );
  } else {
    ok('supabase/config.toml', 'Manual linking aktif (wajib untuk Google → GitHub).');
  }

  for (const provider of ['github', 'google']) {
    const enabled = config[`auth.external.${provider}.enabled`] !== false;
    const clientIdConfig = String(config[`auth.external.${provider}.client_id`] ?? '');
    const envName = envNameFromConfigValue(clientIdConfig);
    const label = provider === 'github' ? 'GitHub' : 'Google';

    if (!enabled) {
      info('supabase/config.toml', `Provider ${label} dimatikan di config lokal.`);
      continue;
    }
    if (!envName) {
      if (isPlaceholder(clientIdConfig)) {
        warn(
          'supabase/config.toml',
          `Client ID ${label} di config kosong.`,
          `Isi [auth.external.${provider}] client_id atau env yang dirujuk.`,
        );
      } else {
        ok('supabase/config.toml', `Client ID ${label} di config: ${mask(clientIdConfig)}`);
      }
      continue;
    }

    const value = getEnv(envName);
    if (isPlaceholder(value)) {
      warn(
        'supabase/config.toml',
        `${label}: env(${envName}) dirujuk config tetapi belum diisi.`,
        authApiEnabled
          ? `Isi ${envName} di .env atau set provider ${label} langsung di Supabase Dashboard.`
          : `Hanya untuk stack lokal; hosted memakai Supabase Dashboard → Providers → ${label}.`,
      );
    } else {
      ok('supabase/config.toml', `${label}: env(${envName}) terisi (${mask(value)}).`);
    }
  }
}

// ─── 4. Probe Supabase (Client ID, callback, allowlist) ─────────────────────

async function probeProvider(provider) {
  const label = provider === 'github' ? 'GitHub' : 'Google';

  if (OFFLINE) {
    info('Probe Supabase', `${label}: dilewati (--offline).`);
    return;
  }
  if (!supabaseUrl || !supabaseKey || !appCallback) {
    warn(
      'Probe Supabase',
      `${label}: tidak bisa diverifikasi (URL/key Supabase atau deep link kosong).`,
      'Lengkapi env lalu jalankan ulang tanpa --offline.',
    );
    return;
  }

  // `scopes` mencerminkan permintaan app (signInWithGitHub memakai read:user).
  const authorizeUrl =
    `${supabaseUrl}/auth/v1/authorize?provider=${provider}` +
    `&redirect_to=${encodeURIComponent(appCallback)}` +
    (provider === 'github' ? '&scopes=read%3Auser' : '');

  let response;
  try {
    response = await fetch(authorizeUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: { apikey: supabaseKey },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error?.name === 'TimeoutError' ? 'timeout' : 'jaringan gagal';
    warn(
      'Probe Supabase',
      `${label}: authorize tidak bisa dihubungi (${reason}).`,
      'Cek koneksi / EXPO_PUBLIC_SUPABASE_URL; probe ini opsional, build tetap bisa jalan.',
    );
    return;
  }

  const status = response.status;
  const location = response.headers.get('location') ?? '';

  if (status >= 300 && status < 400 && location) {
    let target;
    try {
      target = new URL(location);
    } catch {
      warn('Probe Supabase', `${label}: redirect authorize tidak bisa dibaca.`, 'Cek konfigurasi provider di dashboard.');
      return;
    }

    const params = target.searchParams;
    const hashParams = new URLSearchParams(target.hash.replace(/^#/, ''));
    const getParam = (name) => params.get(name) ?? hashParams.get(name) ?? '';

    if (target.hostname === 'github.com' || target.hostname === 'www.github.com') {
      const clientId = getParam('client_id');
      const redirectUri = getParam('redirect_uri');

      if (clientId === '') {
        fail('Probe Supabase', 'GitHub: Supabase mengirim client_id kosong.', 'Isi Client ID di Dashboard → Providers → GitHub.');
      } else {
        ok('Probe Supabase', `GitHub: Client ID terpasang (${mask(clientId)}).`);
      }

      if (redirectUri === '') {
        fail('Probe Supabase', 'GitHub: authorize tidak membawa redirect_uri.', 'Set Client ID/Secret provider GitHub dengan lengkap.');
      } else if (supabaseCallback && redirectUri !== supabaseCallback) {
        fail(
          'Probe Supabase',
          `GitHub: redirect_uri tidak menunjuk ke Supabase (${describeUrl(redirectUri)}).`,
          `Authorization callback URL di OAuth App harus ${supabaseCallback} — bukan deep link app.`,
        );
      } else {
        ok('Probe Supabase', 'GitHub: Authorization callback URL mengarah ke Supabase.');
      }

      const scope = params.get('scope') ?? '';
      if (scope !== '' && !/(^|\s)read:user(\s|$)/.test(scope)) {
        warn(
          'Probe Supabase',
          `GitHub: app meminta read:user tetapi scope di authorize hanya "${scope}".`,
          'Cek provider GitHub di dashboard; app memakai scopes read:user (POL-2).',
        );
      } else if (scope !== '') {
        ok('Probe Supabase', `GitHub: scope authorize "${scope}".`);
      }
      if (/(^|\s)user:email(\s|$)/.test(scope)) {
        warn(
          'Probe Supabase',
          'GitHub: authorize meminta user:email (melanggar POL-2 — email tidak boleh diambil).',
          'Hapus user:email dari scope provider GitHub di Supabase Dashboard.',
        );
      }
      return;
    }

    if (target.hostname === 'accounts.google.com') {
      const clientId = getParam('client_id');
      const redirectUri = getParam('redirect_uri');

      if (clientId === '') {
        fail('Probe Supabase', 'Google: Supabase mengirim client_id kosong.', 'Isi Client ID di Dashboard → Providers → Google.');
      } else if (!clientId.endsWith('.apps.googleusercontent.com')) {
        warn(
          'Probe Supabase',
          `Google: Client ID tidak berakhiran .apps.googleusercontent.com (${mask(clientId)}).`,
          'Pakai OAuth client ID tipe Web application dari Google Cloud Console.',
        );
      } else {
        ok('Probe Supabase', `Google: Client ID terpasang (${mask(clientId)}).`);
      }

      if (redirectUri === '') {
        fail('Probe Supabase', 'Google: authorize tidak membawa redirect_uri.');
      } else if (supabaseCallback && redirectUri !== supabaseCallback) {
        fail(
          'Probe Supabase',
          `Google: redirect_uri tidak menunjuk ke Supabase (${describeUrl(redirectUri)}).`,
          `Authorized redirect URI di Google Cloud harus ${supabaseCallback}.`,
        );
      } else {
        ok('Probe Supabase', 'Google: Authorized redirect URI mengarah ke Supabase.');
      }
      return;
    }

    // Supabase mengembalikan error lewat redirect (mis. redirect_to ditolak).
    const description = getParam('error_description') || getParam('error') || getParam('message');
    if (description) {
      fail(
        'Probe Supabase',
        `${label}: authorize dialihkan ke ${target.hostname} dengan error "${safeDecode(description).slice(0, 180)}".`,
        /redirect/i.test(description)
          ? `Tambahkan "${appCallback}" ke Supabase → Authentication → URL Configuration → Redirect URLs.`
          : 'Cek provider dan kredensialnya di Supabase Dashboard.',
      );
      return;
    }

    warn(
      'Probe Supabase',
      `${label}: authorize dialihkan ke ${target.hostname} (bukan halaman provider).`,
      'Buka URL authorize di browser untuk melihat pesan lengkapnya.',
    );
    return;
  }

  let bodyText = '';
  try {
    bodyText = (await response.text()).slice(0, 600);
  } catch {
    bodyText = '';
  }

  let payload = {};
  try {
    payload = JSON.parse(bodyText);
  } catch {
    payload = {};
  }
  const message = String(payload.msg ?? payload.error_description ?? payload.error ?? bodyText)
    .replace(/\s+/g, ' ')
    .slice(0, 180);

  if (status === 404) {
    fail(
      'Probe Supabase',
      `${label}: endpoint /auth/v1/authorize tidak ditemukan (404).`,
      'Cek EXPO_PUBLIC_SUPABASE_URL — harus origin project Supabase, tanpa /rest/v1.',
    );
    return;
  }

  if (status >= 400 && status < 500) {
    const isProvider = /provider is not enabled|unsupported provider|provider is not configured|missing oauth secret/i.test(
      message,
    );
    const isRedirect = /redirect/i.test(message);
    const isClient = /client[ _-]?id|oauth secret|invalid.*client/i.test(message);

    fail(
      'Probe Supabase',
      `${label}: authorize ditolak (${status}) — ${message || 'tanpa pesan'}.`,
      isProvider
        ? `Aktifkan provider ${label} + isi Client ID/Secret di Supabase Dashboard → Authentication → Providers.`
        : isRedirect
          ? `Tambahkan "${appCallback}" ke Authentication → URL Configuration → Redirect URLs.`
          : isClient
            ? `Client ID/Secret ${label} tidak cocok atau berasal dari app yang berbeda.`
            : 'Cek setelan provider di Supabase Dashboard.',
    );
    return;
  }

  warn(
    'Probe Supabase',
    `${label}: authorize membalas ${status}${message ? ` — ${message}` : ''}.`,
    'Periksa manual di dashboard bila login gagal.',
  );
}

for (const provider of ['github', 'google']) {
  await probeProvider(provider);
}

printReport();

const failed = results.filter((r) => r.level === 'fail').length;
const warned = results.filter((r) => r.level === 'warn').length;
process.exit(failed > 0 || (STRICT && warned > 0) ? 1 : 0);
