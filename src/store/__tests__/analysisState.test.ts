import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { useAppStore } from '../useAppStore';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

/**
 * M3b — guards the additive analysis state (PRD §6 / FR-A2, FR-A3, FR-A8).
 * These actions only set state; the ChatSheet and Toast UIs land in M5.
 */
describe('M3b store additions', () => {
  it('exposes the additive actions and only mutates state', () => {
    const store = useAppStore.getState();

    // Defaults from PRD §6 (octocat seed).
    expect(store.user.login).toBe('octocat');
    expect(store.repos).toHaveLength(2);
    expect(store.saved).toBe(false);

    // FR-A3 — Message opens the chat slot without any UI.
    store.openChat('', store.user);
    expect(useAppStore.getState().chat).toEqual({ open: true, project: '', person: store.user });

    // FR-A8 — Discuss opens the chat with the repo name as context.
    store.openChat('Spoon-Knife', store.user);
    expect(useAppStore.getState().chat).toMatchObject({ open: true, project: 'Spoon-Knife' });

    // FR-A3 — Export report sets the notice string.
    store.showNotice('PDF report berhasil dibuat');
    expect(useAppStore.getState().notice).toBe('PDF report berhasil dibuat');

    // FR-A2 — bookmark toggle.
    store.setSaved(true);
    expect(useAppStore.getState().saved).toBe(true);

    // /dev fixtures setters.
    store.setUser({ ...store.user, login: 'fixture-user' });
    store.setRepos([]);
    expect(useAppStore.getState().user.login).toBe('fixture-user');
    expect(useAppStore.getState().repos).toEqual([]);

    // M2's setAnalysisTarget still resets `saved`.
    store.setAnalysisTarget(store.user, store.repos);
    expect(useAppStore.getState().saved).toBe(false);
  });
});
