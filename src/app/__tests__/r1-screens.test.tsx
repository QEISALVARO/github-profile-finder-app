import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import type { ReactElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useAuthStore, type AuthSession } from '@/store/useAuthStore';

import WelcomeScreen from '../welcome';
import OnboardingScreen from '../onboarding';
import ProfileScreen from '../(tabs)/profile/index';
import SettingsScreen from '../(tabs)/profile/settings';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Timer animasi (Switch, Avatar transition) tidak boleh menembus teardown
// environment Jest — lihat react-native jest preset setup.
jest.useFakeTimers();

jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  ...jest.requireActual<{ default: Record<string, unknown> }>(
    'react-native-safe-area-context/jest/mock',
  ).default,
}));

// supabase-js butuh WebSocket native (Node 22+) sementara CI memakai Node 20:
// layar welcome merender rantai auth → supabase client, jadi modul client
// diganti stub global (src/lib/__mocks__/supabase.ts); `jest.mock` eksplisit
// di sini memastikan mock dipakai sebelum rantai impor dievaluasi.
jest.mock('@/lib/supabase');

/**
 * R1 (PRD v2 §15) — smoke test render empat layar baru + satu interaksi
 * wizard. Tujuannya menangkap crash runtime (komponen/style tak terdefinisi)
 * tanpa perangkat; guard kebijakan (POL-*) diuji di store test-nya.
 */

const SESSION: AuthSession = {
  login: 'octocat',
  name: 'Octo Cat',
  avatarUrl: 'https://github.com/octocat.png?size=128',
  githubId: 583231,
  bio: null,
  locationText: null,
};

const mounted: ReactTestRenderer[] = [];

function render(node: ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  mounted.push(tree);
  return tree;
}

afterEach(() => {
  while (mounted.length > 0) {
    const tree = mounted.pop();
    act(() => tree?.unmount());
  }
  useAuthStore.getState().deleteAccount();
});

/** Kumpulkan semua string di tree (React memecah teks jadi banyak child). */
function textOf(node: unknown, acc: string[] = []): string {
  if (node == null) return acc.join('');
  if (Array.isArray(node)) {
    node.forEach((child) => textOf(child, acc));
    return acc.join('');
  }
  if (typeof node === 'string') {
    acc.push(node);
    return acc.join('');
  }
  const container = node as { children?: unknown };
  if (container.children) textOf(container.children, acc);
  return acc.join('');
}

/** Tekan tombol berdasarkan accessibilityLabel (interaksi nyata lewat props). */
function press(tree: ReactTestRenderer, label: string): void {
  const target = tree.root
    .findAll((n) => (n.props.accessibilityLabel as string | undefined) === label)
    .find((n) => typeof n.props.onPress === 'function');
  if (!target) throw new Error(`Tombol "${label}" tidak ditemukan`);
  act(() => {
    target.props.onPress();
  });
}

describe('R1 screens render', () => {
  it('renders the Welcome screen with the GitHub CTA and policy notes', () => {
    const tree = render(<WelcomeScreen />);
    const text = textOf(tree.toJSON());
    expect(text).toContain('Discover talent through work.');
    expect(text).toContain('Continue with GitHub');
    expect(text).toContain('18+');
    expect(text).toContain('POL-1');
  });

  it('renders the onboarding role step before roles are chosen', () => {
    useAuthStore.getState().signIn(SESSION);
    const tree = render(<OnboardingScreen />);
    const text = textOf(tree.toJSON());
    expect(text).toContain('Siapa Anda?');
    expect(text).toContain('Saya Developer');
    expect(text).toContain('Saya Recruiter');
    expect(text).toContain('STEP 1 / 1');
  });

  it('advances to the developer form when Lanjut is pressed', () => {
    const store = useAuthStore.getState();
    store.signIn(SESSION);
    store.setRoles(['developer']);

    const tree = render(<OnboardingScreen />);
    expect(textOf(tree.toJSON())).toContain('STEP 1 / 2');

    press(tree, 'Lanjut');

    const text = textOf(tree.toJSON());
    expect(text).toContain('STEP 2 / 2');
    expect(text).toContain('NEGARA DOMISILI');
    expect(text).toContain('Tampil di Feed & Discover');
    expect(text).toContain('Buka untuk pesan recruiter');
    expect(text).toContain('KETERSEDIAAN');
  });

  it('blocks Continue on an empty role selection', () => {
    useAuthStore.getState().signIn(SESSION);
    const tree = render(<OnboardingScreen />);
    press(tree, 'Lanjut');
    expect(textOf(tree.toJSON())).toContain('Pilih minimal satu peran');
    expect(useAuthStore.getState().onboarded).toBe(false);
  });

  it('renders the Profile screen for the signed-in account (PRD v2 §13)', () => {
    const store = useAuthStore.getState();
    store.signIn(SESSION);
    store.setRoles(['developer', 'recruiter']);
    const tree = render(<ProfileScreen />);
    const text = textOf(tree.toJSON());
    expect(text).toContain('Octo Cat');
    expect(text).toContain('@octocat · GitHub connected');
    expect(text).toContain('DEVELOPER · RECRUITER');
    expect(text).toContain('GitHub API connected');
    expect(text).toContain('Reports');
    expect(text).toContain('Shortlisted');
    expect(text).toContain('Interviews');
    expect(text).toContain('Skor adalah sinyal bantu');
  });

  it('renders Settings with developer + recruiter sections and account actions', () => {
    const store = useAuthStore.getState();
    store.signIn(SESSION);
    store.setRoles(['developer', 'recruiter']);
    store.setResidence({ countryCode: 'ID', city: 'Bandung' });
    const tree = render(<SettingsScreen />);
    const text = textOf(tree.toJSON());
    expect(text).toContain('VISIBILITAS & PESAN');
    expect(text).toContain('LOKASI DOMISILI');
    expect(text).toContain('PROFIL RECRUITER');
    // Target awal = semua negara (§11A) — "NEGARA TUJUAN" hanya di dalam sheet.
    expect(text).toContain('All countries');
    expect(text).not.toContain('NEGARA TUJUAN');
    expect(text).toContain('Hapus akun');
    expect(text).toContain('Keluar dari akun');
    // POL-9 — negara terisi, jadi label negara tampil.
    expect(text).toContain('Indonesia');
    // Kota tampil sebagai value TextInput (prop, bukan child teks).
    expect(JSON.stringify(tree.toJSON())).toContain('Bandung');
  });

  it('renders Settings without the developer section for recruiters', () => {
    const store = useAuthStore.getState();
    store.signIn(SESSION);
    store.setRoles(['recruiter']);
    const tree = render(<SettingsScreen />);
    const text = textOf(tree.toJSON());
    expect(text).not.toContain('VISIBILITAS & PESAN');
    expect(text).toContain('PROFIL RECRUITER');
    expect(text).toContain('All countries');
    // "NEGARA TUJUAN" hanya ada di dalam sheet yang belum dibuka.
    expect(text).not.toContain('NEGARA TUJUAN');
  });
});
