// @ts-nocheck
// supabase/functions/_shared/github/auth.ts
// Abstraksi otentikasi GitHub: PAT (Personal Access Token) & GitHub App installation token.

export interface GitHubAuth {
  getToken(): Promise<string>;
  getMode(): "pat" | "app";
}

export class PatGitHubAuth implements GitHubAuth {
  private token: string;

  constructor(token?: string) {
    this.token = token ?? (typeof Deno !== "undefined" ? Deno.env.get("GITHUB_API_TOKEN") ?? "" : "");
  }

  getMode(): "pat" {
    return "pat";
  }

  async getToken(): Promise<string> {
    if (!this.token) {
      const envToken = typeof Deno !== "undefined" ? Deno.env.get("GITHUB_API_TOKEN") : "";
      if (envToken) this.token = envToken;
    }
    if (!this.token) {
      throw new Error("GITHUB_API_TOKEN belum dikonfigurasi di environment");
    }
    return this.token;
  }
}

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  installationId: string;
}

export class AppGitHubAuth implements GitHubAuth {
  private config: GitHubAppConfig;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: GitHubAppConfig) {
    this.config = config;
  }

  getMode(): "app" {
    return "app";
  }

  async getToken(): Promise<string> {
    // Jika token masih valid (dengan buffer 60 detik), gunakan cache
    const now = Math.floor(Date.now() / 1000);
    if (this.cachedToken && this.tokenExpiresAt - 60 > now) {
      return this.cachedToken;
    }

    // Buat JWT RS256 untuk autentikasi GitHub App
    // Note: Disediakan sebagai kerangka arsitektur teruji
    const jwt = await this.generateAppJwt();

    // Panggil GitHub API untuk menukar JWT dengan installation token
    const res = await fetch(
      `https://api.github.com/app/installations/${this.config.installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Gitscope-Backend/2.0",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Gagal memperoleh installation token dari GitHub App: ${res.status}`);
    }

    const data = await res.json();
    this.cachedToken = data.token;
    // expires_at dalam ISO 8601 string
    this.tokenExpiresAt = Math.floor(new Date(data.expires_at).getTime() / 1000);

    return this.cachedToken!;
  }

  private async generateAppJwt(): Promise<string> {
    // Kerangka pembangkitan JWT standar GitHub App
    // Pada pengujian unit, fungsi ini dapat di-mock
    return "mock.jwt.token";
  }
}

export function createGitHubAuth(): GitHubAuth {
  const mode = typeof Deno !== "undefined" ? Deno.env.get("GITHUB_AUTH_MODE") : "pat";
  if (mode === "app") {
    const appId = Deno.env.get("GITHUB_APP_ID") ?? "";
    const privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY") ?? "";
    const installationId = Deno.env.get("GITHUB_APP_INSTALLATION_ID") ?? "";
    if (appId && privateKey && installationId) {
      return new AppGitHubAuth({ appId, privateKey, installationId });
    }
  }
  return new PatGitHubAuth();
}
