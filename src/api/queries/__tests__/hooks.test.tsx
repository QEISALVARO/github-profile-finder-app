import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { createQueryClient } from '@/api/queries/client';
import { useAnalysis, useAnalyze, useConversations, useFeed, useDiscover, useMessages, useSendMessage } from '@/api/queries';
import { resetChat } from '@/api/chat/mock';
import { resetPipeline } from '@/api/talent/mock';
import { useAppStore } from '@/store/useAppStore';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

/**
 * FE-2 gate — the query hooks must work behind a `QueryClientProvider` and
 * stay ignorant of which adapter (`mock` | `api`) answered.
 */

const DEFAULT_FEED_FILTERS = {
  query: '',
  role: 'All',
  location: 'All locations',
  recentOnly: false,
};

/** Let the microtask queue and react-query's effects settle. */
async function flush(rounds = 6): Promise<void> {
  for (let index = 0; index < rounds; index += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

type HookHandle<T, P> = {
  readonly current: T;
  rerender: (next: P) => Promise<void>;
  unmount: () => void;
};

async function renderHook<T, P>(useHook: (props: P) => T, initialProps: P): Promise<HookHandle<T, P>> {
  const client = createQueryClient();
  const props = { current: initialProps };
  const ref: { current: T } = { current: undefined as unknown as T };

  function Probe() {
    ref.current = useHook(props.current);
    return null;
  }

  const element = () =>
    createElement(QueryClientProvider, { client }, createElement(Probe));

  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(element());
  });
  await flush();

  return {
    get current() {
      return ref.current;
    },
    rerender: async (next: P) => {
      props.current = next;
      await act(async () => {
        root.update(element());
      });
      await flush();
    },
    unmount: () => {
      root.unmount();
    },
  };
}

beforeEach(() => {
  resetChat();
  resetPipeline();
  useAppStore.setState({ loadingId: null, analysisTarget: { login: null } });
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_DS_FEED;
  delete process.env.EXPO_PUBLIC_DS_ANALYSIS;
});

describe('useFeed', () => {
  it('resolves a FeedPage without touching the network', async () => {
    const feed = await renderHook(useFeed, DEFAULT_FEED_FILTERS);

    expect(feed.current.isPending).toBe(false);
    expect(feed.current.isError).toBe(false);
    expect(feed.current.data?.items).toHaveLength(4);
    expect(feed.current.data?.nextCursor).toBeNull();
    expect(feed.current.data?.totalCount).toBe(4);

    feed.unmount();
  });

  it('re-filters as the query changes and keeps the previous page meanwhile', async () => {
    const feed = await renderHook(useFeed, DEFAULT_FEED_FILTERS);
    expect(feed.current.data?.items).toHaveLength(4);

    await feed.rerender({ ...DEFAULT_FEED_FILTERS, query: 'flutter' });
    expect(feed.current.data?.items.map((item) => item.name)).toEqual(['Nusa Commerce']);

    await feed.rerender({ ...DEFAULT_FEED_FILTERS, query: 'Golang' });
    expect(feed.current.data?.items).toHaveLength(0);

    feed.unmount();
  });

  it('surfaces a readable error when the domain is switched to api', async () => {
    process.env.EXPO_PUBLIC_DS_FEED = 'api';
    const feed = await renderHook(useFeed, DEFAULT_FEED_FILTERS);

    expect(feed.current.isError).toBe(true);
    expect(feed.current.error).toBeInstanceOf(Error);
    expect((feed.current.error as Error).message).toMatch(/belum diimplementasikan/);

    feed.unmount();
  });
});

describe('useAnalysis', () => {
  it('returns the octocat VM by default (PRD §7.2 AC)', async () => {
    const analysis = await renderHook(useAnalysis, { login: null });

    expect(analysis.current.isLoading).toBe(false);
    expect(analysis.current.error).toBeNull();
    expect(analysis.current.vm?.user.login).toBe('octocat');
    expect(analysis.current.vm?.authenticity).toBe(73);
    expect(analysis.current.isStale).toBe(false);

    analysis.unmount();
  });

  it('shows an error instead of crashing in api mode', async () => {
    process.env.EXPO_PUBLIC_DS_ANALYSIS = 'api';
    const analysis = await renderHook(useAnalysis, { login: null });

    expect(analysis.current.vm).toBeNull();
    expect(analysis.current.error?.message).toMatch(/belum diimplementasikan/);

    analysis.unmount();
  });
});

describe('useAnalyze (D2 — card spinner, cached target)', () => {
  it('warms the cache for the tapped developer', async () => {
    const feed = await renderHook(useFeed, DEFAULT_FEED_FILTERS);
    const item = feed.current.data!.items[0];
    feed.unmount();

    const analysis = await renderHook(useAnalyze, undefined as never);
    await act(async () => {
      await analysis.current({ login: item.developer.login, person: null, project: item }, item.id);
    });
    analysis.unmount();

    expect(useAppStore.getState().analysisTarget.project?.id).toBe(item.id);
    expect(useAppStore.getState().loadingId).toBeNull();

    const screen = await renderHook(useAnalysis, {
      login: item.developer.login,
      person: null,
      project: item,
    });
    expect(screen.current.vm?.user.login).toBe(item.developer.login);
    expect(screen.current.vm?.repos[0].name).toBe(item.name);
    screen.unmount();
  });
});

describe('useDiscover / usePipeline', () => {
  it('resolves the default four candidates', async () => {
    const discover = await renderHook(useDiscover, {
      role: 'All roles',
      minScore: 85,
      countries: [],
    });

    expect(discover.current.isError).toBe(false);
    expect(discover.current.data?.items.map((item) => item.score)).toEqual([96, 94, 91, 89]);

    discover.unmount();
  });
});

describe('useConversations / useMessages / useSendMessage', () => {
  it('loads the seeded threads and keeps a sent message across re-reads', async () => {
    const conversations = await renderHook(useConversations, undefined as never);
    const threads = conversations.current.data!;
    expect(threads).toHaveLength(3);
    const target = threads.find((entry) => entry.contextLabel === 'Spoon-Knife')!;
    conversations.unmount();

    const thread = await renderHook(
      (id: string) => ({ messages: useMessages(id), send: useSendMessage() }),
      target.id,
    );

    const before = thread.current.messages.data!;
    expect(before.at(-1)?.body).toBe('Tentu, arsitekturnya menggunakan...');

    await act(async () => {
      thread.current.send.mutate({ conversationId: target.id, body: '  Halo dari recruiter  ' });
    });
    await flush();

    // Whitespace-only bodies are rejected by the adapter contract.
    await act(async () => {
      thread.current.send.mutate({ conversationId: target.id, body: '   ' });
    });
    await flush();

    const after = thread.current.messages.data!;
    expect(after.at(-1)?.body).toBe('Halo dari recruiter');
    expect(after).toHaveLength(before.length + 1);

    thread.unmount();

    // Re-opening the sheet reads the same in-memory store.
    const reopened = await renderHook(useMessages, target.id);
    expect(reopened.current.data?.at(-1)?.body).toBe('Halo dari recruiter');
    reopened.unmount();
  });
});
