import { Linking } from 'react-native';

// ---------------------------------------------------------------------------
// PRD §10 (Keamanan) — external links are only opened for the github.com
// domain over https. Anything else is rejected and nothing is opened.
// ---------------------------------------------------------------------------

const ALLOWED_HOSTS = new Set(['github.com', 'www.github.com']);

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/** Loopback/private-network literals are never a legitimate project demo. */
function isUnsafeHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  // URL keeps IPv6 literals bracketed (`[::1]`).
  if (host.startsWith('[') && host.endsWith(']')) return true;
  return IPV4.test(host);
}

/** Returns true when the URL was handed to `Linking.openURL`. */
/**
 * B1/C5 — open an external project/evidence link.
 *
 * Only `https:` is accepted; `http:`, `javascript:`, `intent:`, userinfo and
 * IP/localhost hosts are rejected before `Linking` is touched. Returns true
 * only when the URL was handed to the platform.
 */
export function openHttpsUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  if (parsed.username !== '' || parsed.password !== '') return false;
  if (parsed.hostname === '') return false;
  if (isUnsafeHost(parsed.hostname)) return false;

  Linking.openURL(url).catch(() => {
    // No handler available — stay silent, same as `openGithubUrl`.
  });
  return true;
}

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
