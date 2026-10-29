import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { analysisAdapter } from '@/api/analysis';
import { resetChat } from '@/api/chat/mock';
import { useAppStore } from '@/store/useAppStore';

import ExploreScreen from '../(tabs)/explore/index';
import AnalysisScreen from '../(tabs)/explore/analysis';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  ...jest.requireActual<{ default: Record<string, unknown> }>(
    'react-native-safe-area-context/jest/mock',
  ).default,
}));

const mockParams: { login?: string } = {};
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: {
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  },
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
}));

jest.useFakeTimers();

const mounted: ReactTestRenderer[] = [];

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

async function openAnalysis(login: string): Promise<ReactTestRenderer> {
  mockParams.login = login;
  const tree = render(<AnalysisScreen />);
  await flush();
  return tree;
}

describe('Analysis screen states (FE-2)', () => {
  it('renders the skeleton while the VM is loading', async () => {
    mockParams.login = 'octocat';
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

  it('shows the remaining wait for RATE_LIMITED', async () => {
    const tree = await openAnalysis('__ratelimited__');
    const text = textOf(tree.toJSON());

    expect(text).toContain('Terlalu banyak permintaan');
    expect(text).toContain('42 detik');
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
      params: { login: 'angga-risky' },
    });
  });
});
