import { Linking } from 'react-native';

import { openGithubUrl } from '../links';

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
