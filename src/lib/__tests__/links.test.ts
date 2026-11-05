import { Linking } from 'react-native';

import { openGithubUrl, openHttpsUrl } from '../links';

describe('openGithubUrl — PRD §10 allowlist', () => {
  let openURL: jest.SpyInstance<Promise<void>, [string]>;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    openURL.mockRestore();
  });

  it('opens an https github.com URL', () => {
    expect(openGithubUrl('https://github.com/octocat')).toBe(true);
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith('https://github.com/octocat');
  });

  it.each([
    ['http (non-https)', 'http://github.com/x'],
    ['foreign host', 'https://evil.com'],
    ['look-alike host', 'https://github.com.evil.com'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['malformed string', 'not a url at all'],
  ])('rejects %s without opening anything', (_label, url) => {
    expect(openGithubUrl(url)).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });
});

describe('openHttpsUrl — PRD §10 safe external opener (B1/C5)', () => {
  let openURL: jest.SpyInstance<Promise<void>, [string]>;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    openURL.mockRestore();
  });

  it('opens a plain https URL', () => {
    expect(openHttpsUrl('https://example.com/x')).toBe(true);
    expect(openURL).toHaveBeenCalledWith('https://example.com/x');
  });

  it('rejects http without opening anything', () => {
    expect(openHttpsUrl('http://example.com/x')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('rejects javascript: without opening anything', () => {
    expect(openHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('rejects intent: without opening anything', () => {
    expect(openHttpsUrl('intent://scan#Intent;scheme=https;end')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('rejects userinfo in URL without opening anything', () => {
    expect(openHttpsUrl('https://user:pw@host')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('rejects localhost without opening anything', () => {
    expect(openHttpsUrl('https://localhost')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('rejects 127.0.0.1 without opening anything', () => {
    expect(openHttpsUrl('https://127.0.0.1')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('rejects IPv6 literal [::1] without opening anything', () => {
    expect(openHttpsUrl('https://[::1]')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('rejects 192.168.1.1 (private IP) without opening anything', () => {
    expect(openHttpsUrl('https://192.168.1.1')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('rejects 0x7f.0.0.1 (hex-encoded loopback) without opening anything', () => {
    expect(openHttpsUrl('https://0x7f.0.0.1')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('rejects 2130706433 (decimal-encoded 127.0.0.1) without opening anything', () => {
    expect(openHttpsUrl('https://2130706433')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('rejects a malformed string without opening anything', () => {
    expect(openHttpsUrl('not a url at all')).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });
});
