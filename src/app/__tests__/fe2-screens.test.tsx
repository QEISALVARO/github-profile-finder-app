import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { analysisAdapter } from '@/api/analysis';
import { resetChat } from '@/api/chat/mock';
import { VerifiedRepoCard } from '@/features/analysis/VerifiedRepoCard';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore, type AuthSession } from '@/store/useAuthStore';

import ExploreScreen from '../(tabs)/explore/index';
import AnalysisScreen from '../explore/analysis';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  ...jest.requireActual<{ default: Record<string, unknown> }>(
    'react-native-safe-area-context/jest/mock',
  ).default,
}));

const mockParams: { login?: string; confirmed?: string } = {};

jest.mock('expo-router', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    setParams: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  };
  return {
    useLocalSearchParams: () => mockParams,
    router: mockRouter,
    useRouter: () => mockRouter,
  };
});

const mockPush = router.push as jest.Mock;
const mockReplace = router.replace as jest.Mock;
const mockSetParams = router.setParams as jest.Mock;

jest.useFakeTimers();

const mounted: ReactTestRenderer[] = [];

const RECRUITER_SESSION: AuthSession = {
  login: 'user-abc123',
  name: 'Rina Recruiter',
  avatarUrl: '',
  githubId: 0,
  bio: null,
  locationText: null,
  provider: 'email',
  email: 'rina@company.com',
};

function signInRecruiter() {
  const store = useAuthStore.getState();
  store.signIn(RECRUITER_SESSION);
  store.setRoles(['recruiter']);
  store.completeOnboarding();
}

function signInDeveloper(login = 'dev-owner') {
  const store = useAuthStore.getState();
  store.signIn({
    ...RECRUITER_SESSION,
    login,
    name: 'Developer',
    provider: 'github',
    githubId: 42,
    email: null,
  });
  store.setRoles(['developer']);
  store.completeOnboarding();
}

function render(node: ReactElement): ReactTestRenderer {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
  });
  mounted.push(tree);
  return tree;
}

async function flush(rounds = 8): Promise<void> {
  for (let index = 0; index < rounds; index += 1) {
    await act(async () => {
      // Covers both the microtask queue and TanStack Query's 1 s retry delay.
      jest.advanceTimersByTime(1500);
      await Promise.resolve();
    });
  }
}

afterEach(() => {
  while (mounted.length > 0) {
    const tree = mounted.pop();
    act(() => tree?.unmount());
  }
  mockPush.mockReset();
  mockReplace.mockReset();
  mockSetParams.mockReset();
  mockParams.login = undefined;
  mockParams.confirmed = undefined;
  useAuthStore.getState().deleteAccount();
  resetChat();
});

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

function findButton(tree: ReactTestRenderer, label: string) {
  return tree.root
    .findAll((node) => (node.props.accessibilityLabel as string | undefined) === label)
    .find((node) => typeof node.props.onPress === 'function');
}

async function openAnalysis(
  login: string,
  confirmed = true,
  auth: 'recruiter' | 'none' = 'recruiter',
): Promise<ReactTestRenderer> {
  if (auth === 'recruiter') signInRecruiter();
  mockParams.login = login;
  mockParams.confirmed = confirmed ? '1' : undefined;
  const tree = render(<AnalysisScreen />);
  await flush();
  return tree;
}

describe('Analysis screen states (FE-2)', () => {
  it('renders the skeleton while the VM is loading', async () => {
    signInRecruiter();
    mockParams.login = 'octocat';
    mockParams.confirmed = '1';
    const tree = render(<AnalysisScreen />);

    const skeletons = tree.root.findAllByProps({ accessibilityLabel: 'Memuat' });
    expect(skeletons.length).toBeGreaterThan(0);

    await flush();
  });

  it('renders the fresh VM from the route login', async () => {
    const tree = await openAnalysis('octocat');
    const text = textOf(tree.toJSON());

    expect(text).toContain('Candidate evidence');
    expect(text).toContain('The Octocat');
    expect(text).toContain('73/100');
    expect(text).toContain('Promising signals, verify evidence');
    expect(text).toContain('12 week momentum');
  });

  it('shows the stale banner for source=stale', async () => {
    const tree = await openAnalysis('__stale__');
    const text = textOf(tree.toJSON());

    expect(text).toContain('Diperbarui');
    expect(text).toContain('Muat ulang');
  });

  it('shows NOT_FOUND copy without a retry loop', async () => {
    const tree = await openAnalysis('__notfound__');
    const text = textOf(tree.toJSON());

    expect(text).toContain('Profil tidak ditemukan');
    expect(text).toContain('Coba lagi');
  });

  it('shows a live remaining wait and locks retry for RATE_LIMITED', async () => {
    const tree = await openAnalysis('__ratelimited__');
    const text = textOf(tree.toJSON());

    expect(text).toContain('Terlalu banyak permintaan');
    expect(text).toContain('Batas permintaan tercapai.');
    // Detiknya dihitung live oleh ErrorState, bukan salinan statis yang basi
    // (flush di helper maju belasan detik — angka berapa pun tetap hidup).
    expect(text).toMatch(/Coba lagi dalam \d+ detik\./);

    // Retry terkunci selama jeda masih berjalan.
    const retry = findButton(tree, 'Coba lagi');
    expect(retry).toBeDefined();
    expect(retry!.props.disabled).toBe(true);
    expect(retry!.props.accessibilityState).toEqual({ disabled: true });

    // Setelah jeda lewat, hitung mundur habis dan tombol terbuka kembali.
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(textOf(tree.toJSON())).not.toContain('detik.');
    expect(findButton(tree, 'Coba lagi')!.props.disabled).toBe(false);
  });

  it('offers "Buka di GitHub" for UPSTREAM_ERROR', async () => {
    const tree = await openAnalysis('__error__');
    const text = textOf(tree.toJSON());

    expect(text).toContain('Data gagal dimuat');
    expect(text).toContain('Buka di GitHub');
  });

  it('renders all-forks evidence without inventing originality', async () => {
    const tree = await openAnalysis('__allforks__');
    const text = textOf(tree.toJSON());

    expect(text).toContain('Limited verifiable evidence');
    expect(text).toContain('0%');
  });

  it('states plainly when the profile has no public repositories', async () => {
    const tree = await openAnalysis('__empty__');
    const text = textOf(tree.toJSON());

    expect(text).toContain('No public repositories');
    expect(text).toContain('tidak memiliki repository publik');
    // Muncul tepat di bawah heading PROJECT EVIDENCE, bukan evidence karangan.
    expect(text.indexOf('PROJECT EVIDENCE')).toBeLessThan(
      text.indexOf('No public repositories'),
    );
    expect(tree.root.findAllByType(VerifiedRepoCard)).toHaveLength(0);
  });

  it('redirects an unauthenticated deep link to login with a safe return URL', async () => {
    const spy = jest.spyOn(analysisAdapter, 'fetchAnalysis');

    const tree = await openAnalysis('angga-risky', true, 'none');

    expect(spy).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/login',
      params: { next: '/explore/analysis?login=angga-risky' },
    });
    expect(textOf(tree.toJSON())).toContain('Masuk untuk menganalisis');
    spy.mockRestore();
  });

  it('redirects a deep link without any login to login and never fetches', async () => {
    const spy = jest.spyOn(analysisAdapter, 'fetchAnalysis');

    const tree = await openAnalysis('', true, 'none');
    await flush();

    expect(spy).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/login');
    expect(textOf(tree.toJSON())).toContain('Masuk untuk menganalisis');
    spy.mockRestore();
  });

  it('rejects an invalid username before calling the analysis API', async () => {
    signInRecruiter();
    const spy = jest.spyOn(analysisAdapter, 'fetchAnalysis');

    const tree = await openAnalysis('not a login');

    expect(spy).not.toHaveBeenCalled();
    expect(textOf(tree.toJSON())).toContain('Username tidak valid');
    spy.mockRestore();
  });

  it('waits for candidate confirmation before calling the analysis API', async () => {
    signInRecruiter();
    const spy = jest.spyOn(analysisAdapter, 'fetchAnalysis');

    const tree = await openAnalysis('angga-risky', false);

    expect(spy).not.toHaveBeenCalled();
    expect(textOf(tree.toJSON())).toContain('Konfirmasi kandidat');

    const confirm = findButton(tree, 'Analisis @angga-risky');
    await act(async () => {
      confirm?.props.onPress();
    });
    expect(mockSetParams).toHaveBeenCalledWith({ confirmed: '1' });
    spy.mockRestore();
  });

  it('forbids a developer from analysing another GitHub account', async () => {
    signInDeveloper('dev-owner');
    const spy = jest.spyOn(analysisAdapter, 'fetchAnalysis');

    const tree = await openAnalysis('someone-else', true, 'none');

    expect(spy).not.toHaveBeenCalled();
    expect(textOf(tree.toJSON())).toContain('Akses ditolak');
    spy.mockRestore();
  });

  it('allows a recruiter to analyse a valid candidate after confirmation', async () => {
    signInRecruiter();

    const tree = await openAnalysis('angga-risky');

    const text = textOf(tree.toJSON());
    expect(text).toContain('Candidate evidence');
    expect(text).toContain('Angga');
  });
});

describe('Explore feed Analyze (FE-2)', () => {
  beforeEach(() => {
    useAppStore.setState({ loadingId: null, error: '' });
  });

  it('opens Analysis for the tapped developer and only that card spins', async () => {
    const tree = render(<ExploreScreen />);
    await flush();

    expect(textOf(tree.toJSON())).toContain('Nusa Commerce');

    let resolve!: () => void;
    const pending = new Promise<never>((_r, reject) => {
      resolve = () => reject({ code: 'NOT_FOUND', message: 'x', status: 404 });
    });
    const spy = jest.spyOn(analysisAdapter, 'fetchAnalysis').mockReturnValueOnce(pending as never);

    const first = findButton(tree, 'Analyze Angga Risky');
    expect(first).toBeTruthy();

    await act(async () => {
      first?.props.onPress();
      jest.advanceTimersByTime(10);
    });

    // D2 — the tapped card shows its spinner, every other Analyze is disabled.
    expect(
      tree.root.findAllByProps({ accessibilityLabel: 'Menganalisis Nusa Commerce' }).length,
    ).toBeGreaterThan(0);
    const other = findButton(tree, 'Analyze Ali Shobeiri');
    expect(other?.props.disabled).toBe(true);

    await act(async () => {
      resolve();
      jest.advanceTimersByTime(10);
      await Promise.resolve();
    });
    await flush();

    expect(mockPush).not.toHaveBeenCalled();
    expect(useAppStore.getState().error).toContain('Profil tidak ditemukan');
    expect(textOf(tree.toJSON())).toContain('Profil tidak ditemukan');

    spy.mockRestore();
  });

  it('navigates with the login of the tapped developer on success', async () => {
    const tree = render(<ExploreScreen />);
    await flush();

    const button = findButton(tree, 'Analyze Angga Risky');
    await act(async () => {
      button?.props.onPress();
      jest.advanceTimersByTime(10);
    });
    await flush();

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/explore/analysis',
      params: { login: 'angga-risky', confirmed: '1' },
    });
  });
});
