import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { useAuthStore, type AuthSession } from '../useAuthStore';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const SESSION: AuthSession = {
  login: 'octocat',
  name: 'Octo Cat',
  avatarUrl: 'https://github.com/octocat.png?size=128',
  githubId: 583231,
  bio: null,
  locationText: null,
};

const reset = () => useAuthStore.getState().deleteAccount();

/**
 * R1 (PRD v2 §6, §11A) — mock session, onboarding peran, dan guard privasi:
 * POL-1/POL-9 (listing butuh negara), POL-4 (open_to_messages eksplisit),
 * §11A (target negara recruiter, kosong = semua).
 */
describe('auth store (R1)', () => {
  beforeEach(reset);

  it('starts signed out with no roles and listing disabled', () => {
    const s = useAuthStore.getState();
    expect(s.session).toBeNull();
    expect(s.roles).toEqual([]);
    expect(s.onboarded).toBe(false);
    expect(s.listed).toBe(false);
    expect(s.openToMessages).toBe(false);
    expect(s.targetCountries).toEqual([]);
  });

  it('signs in and completes onboarding only with a session and roles', () => {
    const store = useAuthStore.getState();

    // Tanpa sesi, onboarding tidak bisa diselesaikan.
    store.completeOnboarding();
    expect(useAuthStore.getState().onboarded).toBe(false);

    store.signIn(SESSION);
    store.completeOnboarding(); // belum ada role
    expect(useAuthStore.getState().onboarded).toBe(false);

    useAuthStore.getState().setRoles(['developer', 'recruiter']);
    useAuthStore.getState().completeOnboarding();
    expect(useAuthStore.getState().onboarded).toBe(true);
    expect(useAuthStore.getState().session?.login).toBe('octocat');
  });

  it('enforces POL-9: listing requires a residence country', () => {
    const store = () => useAuthStore.getState();

    // Belum ada negara → listed dipaksa false.
    store().setListed(true);
    expect(store().listed).toBe(false);

    // Negara dipilih → sumber 'self' (otoritatif) dan listing boleh aktif.
    store().setResidence({ countryCode: 'ID', city: 'Bandung' });
    expect(store().countryCode).toBe('ID');
    expect(store().countrySource).toBe('self');
    expect(store().city).toBe('Bandung');
    store().setListed(true);
    expect(store().listed).toBe(true);

    // Negara dicabut → listing otomatis mati (POL-9).
    store().setResidence({ countryCode: null });
    expect(store().countryCode).toBeNull();
    expect(store().countrySource).toBeNull();
    expect(store().listed).toBe(false);
  });

  it('keeps open_to_messages explicit (POL-4 default false)', () => {
    expect(useAuthStore.getState().openToMessages).toBe(false);
    useAuthStore.getState().setOpenToMessages(true);
    expect(useAuthStore.getState().openToMessages).toBe(true);
  });

  it('stores recruiter profile and target countries (§11A, empty = all)', () => {
    const store = () => useAuthStore.getState();

    store().setRoles(['recruiter']);
    store().setRecruiterProfile({ company: 'PT Talenta Global', title: 'Recruiter' });
    expect(store().company).toBe('PT Talenta Global');
    expect(store().title).toBe('Recruiter');

    expect(store().targetCountries).toEqual([]); // default = semua negara
    store().setTargetCountries(['ID', 'SG']);
    expect(store().targetCountries).toEqual(['ID', 'SG']);
    store().setTargetCountries([]);
    expect(store().targetCountries).toEqual([]);
  });

  it('signOut clears only the session; deleteAccount resets everything', () => {
    const store = () => useAuthStore.getState();

    store().signIn(SESSION);
    store().setRoles(['developer']);
    store().setResidence({ countryCode: 'ID', city: 'Jakarta' });
    store().setListed(true);
    store().completeOnboarding();

    store().signOut();
    expect(store().session).toBeNull();
    expect(store().onboarded).toBe(false);
    // Pengaturan akun tidak hilang saat logout (sesi yang dihapus, bukan data).
    expect(store().countryCode).toBe('ID');
    expect(store().roles).toEqual(['developer']);

    store().deleteAccount();
    expect(store().session).toBeNull();
    expect(store().roles).toEqual([]);
    expect(store().countryCode).toBeNull();
    expect(store().city).toBeNull();
    expect(store().company).toBe('');
    expect(store().targetCountries).toEqual([]);
    expect(store().listed).toBe(false);
  });
});
