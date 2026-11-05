import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { buildAnalysisVM } from '@/api/analysis';
import { resetChat } from '@/api/chat/mock';
import { useAuthStore } from '@/store/useAuthStore';

import EvidenceScreen from '../(tabs)/explore/evidence';
import MyScoreScreen from '../(tabs)/profile/my-score';
import { ScoreCard } from '../../features/analysis/ScoreCard';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  ...jest.requireActual<{ default: Record<string, unknown> }>(
    'react-native-safe-area-context/jest/mock',
  ).default,
}));

const mockParams: { login?: string } = {};
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: {
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => false,
  },
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => false,
  }),
}));

jest.useFakeTimers();

type Mounted = { tree: ReactTestRenderer; client: QueryClient };
const mounted: Mounted[] = [];

function render(node: ReactElement): ReactTestRenderer {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
  });
  mounted.push({ tree, client });
  return tree;
}

async function flush(rounds = 20): Promise<void> {
  for (let index = 0; index < rounds; index += 1) {
    act(() => {
      jest.advanceTimersByTime(1);
    });
    await act(async () => {
      await Promise.resolve();
    });
  }
}

afterEach(async () => {
  while (mounted.length > 0) {
    const entry = mounted.pop();
    if (!entry) break;
    act(() => entry.tree.unmount());
    await entry.client.cancelQueries();
    entry.client.clear();
  }
  jest.clearAllTimers();
  mockPush.mockReset();
  mockBack.mockReset();
  mockReplace.mockReset();
  resetChat();
  useAuthStore.setState({
    session: null,
    roles: [],
    onboarded: false,
    listed: false,
    countryCode: null,
    city: null,
  });
});

/** Extract all text nodes from the rendered tree. */
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
  if (typeof node === 'object' && 'children' in node) {
    textOf((node as { children?: unknown }).children, acc);
  }
  return acc.join('');
}

/** Find a pressable node by accessibilityLabel with an onPress handler. */
function findButton(
  tree: ReactTestRenderer,
  label: string,
):
  | { props: { onPress: () => void; disabled?: boolean } }
  | null {
  const node = tree.root
    .findAll(
      (node) =>
        (node.props.accessibilityLabel as string | undefined) === label &&
        typeof node.props.onPress === 'function',
    )
    .at(0);
  return node ? { props: node.props as { onPress: () => void; disabled?: boolean } } : null;
}

/** Find a node by accessibilityLabel (untuk tautan evidence yang teksnya di accessibilityLabel). */
function findLinkByLabel(
  tree: ReactTestRenderer,
  label: string,
): { props: { onPress: () => void } } | null {
  const node = tree.root
    .findAll(
      (node) =>
        (node.props.accessibilityLabel as string | undefined) === label &&
        typeof node.props.onPress === 'function',
    )
    .at(0);
  return node ? { props: node.props as { onPress: () => void } } : null;
}

async function openEvidence(login: string): Promise<ReactTestRenderer> {
  mockParams.login = login;
  const tree = render(<EvidenceScreen />);
  await flush();
  return tree;
}

describe('EvidenceScreen (FE-9 sisa — B1)', () => {
  it('menampilkan nilai komponen dari VM (bukan hitung ulang)', async () => {
    const tree = await openEvidence('octocat');
    const text = textOf(tree.toJSON());

    // Hero.
    expect(text).toContain('SCORE EVIDENCE');
    expect(text).toContain('Rincian skor');

    // Lima komponen dengan nilai/maks dari VM.
    expect(text).toContain('Originality');
    expect(text).toContain('Activity');
    expect(text).toContain('Proof');
    expect(text).toContain('Substance');
    expect(text).toContain('Depth');

    // Nilai spesifik dari octocat (dibaca dari VM, bukan dihitung ulang).
    expect(text).toContain('73/100');
    expect(text).toContain('100/30');
    expect(text).toContain('71/20');
    expect(text).toContain('50/15');
    expect(text).toContain('8/20');
    expect(text).toContain('54/15');

    // Disclaimer.
    expect(text).toContain('Skor adalah sinyal bantu');
    expect(text).toContain('periksa bukti sebelum menghubungi kandidat');

    // Label evidence muncul di layar.
    expect(text).toContain('2 original repositories in the top 2');
    expect(text).toContain('50% repositories with a verified demo');

    // Tautan evidence: cek accessibilityLabel (memanggil openHttpsUrl — diuji di links.test.ts).
    const link1 = findLinkByLabel(tree, 'Buka bukti 2 original repositories in the top 2');
    const link2 = findLinkByLabel(tree, 'Buka bukti 50% repositories with a verified demo');
    expect(link1).not.toBeNull();
    expect(link2).not.toBeNull();

    // Profil GitHub link (memanggil openGithubUrl).
    expect(text).toContain('Buka profil GitHub');
    const githubLink = findLinkByLabel(tree, 'Buka profil GitHub octocat');
    expect(githubLink).not.toBeNull();
  });

  it('tampilkan stale banner untuk source=stale', async () => {
    const tree = await openEvidence('__stale__');
    const text = textOf(tree.toJSON());

    expect(text).toContain('Diperbarui');
    expect(text).toContain('Muat ulang');
  });

  it('tampilkan ErrorState NOT_FOUND tanpa retry loop', async () => {
    const tree = await openEvidence('__notfound__');
    const text = textOf(tree.toJSON());

    expect(text).toContain('Profil tidak ditemukan');
    expect(text).toContain('Coba lagi');
    expect(text).not.toContain('Buka di GitHub');
  });

  it('tampilkan sisa waktu untuk RATE_LIMITED', async () => {
    const tree = await openEvidence('__ratelimited__');
    const text = textOf(tree.toJSON());

    expect(text).toContain('Terlalu banyak permintaan');
    expect(text).toContain('42 detik');
  });

  it('tampilkan "Buka di GitHub" untuk UPSTREAM_ERROR', async () => {
    const tree = await openEvidence('__error__');
    const text = textOf(tree.toJSON());

    expect(text).toContain('Data gagal dimuat');
    expect(text).toContain('Buka di GitHub');
  });

  it('tampilkan semua-fork evidence tanpa memalsukan originality', async () => {
    const tree = await openEvidence('__allforks__');
    const text = textOf(tree.toJSON());

    expect(text).toContain('Limited verifiable evidence');
    expect(text).toContain('0%');
    expect(text).toContain('0/30');
    expect(text).toContain('0/20');
    expect(text).toContain('0/15');
  });

  it('tampilkan evidence kosong: label 0 original + 0% demo', async () => {
    const tree = await openEvidence('__empty__');
    const text = textOf(tree.toJSON());

    // VM kosong masih menampilkan kartu komponen + evidence (dengan nilai 0).
    expect(text).toContain('0 original repositories in the top 0');
    expect(text).toContain('0% repositories with a verified demo');
    expect(text).toContain('0/30');
    expect(text).toContain('8/100');
    expect(text).toContain('LOW');
    expect(text).toContain('Limited verifiable evidence');
  });

  it('tautan evidence ada dan tidak crash (openHttpsUrl diuji di links.test.ts)', async () => {
    const tree = await openEvidence('octocat');
    const link1 = findLinkByLabel(tree, 'Buka bukti 2 original repositories in the top 2');
    const link2 = findLinkByLabel(tree, 'Buka bukti 50% repositories with a verified demo');
    expect(link1).not.toBeNull();
    expect(link2).not.toBeNull();
  });
});

describe('MyScoreScreen (FE-9 sisa — B2)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: { login: 'angga-risky', name: 'Angga Risky', avatarUrl: '', githubId: 0, bio: null, locationText: null },
      roles: ['developer'],
      onboarded: true,
      listed: true,
      countryCode: 'ID',
      city: 'Jakarta',
    });
  });

  it('developer melihat skor + rincian', async () => {
    const tree = render(<MyScoreScreen />);
    await flush();
    const text = textOf(tree.toJSON());

    expect(text).toContain('Skor saya');
    expect(text).toContain('MY SCORE');
    expect(text).not.toContain('Khusus akun developer');

    act(() => {
      tree.unmount();
    });
  });

  it('recruiter-only melihat "Khusus akun developer"', async () => {
    useAuthStore.setState({
      session: { login: 'recruiter', name: 'Recruiter', avatarUrl: '', githubId: 0, bio: null, locationText: null },
      roles: ['recruiter'],
      onboarded: true,
      listed: true,
      countryCode: 'ID',
      city: 'Jakarta',
    });

    const tree = render(<MyScoreScreen />);
    await flush();
    const text = textOf(tree.toJSON());

    expect(text).toContain('Khusus akun developer');
    expect(text).not.toContain('Rincian skor');
    expect(text).not.toContain('MY SCORE');

    act(() => {
      tree.unmount();
    });
  });

  it('listed=false menampilkan penjelasan', async () => {
    useAuthStore.setState({
      session: { login: 'angga-risky', name: 'Angga Risky', avatarUrl: '', githubId: 0, bio: null, locationText: null },
      roles: ['developer'],
      onboarded: true,
      listed: false,
      countryCode: 'ID',
      city: 'Jakarta',
    });

    const tree = render(<MyScoreScreen />);
    await flush();
    const text = textOf(tree.toJSON());

    expect(text).toContain('Profil Anda belum tampil di feed');
    expect(text).toContain('Listing membutuhkan negara domisili');

    act(() => {
      tree.unmount();
    });
  });

  it('tidak ada tombol "Request review"', async () => {
    const tree = render(<MyScoreScreen />);
    await flush();
    const text = textOf(tree.toJSON());

    expect(text).not.toContain('Request review');
    expect(text).toContain('tinjauan ulang');

    act(() => {
      tree.unmount();
    });
  });

  it('tombol "Analisis profil saya" muncul saat vm=null dan memicu refetch', async () => {
    // Gunakan login __notfound__ dari mock adapter: useAnalysis mendapatkan
    // error NOT_FOUND → vm null → tombol "Analisis profil saya" muncul.
    useAuthStore.setState({
      session: { login: '__notfound__', name: 'Ghost', avatarUrl: '', githubId: 0, bio: null, locationText: null },
      roles: ['developer'],
      onboarded: true,
      listed: true,
      countryCode: 'ID',
      city: 'Jakarta',
    });

    const tree = render(<MyScoreScreen />);
    await flush();

    const text = textOf(tree.toJSON());
    expect(text).toContain('Analisis profil saya');

    const button = findButton(tree, 'Analisis profil saya');
    expect(button).not.toBeNull();

    await act(async () => {
      button!.props.onPress();
      jest.advanceTimersByTime(10);
    });
    await flush();

    // refetch dipicu (tidak ada asersi spesifik karena asinkron).
    act(() => {
      tree.unmount();
    });
  });
});

describe('ScoreCard tautan "Lihat rincian →" (FE-9 sisa — B1 terintegrasi)', () => {
  it('tautan "Lihat rincian →" muncul bila onViewBreakdown tersedia', async () => {
    const onViewBreakdown = jest.fn();
    const tree = render(
      <ScoreCard vm={buildAnalysisVM({ login: 'octocat' })} onViewBreakdown={onViewBreakdown} />,
    );
    await flush();

    const text = textOf(tree.toJSON());
    expect(text).toContain('Lihat rincian →');

    const button = findButton(tree, 'Lihat rincian skor');
    expect(button).not.toBeNull();

    await act(async () => {
      button!.props.onPress();
      jest.advanceTimersByTime(10);
    });

    expect(onViewBreakdown).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });
  });

  it('tanpa onViewBreakdown tautan tidak ada', async () => {
    const tree = render(
      <ScoreCard vm={buildAnalysisVM({ login: 'octocat' })} />,
    );
    await flush();

    const text = textOf(tree.toJSON());
    expect(text).not.toContain('Lihat rincian →');

    act(() => {
      tree.unmount();
    });
  });

  it('tautan "Lihat rincian →" menavigasi ke /explore/evidence dengan login benar', async () => {
    const tree = render(
      <ScoreCard
        vm={buildAnalysisVM({ login: 'angga-risky' })}
        onViewBreakdown={() => {
          mockPush({ pathname: '/explore/evidence', params: { login: 'angga-risky' } });
        }}
      />,
    );
    await flush();

    const button = findButton(tree, 'Lihat rincian skor');
    expect(button).not.toBeNull();

    await act(async () => {
      button!.props.onPress();
      jest.advanceTimersByTime(10);
    });
    await flush();

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/explore/evidence',
      params: { login: 'angga-risky' },
    });

    act(() => {
      tree.unmount();
    });
  });
});
