import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useSyncSupabaseSession } from '@/providers/useSyncSupabaseSession';
import { useAuthStore, type AuthSession } from '@/store/useAuthStore';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('@/lib/supabase');

// Mock manual (@/lib/__mocks__/supabase.ts) — stub client tanpa WebSocket.
const supabaseMock = jest.requireMock('@/lib/supabase') as {
  supabaseStub: {
    auth: {
      getSession: jest.Mock;
      onAuthStateChange: jest.Mock;
    };
  };
  getSupabase: jest.Mock;
  anyApiDomainEnabled: jest.Mock;
};

const { getSupabase, anyApiDomainEnabled, supabaseStub } = supabaseMock;

type AuthChangeHandler = (event: string, session: unknown) => void;

/** Sesi Supabase mentah (bentuk yang diterima mapSupabaseSession). */
const GITHUB_REMOTE_SESSION = {
  user: {
    id: 'u-1',
    email: null,
    app_metadata: { provider: 'github' },
    user_metadata: {
      user_name: 'octocat',
      provider_id: '583231',
      full_name: 'Octo Cat',
      avatar_url: 'https://github.com/octocat.png?size=128',
    },
  },
};

const GOOGLE_REMOTE_SESSION = {
  user: {
    id: 'u-2',
    email: 'rina@example.com',
    app_metadata: { provider: 'google' },
    user_metadata: { full_name: 'Rina', avatar_url: 'https://x/rina.png' },
  },
};

const GOOGLE_LOCAL_SESSION: AuthSession = {
  login: 'rina',
  name: 'Rina',
  avatarUrl: 'https://x/rina.png',
  githubId: 0,
  bio: null,
  locationText: null,
  provider: 'google',
};

const DEMO_SESSION: AuthSession = {
  login: 'octocat',
  name: 'Octo Cat',
  avatarUrl: 'https://github.com/octocat.png?size=128',
  githubId: 583231,
  bio: 'Akun demo Gitscope.',
  locationText: 'San Francisco',
};

function Harness() {
  useSyncSupabaseSession();
  return null;
}

/** Beri kesempatan rantai promise di effect (`getSupabase().then(...)`) selesai. */
async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

let tree: ReactTestRenderer | null = null;
let unsubscribe: jest.Mock;
let authHandler: AuthChangeHandler | null;

async function mount(): Promise<ReactTestRenderer> {
  await act(async () => {
    tree = create(<Harness />);
  });
  await flush();
  return tree as ReactTestRenderer;
}

async function emitAuthChange(event: string, session: unknown): Promise<void> {
  await act(async () => {
    authHandler?.(event, session);
  });
  await flush();
}

beforeEach(() => {
  jest.clearAllMocks();
  unsubscribe = jest.fn();
  authHandler = null;

  anyApiDomainEnabled.mockReturnValue(true);
  getSupabase.mockImplementation(async () => supabaseStub);
  supabaseStub.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  supabaseStub.auth.onAuthStateChange.mockImplementation((handler: AuthChangeHandler) => {
    authHandler = handler;
    return { data: { subscription: { unsubscribe } } };
  });
});

afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  useAuthStore.getState().deleteAccount();
});

/**
 * FE-2: hook ini satu-satunya jembatan sesi Supabase → useAuthStore. Dalam mode
 * mock total ia harus benar-benar diam; dalam mode api ia harus memetakan cold
 * start dan setiap event auth ke store.
 */
describe('useSyncSupabaseSession — mode mock', () => {
  it('does nothing when every API domain is on mock', async () => {
    anyApiDomainEnabled.mockReturnValue(false);

    await mount();

    expect(getSupabase).not.toHaveBeenCalled();
    expect(useAuthStore.getState().session).toBeNull();
  });
});

describe('useSyncSupabaseSession — cold start', () => {
  it('restores a stored GitHub session into the store', async () => {
    supabaseStub.auth.getSession.mockResolvedValueOnce({
      data: { session: GITHUB_REMOTE_SESSION },
      error: null,
    });

    await mount();

    expect(useAuthStore.getState().session).toMatchObject({
      login: 'octocat',
      githubId: 583231,
      provider: 'github',
    });
  });

  it('restores a Google-only session (githubId 0) so the link gate can render', async () => {
    supabaseStub.auth.getSession.mockResolvedValueOnce({
      data: { session: GOOGLE_REMOTE_SESSION },
      error: null,
    });

    await mount();

    expect(useAuthStore.getState().session).toMatchObject({
      login: 'rina',
      githubId: 0,
      provider: 'google',
    });
  });

  it('leaves the store untouched when there is no stored session', async () => {
    await mount();

    expect(useAuthStore.getState().session).toBeNull();
  });

  it('stays idle when the Supabase client cannot be created', async () => {
    getSupabase.mockRejectedValueOnce(new Error('Missing environment'));

    await mount();

    expect(useAuthStore.getState().session).toBeNull();
  });

  it('skips getSession/subscription when unmounted before the client resolves', async () => {
    let resolveClient!: (value: unknown) => void;
    getSupabase.mockImplementationOnce(
      () => new Promise((resolve) => (resolveClient = resolve)),
    );

    await mount();
    act(() => tree?.unmount());
    tree = null;

    await act(async () => {
      resolveClient(supabaseStub);
    });
    await flush();

    expect(supabaseStub.auth.getSession).not.toHaveBeenCalled();
    expect(supabaseStub.auth.onAuthStateChange).not.toHaveBeenCalled();
  });
});

describe('useSyncSupabaseSession — onAuthStateChange', () => {
  it('signs in when Supabase reports a session', async () => {
    await mount();

    await emitAuthChange('SIGNED_IN', GOOGLE_REMOTE_SESSION);

    expect(useAuthStore.getState().session).toMatchObject({
      login: 'rina',
      provider: 'google',
      githubId: 0,
    });
  });

  it('clears the local session on a remote logout', async () => {
    useAuthStore.getState().signIn(GOOGLE_LOCAL_SESSION);
    await mount();

    await emitAuthChange('SIGNED_OUT', null);

    expect(useAuthStore.getState().session).toBeNull();
  });

  it('keeps the local demo session when Supabase reports no session', async () => {
    useAuthStore.getState().signIn(DEMO_SESSION);
    await mount();

    await emitAuthChange('SIGNED_OUT', null);

    expect(useAuthStore.getState().session).toMatchObject({ login: 'octocat' });
  });

  it('does nothing on a null session when the store is already empty', async () => {
    await mount();

    await emitAuthChange('SIGNED_OUT', null);

    expect(useAuthStore.getState().session).toBeNull();
  });

  it('ignores sessions that map to no supported identity', async () => {
    await mount();

    await emitAuthChange('SIGNED_IN', {
      user: { id: 'u-3', email: 'old@example.com', app_metadata: {}, user_metadata: {} },
    });

    expect(useAuthStore.getState().session).toBeNull();
  });
});

describe('useSyncSupabaseSession — cleanup', () => {
  it('unsubscribes from auth events on unmount', async () => {
    await mount();

    expect(unsubscribe).not.toHaveBeenCalled();
    act(() => tree?.unmount());
    tree = null;

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
