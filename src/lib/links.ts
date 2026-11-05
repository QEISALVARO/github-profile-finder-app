import { Linking } from 'react-native';

// ---------------------------------------------------------------------------
// PRD §10 (Keamanan) — external links are only opened for the github.com
// domain over https. Anything else is rejected and nothing is opened.
// ---------------------------------------------------------------------------

const ALLOWED_HOSTS = new Set(['github.com', 'www.github.com']);

/** Opens a GitHub URL after validating it's https://github.com/... */
export function openGithubUrl(url: string): boolean {
  return openHttpsUrl(url, ALLOWED_HOSTS);
}

/**
 * Opens an HTTPS URL after validating against an allowlist of hosts.
 * Returns true when the URL was handed to `Linking.openURL`.
 */
export function openHttpsUrl(url: string, allowedHosts?: Iterable<string>): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  const hosts = allowedHosts ?? ALLOWED_HOSTS;
  if (!Array.from(hosts).some((h) => parsed.hostname.toLowerCase().endsWith(h.toLowerCase()))) {
    return false;
  }

  Linking.openURL(url).catch(() => {
    // No handler available (e.g. simulator without a browser) — stay silent.
  });
  return true;
}
