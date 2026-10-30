import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { useAppStore } from '../useAppStore';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

/**
 * FE-2 — the store keeps *UI state* only. Analysis results are TanStack Query
 * data keyed by login; nothing about them is written back here.
 */
describe('analysis UI state', () => {
  it('keeps the bookmark, chat slot and notice out of the query cache', () => {
    const store = useAppStore.getState();

    expect(store.saved).toBe(false);

    // FR-A2 — bookmark toggle is pure UI state.
    store.setSaved(true);
    expect(useAppStore.getState().saved).toBe(true);

    // FR-A3 — Message opens the chat slot without any UI.
    store.openChat('', {
      login: 'octocat',
      name: 'The Octocat',
      avatar_url: 'https://github.com/octocat.png',
      bio: null,
      followers: 0,
      following: 0,
      public_repos: 8,
      location: null,
      html_url: 'https://github.com/octocat',
    });
    expect(useAppStore.getState().chat).toMatchObject({ open: true, project: '' });

    // FR-A8 — Discuss carries the repo name as context.
    store.openChat('Spoon-Knife');
    expect(useAppStore.getState().chat).toMatchObject({ open: true, project: 'Spoon-Knife' });

    // FR-A3 — Export report sets the notice string.
    store.showNotice('PDF report berhasil dibuat');
    expect(useAppStore.getState().notice).toBe('PDF report berhasil dibuat');
  });

  it('has no analysis-result slots left', () => {
    const state = useAppStore.getState() as unknown as Record<string, unknown>;
    expect(state.analysisTarget).toBeUndefined();
    expect(state.analysisVm).toBeUndefined();
    expect(state.analysisOverride).toBeUndefined();
    expect(state.setAnalysisTarget).toBeUndefined();
    expect(state.user).toBeUndefined();
    expect(state.repos).toBeUndefined();
  });
});
