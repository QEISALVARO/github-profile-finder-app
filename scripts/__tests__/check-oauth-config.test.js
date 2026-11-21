/**
 * Test untuk scripts/check-oauth-config.mjs.
 *
 * Skrip menghitung ROOT dari lokasi filenya sendiri, jadi setiap test menyalin
 * skrip asli ke `<tmp>/scripts/check-oauth-config.mjs` lalu menaruh fixture
 * `app.json`, `.env`, dan `supabase/config.toml` di root sementara itu. Skrip
 * dijalankan sebagai proses Node terpisah dengan `--offline` (tanpa jaringan),
 * persis seperti `npm run oauth:check -- --offline`, sehingga exit code dan
 * output yang diuji adalah perilaku nyata, bukan tiruan.
 */

const { spawnSync } = require('node:child_process');
const {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const SCRIPT_SOURCE = join(__dirname, '..', 'check-oauth-config.mjs');

/** Env yang dibaca skrip — dibersihkan agar proses induk tidak bocor ke test. */
const SCRIPT_ENV_KEYS = [
  'EXPO_PUBLIC_AUTH_REDIRECT_URL',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_DS_AUTH',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'SUPABASE_AUTH_GOOGLE_CLIENT_ID',
  'SUPABASE_AUTH_GOOGLE_SECRET',
];

const DEFAULT_APP_JSON = { expo: { scheme: 'gitscope' } };

const DEFAULT_CONFIG_TOML = `[auth]
site_url = "gitscope://auth/callback"
additional_redirect_urls = ["gitscope://auth/callback", "gitscope://**"]
enable_manual_linking = true

[auth.external.github]
enabled = true
client_id = "env(GITHUB_CLIENT_ID)"
secret = "env(GITHUB_CLIENT_SECRET)"

[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_GOOGLE_SECRET)"
`;

const DEFAULT_ENV = {
  EXPO_PUBLIC_DS_AUTH: 'api',
  EXPO_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-1234567890',
  GITHUB_CLIENT_ID: 'Iv1.0123456789abcdef',
  GITHUB_CLIENT_SECRET: 'github-secret-123456',
  SUPABASE_AUTH_GOOGLE_CLIENT_ID: '1234567890-abc.apps.googleusercontent.com',
  SUPABASE_AUTH_GOOGLE_SECRET: 'google-secret-123456',
};

const tempDirs = [];

function toEnvFile(values) {
  return (
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n'
  );
}

/**
 * Bangun project sementara. Field `undefined` memakai default; `null`/`false`
 * menghilangkan file tersebut.
 */
function makeProject(options = {}) {
  const {
    appJson = DEFAULT_APP_JSON,
    env = DEFAULT_ENV,
    envLocal,
    configToml = DEFAULT_CONFIG_TOML,
    callbackRoute = true,
  } = options;

  const root = mkdtempSync(join(tmpdir(), 'oauth-check-'));
  tempDirs.push(root);

  mkdirSync(join(root, 'scripts'), { recursive: true });
  copyFileSync(SCRIPT_SOURCE, join(root, 'scripts', 'check-oauth-config.mjs'));

  if (appJson !== null) {
    writeFileSync(
      join(root, 'app.json'),
      typeof appJson === 'string' ? appJson : JSON.stringify(appJson, null, 2),
    );
  }
  if (configToml !== null) {
    mkdirSync(join(root, 'supabase'), { recursive: true });
    writeFileSync(join(root, 'supabase', 'config.toml'), configToml);
  }
  if (env !== null) {
    writeFileSync(join(root, '.env'), typeof env === 'string' ? env : toEnvFile(env));
  }
  if (envLocal !== undefined) {
    writeFileSync(
      join(root, '.env.local'),
      typeof envLocal === 'string' ? envLocal : toEnvFile(envLocal),
    );
  }
  if (callbackRoute) {
    mkdirSync(join(root, 'src', 'app', 'auth'), { recursive: true });
    writeFileSync(join(root, 'src', 'app', 'auth', 'callback.tsx'), 'export default function C() {}\n');
  }

  return root;
}

function runScript(root, args = [], extraEnv = {}) {
  const env = { ...process.env };
  for (const key of SCRIPT_ENV_KEYS) delete env[key];
  Object.assign(env, extraEnv);

  const result = spawnSync(process.execPath, [join(root, 'scripts', 'check-oauth-config.mjs'), ...args], {
    env,
    encoding: 'utf8',
    timeout: 30_000,
  });

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('check-oauth-config — konfigurasi lengkap', () => {
  it('passes with a complete env + config.toml fixture', () => {
    const run = runScript(makeProject(), ['--offline']);

    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    expect(run.output).toContain('Scheme app: gitscope');
    expect(run.output).toContain('auth.site_url menunjuk ke callback app.');
    expect(run.output).toContain('Manual linking aktif (wajib untuk Google → GitHub).');
    expect(run.output).toContain('GitHub: env(GITHUB_CLIENT_ID) terisi');
    expect(run.output).toContain('Google: env(SUPABASE_AUTH_GOOGLE_CLIENT_ID) terisi');
    expect(run.output).toContain('Konfigurasi OAuth siap untuk build.');
    expect(run.output).toContain('Ringkasan:');
    expect(run.output).toContain('0 gagal');
  });

  it('never prints provider secrets', () => {
    const run = runScript(makeProject(), ['--offline']);

    expect(run.status).toBe(0);
    expect(run.output).not.toContain(DEFAULT_ENV.GITHUB_CLIENT_SECRET);
    expect(run.output).not.toContain(DEFAULT_ENV.SUPABASE_AUTH_GOOGLE_SECRET);
  });

  it('accepts a multiline additional_redirect_urls array', () => {
    const configToml = `[auth]
site_url = "gitscope://auth/callback"
additional_redirect_urls = [
  "gitscope://auth/callback",
  "gitscope://**",
]
enable_manual_linking = true

[auth.external.github]
enabled = true
client_id = "env(GITHUB_CLIENT_ID)"
secret = "env(GITHUB_CLIENT_SECRET)"

[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_GOOGLE_SECRET)"
`;

    const run = runScript(makeProject({ configToml }), ['--offline']);

    expect(run.status).toBe(0);
    expect(run.output).toContain('Deep link app ada di additional_redirect_urls.');
  });
});

describe('check-oauth-config — kegagalan konfigurasi', () => {
  it('fails when app.json has no scheme', () => {
    const run = runScript(makeProject({ appJson: { expo: {} } }), ['--offline']);

    expect(run.status).toBe(1);
    expect(run.output).toContain('app.json tidak punya `expo.scheme`');
    expect(run.output).toContain('Perbaiki item GAGAL');
  });

  it('fails when the app deep link is missing from additional_redirect_urls', () => {
    const configToml = DEFAULT_CONFIG_TOML.replace(
      'additional_redirect_urls = ["gitscope://auth/callback", "gitscope://**"]',
      'additional_redirect_urls = ["gitscope://**"]',
    );

    const run = runScript(makeProject({ configToml }), ['--offline']);

    expect(run.status).toBe(1);
    expect(run.output).toContain('additional_redirect_urls tidak memuat "gitscope://auth/callback"');
  });

  it('fails when manual linking is disabled (Google → GitHub gate)', () => {
    const configToml = DEFAULT_CONFIG_TOML.replace(
      'enable_manual_linking = true',
      'enable_manual_linking = false',
    );

    const run = runScript(makeProject({ configToml }), ['--offline']);

    expect(run.status).toBe(1);
    expect(run.output).toContain('auth.enable_manual_linking bukan true.');
  });

  it('fails when the auth/callback route file is missing', () => {
    const run = runScript(makeProject({ callbackRoute: false }), ['--offline']);

    expect(run.status).toBe(1);
    expect(run.output).toContain('Route src/app/auth/callback.tsx tidak ditemukan.');
  });

  it('fails when EXPO_PUBLIC_DS_AUTH=api but the Supabase URL is empty', () => {
    const env = { ...DEFAULT_ENV, EXPO_PUBLIC_SUPABASE_URL: '' };

    const run = runScript(makeProject({ env }), ['--offline']);

    expect(run.status).toBe(1);
    expect(run.output).toContain('EXPO_PUBLIC_SUPABASE_URL kosong / masih placeholder.');
  });

  it('fails when the Supabase URL is not a valid URL', () => {
    const env = { ...DEFAULT_ENV, EXPO_PUBLIC_SUPABASE_URL: 'not-a-url' };

    const run = runScript(makeProject({ env }), ['--offline']);

    expect(run.status).toBe(1);
    expect(run.output).toContain('EXPO_PUBLIC_SUPABASE_URL bukan URL valid.');
  });
});

describe('check-oauth-config — prioritas env dan mode strict', () => {
  it('lets .env.local override .env', () => {
    const root = makeProject({
      env: { ...DEFAULT_ENV, EXPO_PUBLIC_SUPABASE_URL: '' },
      envLocal: { EXPO_PUBLIC_SUPABASE_URL: 'https://localoverride.supabase.co' },
    });

    const run = runScript(root, ['--offline']);

    expect(run.status).toBe(0);
    expect(run.output).toContain('Supabase: https://localoverride.supabase.co');
  });

  it('lets process.env override both files', () => {
    const run = runScript(makeProject(), ['--offline'], { EXPO_PUBLIC_DS_AUTH: 'mock' });

    expect(run.status).toBe(0);
    expect(run.output).toContain('EXPO_PUBLIC_DS_AUTH bukan "api"');
  });

  it('reports missing local provider secrets as warnings with exit 0', () => {
    const env = {
      ...DEFAULT_ENV,
      GITHUB_CLIENT_ID: '',
      GITHUB_CLIENT_SECRET: '',
    };

    const run = runScript(makeProject({ env }), ['--offline']);

    expect(run.status).toBe(0);
    expect(run.output).toContain('GitHub: GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET belum diisi.');
    expect(run.output).toContain('Tidak ada kegagalan; tinjau peringatan');
  });

  it('turns warnings into exit 1 with --strict', () => {
    const env = { ...DEFAULT_ENV, SUPABASE_AUTH_GOOGLE_CLIENT_ID: '', SUPABASE_AUTH_GOOGLE_SECRET: '' };

    const lenient = runScript(makeProject({ env }), ['--offline']);
    const strict = runScript(makeProject({ env }), ['--offline', '--strict']);

    expect(lenient.status).toBe(0);
    expect(strict.status).toBe(1);
    expect(strict.output).toContain('Google: SUPABASE_AUTH_GOOGLE_CLIENT_ID / SUPABASE_AUTH_GOOGLE_SECRET belum diisi.');
  });

  it('warns about an Expo Go redirect override and fails it under --strict', () => {
    const expoGoUrl = 'exp://192.168.1.5:8081';
    const env = { ...DEFAULT_ENV, EXPO_PUBLIC_AUTH_REDIRECT_URL: expoGoUrl };
    // config.toml harus mengikuti override, kalau tidak pemeriksaan allowlist
    // ikut gagal dan tes tidak lagi mengisolasi peringatan Expo Go.
    const configToml = DEFAULT_CONFIG_TOML.replaceAll('gitscope://auth/callback', expoGoUrl);

    const run = runScript(makeProject({ env, configToml }), ['--offline']);
    const strict = runScript(makeProject({ env, configToml }), ['--offline', '--strict']);

    expect(run.status).toBe(0);
    expect(run.output).toContain('Redirect override memakai URL Expo Go');
    expect(strict.status).toBe(1);
  });

  it('prints usage and exits 0 with --help', () => {
    const run = runScript(makeProject(), ['--help']);

    expect(run.status).toBe(0);
    expect(run.output).toContain('Pemakaian: node scripts/check-oauth-config.mjs');
  });
});
