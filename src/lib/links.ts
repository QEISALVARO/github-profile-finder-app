import { Linking } from 'react-native';

// ---------------------------------------------------------------------------
// PRD §10 (Keamanan) — external links are only opened for the github.com
// domain over https. Anything else is rejected and nothing is opened.
// ---------------------------------------------------------------------------

const ALLOWED_HOSTS = new Set(['github.com', 'www.github.com']);

/** Returns true when the URL was handed to `Linking.openURL`. */
export function openGithubUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) return false;

  Linking.openURL(url).catch(() => {
    // No handler available (e.g. simulator without a browser) — stay silent.
  });
  return true;
}
