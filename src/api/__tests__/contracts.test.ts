import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { AnalysisVM } from '@contracts/analysis';
import { Conversation, Message } from '@contracts/chat';
import { FeedPage } from '@contracts/feed';
import { DiscoverPage, PipelineEntry } from '@contracts/talent';

import { analysisAdapter, buildAnalysisVM } from '@/api/analysis';
import { getChatAdapter } from '@/api/chat';
import { CURRENT_USER_ID, resetChat } from '@/api/chat/mock';
import { feedAdapter } from '@/api/feed';
import { reportsAdapter } from '@/api/reports';
import { resetReports } from '@/api/reports/mock';
import { talentAdapter } from '@/api/talent';
import { resetPipeline } from '@/api/talent/mock';
import { candidates, fallbackRepos, fallbackUser, feedProjects } from '@/data/seed';
import { getDataSource, DATA_SOURCE_ENV, DOMAINS, type DomainKey } from '@/config/dataSource';
import { DEFAULT_TALENT_FILTERS, filterCandidates, toggleCompare } from '@/lib/talent';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

/**
 * FE-2 gate — every mock adapter's output must satisfy the SP-0 zod schemas,
 * and mock mode must never touch the network. Also covers the "flip a domain
 * to `api`" path: it has to fail with a readable error, not a crash.
 */

const DEFAULT_FEED_FILTERS = { query: '', role: 'All', location: 'All locations', recentOnly: false };

const fetchSpy = jest.fn();

beforeAll(() => {
  // Any network attempt in mock mode shows up here.
  (globalThis as { fetch?: unknown }).fetch = fetchSpy;
});

beforeEach(() => {
  fetchSpy.mockClear();
  resetChat();
  resetPipeline();
  resetReports();
});

afterAll(() => {
  delete (globalThis as { fetch?: unknown }).fetch;
});

describe('dataSource flags', () => {
  it('defaults every domain to mock', () => {
    for (const domain of DOMAINS) {
      expect(getDataSource(domain)).toBe('mock');
    }
  });

  it('falls back to mock for an unknown value instead of crashing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.EXPO_PUBLIC_DS_FEED = 'banana';
    try {
      expect(getDataSource('feed')).toBe('mock');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(DATA_SOURCE_ENV.feed));
    } finally {
      delete process.env.EXPO_PUBLIC_DS_FEED;
      warn.mockRestore();
    }
  });
});

describe('feed mock adapter → FeedPage', () => {
  it('parses against the contract', async () => {
    const page = await feedAdapter.fetchPage(DEFAULT_FEED_FILTERS);
    expect(() => FeedPage.parse(page)).not.toThrow();
    expect(page.items).toHaveLength(feedProjects.length);
    expect(page.nextCursor).toBeNull();
    expect(page.totalCount).toBe(page.items.length);
  });

  it('applies the PRD §7.1 filters identically to lib/feed', async () => {
    const flutter = await feedAdapter.fetchPage({ ...DEFAULT_FEED_FILTERS, query: 'flutter' });
    expect(flutter.items.map((item) => item.name)).toEqual(['Nusa Commerce']);

    const mobile = await feedAdapter.fetchPage({
      ...DEFAULT_FEED_FILTERS,
      role: 'Mobile',
      location: 'Jakarta',
    });
    expect(mobile.items.map((item) => item.name)).toEqual(['Nusa Commerce']);

    const pythonMl = await feedAdapter.fetchPage({ ...DEFAULT_FEED_FILTERS, query: 'Python ML' });
    expect(pythonMl.items).toHaveLength(0);
  });
});

describe('analysis mock adapter → AnalysisVM', () => {
  it('parses the default (octocat) VM against the contract', async () => {
    const vm = await analysisAdapter.fetchAnalysis({ login: null });
    expect(() => AnalysisVM.parse(vm)).not.toThrow();
    expect(vm.user.login).toBe('octocat');
    // PRD §7.2 AC: originalRatio 100, demoRatio 50, authenticity 73.
    expect(vm.metrics.originalRatio).toBe(100);
    expect(vm.metrics.demoRatio).toBe(50);
    expect(vm.authenticity).toBe(73);
    expect(vm.heatmap).toHaveLength(84);
  });

  it('builds the VM about the tapped feed developer', async () => {
    const page = await feedAdapter.fetchPage(DEFAULT_FEED_FILTERS);
    const item = page.items[0];
    const vm = await analysisAdapter.fetchAnalysis({
      login: item.developer.login,
      person: null,
      project: item,
    });

    expect(() => AnalysisVM.parse(vm)).not.toThrow();
    expect(vm.user.login).toBe(item.developer.login);
    expect(vm.user.name).toBe(item.developer.name);
    // AUTH circle on the card and the ring in Analysis must agree.
    expect(vm.authenticity).toBe(item.score);
    expect(vm.repos[0].name).toBe(item.name);
    expect(vm.repos).toHaveLength(1);
  });

  it('carries the PRD §5.4 Compare numbers for candidates', async () => {
    const sindre = candidates.find((entry) => entry.login === 'sindresorhus')!;
    const other = candidates.find((entry) => entry.login === 'gaearon')!;

    const a = await analysisAdapter.fetchAnalysis({ login: sindre.login, person: sindre });
    const b = await analysisAdapter.fetchAnalysis({ login: other.login, person: other });

    expect(() => AnalysisVM.parse(a)).not.toThrow();
    expect(() => AnalysisVM.parse(b)).not.toThrow();
    expect(a.authenticity).toBe(sindre.score);
    expect(a.metrics.originalCount).toBe(184);
    expect(a.metrics.streakWeeks).toBe(28);
    expect(b.metrics.originalCount).toBe(72);
    expect(b.metrics.streakWeeks).toBe(19);
    // "184 of 184 repos" — the denominator never contradicts the numerator.
    expect(Math.max(a.repos.length, a.metrics.originalCount)).toBe(a.metrics.originalCount);
  });

  it('builds a VM offline from raw fixtures (dev showcase path)', () => {
    const vm = buildAnalysisVM(fallbackUser, fallbackRepos);
    expect(() => AnalysisVM.parse(vm)).not.toThrow();
    expect(vm.source).toBe('fresh');
  });
});

describe('talent mock adapter → DiscoverPage / Pipeline', () => {
  it('parses discover results against the contract', async () => {
    const page = await talentAdapter.discover(DEFAULT_TALENT_FILTERS);
    expect(() => DiscoverPage.parse(page)).not.toThrow();
    expect(page.items.map((item) => item.score)).toEqual([96, 94, 91, 89]);
    expect(page.totalCount).toBe(4);
    expect(page.nextCursor).toBeNull();
  });

  it('honours role, score and multi-country filters', async () => {
    const strict = await talentAdapter.discover({ role: 'Full-Stack', minScore: 85, countries: [] });
    expect(strict.items.map((item) => item.login)).toEqual(['cassidoo']);

    const sharp = await talentAdapter.discover({ role: 'All roles', minScore: 92, countries: [] });
    expect(sharp.items).toHaveLength(2);

    // POL-9 + §11A: only Oslo matches `NO`.
    const byCountry = await talentAdapter.discover({
      role: 'All roles',
      minScore: 70,
      countries: ['NO'],
    });
    expect(byCountry.items.map((item) => item.login)).toEqual(['sindresorhus']);
  });

  it('parses the seeded pipeline and counts stages', async () => {
    const snapshot = await talentAdapter.pipeline();
    for (const entry of snapshot.entries) {
      expect(() => PipelineEntry.parse(entry)).not.toThrow();
    }
    expect(snapshot.entries).toHaveLength(candidates.length);
  });
});

describe('chat mock adapter → Conversation / Message', () => {
  it('parses the seeded threads against the contract', async () => {
    const conversations = await getChatAdapter().conversations();
    expect(conversations).toHaveLength(3);
    for (const conversation of conversations) {
      expect(() => Conversation.parse(conversation)).not.toThrow();
    }

    const first = conversations.find((entry) => entry.contextLabel === 'Spoon-Knife')!;
    const messages = await getChatAdapter().messages(first.id);
    for (const message of messages) {
      expect(() => Message.parse(message)).not.toThrow();
    }
    expect(messages.at(-1)?.body).toBe('Tentu, arsitekturnya menggunakan...');
  });

  it('reports 3 unread across the seeded threads (FR-I3)', async () => {
    const conversations = await getChatAdapter().conversations();
    const all = await Promise.all(
      conversations.map((conversation) => getChatAdapter().messages(conversation.id)),
    );
    const unread = conversations.reduce(
      (total, conversation, index) =>
        total +
        all[index].filter(
          (message) => message.senderId !== CURRENT_USER_ID && message.readAt === null,
        ).length,
      0,
    );
    expect(unread).toBe(3);
  });

  it('rejects an empty body and persists a sent one', async () => {
    const chat = getChatAdapter();
    const conversation = (await chat.conversations())[0];

    await expect(chat.sendMessage(conversation.id, '   ')).rejects.toThrow();

    const sent = await chat.sendMessage(conversation.id, 'Halo!');
    expect(() => Message.parse(sent)).not.toThrow();

    const messages = await chat.messages(conversation.id);
    expect(messages.at(-1)?.body).toBe('Halo!');
    // Closing/reopening the sheet re-reads the same store.
    expect((await chat.messages(conversation.id)).at(-1)?.body).toBe('Halo!');
  });
});

describe('reports mock adapter', () => {
  it('returns a report record', async () => {
    const report = await reportsAdapter.exportReport({ login: 'octocat', score: 73 });
    expect(report).toMatchObject({ id: 'report-0001', login: 'octocat', score: 73 });
  });
});

describe('mode mock = tanpa jaringan', () => {
  it('never calls fetch while exercising every mock adapter', async () => {
    await feedAdapter.fetchPage(DEFAULT_FEED_FILTERS);
    await analysisAdapter.fetchAnalysis({ login: null });
    await talentAdapter.discover(DEFAULT_TALENT_FILTERS);
    await talentAdapter.pipeline();
    await getChatAdapter().conversations();
    await reportsAdapter.exportReport({ login: 'octocat', score: 73 });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('flag api → pesan error yang jelas, bukan crash', () => {
  const flip = (domain: DomainKey, value: string | undefined) => {
    const key = DATA_SOURCE_ENV[domain];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };

  it.each(DOMAINS)('%s adapter explains it is not implemented', async (domain) => {
    flip(domain, 'api');
    try {
      const run = async (): Promise<unknown> => {
        switch (domain) {
          case 'feed':
            return feedAdapter.fetchPage(DEFAULT_FEED_FILTERS);
          case 'analysis':
            return analysisAdapter.fetchAnalysis({ login: null });
          case 'talent':
            return talentAdapter.discover(DEFAULT_TALENT_FILTERS);
          case 'chat':
            return getChatAdapter().conversations();
          case 'reports':
            return reportsAdapter.exportReport({ login: 'octocat', score: 1 });
          case 'auth':
            return null;
        }
      };

      if (domain === 'auth') return; // auth has no read-only path to exercise

      await expect(run()).rejects.toThrow(/belum diimplementasikan/);
    } finally {
      flip(domain, undefined);
    }
  });
});

describe('pure talent logic (shared with the FE-5 screens)', () => {
  it('keeps at most two compare picks and drops the oldest (FIFO)', () => {
    expect(toggleCompare([], 'a')).toEqual(['a']);
    expect(toggleCompare(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleCompare(['a', 'b'], 'c')).toEqual(['b', 'c']);
    expect(toggleCompare(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('never passes a country-less candidate through an active country filter', () => {
    const noCountry = { ...candidates[0], login: 'ghost', countryCode: null };
    expect(
      filterCandidates([noCountry], { role: 'All roles', minScore: 70, countries: ['NO'] }),
    ).toHaveLength(0);
    expect(
      filterCandidates([noCountry], { role: 'All roles', minScore: 70, countries: [] }),
    ).toHaveLength(1);
  });
});
