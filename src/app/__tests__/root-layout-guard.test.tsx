import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import type { ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import RootLayout from '../_layout';
import { useAuthStore, type AuthSession } from '@/store/useAuthStore';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Root layout merender navigator + font + splash. Semua diganti stub ringan
// yang bentuknya sama, supaya test bisa membaca `guard` tiap Stack.Protected.
jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  const Screen = ({ name }: { name: string }) => React.createElement('StackScreen', { name });
  const Protected = ({ guard, children }: { guard: boolean; children?: ReactNode }) =>
    React.createElement('StackProtected', { guard }, children);
  const Stack = ({ children }: { children?: ReactNode }) =>
    React.createElement('Stack', null, children);

  Stack.Screen = Screen;
  Stack.Protected = Protected;

  return {
    Stack,
    ThemeProvider: ({ children }: { children?: ReactNode }) => children,
    DefaultTheme: { colors: {} },
    DarkTheme: { colors: {} },
  };
});

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => {}),
  hideAsync: jest.fn(async () => {}),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));

jest.mock('@expo-google-fonts/manrope', () => ({
  Manrope_400Regular: 'Manrope_400Regular',
  Manrope_500Medium: 'Manrope_500Medium',
  Manrope_600SemiBold: 'Manrope_600SemiBold',
  Manrope_700Bold: 'Manrope_700Bold',
  Manrope_800ExtraBold: 'Manrope_800ExtraBold',
}));

jest.mock('@expo-google-fonts/dm-mono', () => ({ DMMono_500Medium: 'DMMono_500Medium' }));

jest.mock('@/providers/DataProvider', () => ({
  DataProvider: ({ children }: { children?: ReactNode }) => children,
}));

jest.mock('@/theme/useTheme', () => ({
  useTheme: () => ({
    mode: 'light',
    colors: {
      paper: '#fff',
      surface: '#f5f5f5',
      ink: '#111',
      line: '#ddd',
      accent: '#0a0',
    },
  }),
}));

const GITHUB_SESSION: AuthSession = {
  login: 'octocat',
  name: 'Octo Cat',
  avatarUrl: 'https://github.com/octocat.png',
  githubId: 583231,
  bio: null,
  locationText: null,
  provider: 'github',
};

const GOOGLE_SESSION: AuthSession = {
  ...GITHUB_SESSION,
  login: 'rina',
  name: 'Rina',
  githubId: 0,
  provider: 'google',
};

const EMAIL_SESSION: AuthSession = {
  ...GITHUB_SESSION,
  login: 'user-abc123',
  name: 'Rina Recruiter',
  githubId: 0,
  provider: 'email',
  email: 'rina@company.com',
};

type GuardMap = Record<string, boolean | undefined>;

/** Peta nama screen → nilai `guard` milik Stack.Protected pembungkusnya. */
function guardsOf(tree: ReactTestRenderer): GuardMap {
  const guards: GuardMap = {};
  const protectedGroups = tree.root.findAll((node) => String(node.type) === 'StackProtected');

  for (const group of protectedGroups) {
    for (const screen of group.findAll((node) => String(node.type) === 'StackScreen')) {
      guards[screen.props.name as string] = group.props.guard as boolean;
    }
  }

  // Route di luar Stack.Protected (mis. auth/callback) tetap didaftarkan.
  for (const screen of tree.root.findAll((node) => String(node.type) === 'StackScreen')) {
    const name = screen.props.name as string;
    if (!(name in guards)) guards[name] = undefined;
  }

  return guards;
}

let tree: ReactTestRenderer | null = null;

function renderLayout(): ReactTestRenderer {
  act(() => {
    tree = create(<RootLayout />);
  });
  return tree as ReactTestRenderer;
}

beforeEach(() => {
  useAuthStore.setState({
    hydrated: true,
    session: null,
    roles: [],
    onboarded: false,
    authError: null,
  });
});

afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  useAuthStore.getState().deleteAccount();
});

/**
 * Guard root menentukan route mana yang hidup pada satu waktu: tamu →
 * Welcome, sesi mana pun yang belum onboarded → onboarding (GitHub tidak lagi
 * menjadi gerbang), setelah onboarding → tabs, dan connect-github selalu
 * tersedia untuk sesi aktif sebagai penautan opsional. Callback deep link harus
 * selalu terdaftar karena app bisa dibuka dingin lewat link itu.
 */
describe('RootLayout — guard navigasi', () => {
  it('renders nothing until the persisted auth state is rehydrated', () => {
    useAuthStore.setState({ hydrated: false });

    const target = renderLayout();

    expect(target.toJSON()).toBeNull();
  });

  it('shows only Welcome for a signed-out visitor', () => {
    const guards = guardsOf(renderLayout());

    expect(guards.welcome).toBe(true);
    expect(guards['connect-github']).toBe(false);
    expect(guards.onboarding).toBe(false);
    expect(guards['(tabs)']).toBe(false);
    // Deep link OAuth tidak ikut di-guard.
    expect(guards['auth/callback']).toBeUndefined();
  });

  it('does not force a Google recruiter without GitHub to link before onboarding', () => {
    useAuthStore.getState().signIn(GOOGLE_SESSION);

    const guards = guardsOf(renderLayout());

    expect(guards.onboarding).toBe(true);
    expect(guards.welcome).toBe(false);
    expect(guards['(tabs)']).toBe(false);
    // Route penautan tetap tersedia, tetapi tidak menggantikan onboarding.
    expect(guards['connect-github']).toBe(true);
  });

  it('sends an email recruiter without GitHub to onboarding', () => {
    useAuthStore.getState().signIn(EMAIL_SESSION);

    const guards = guardsOf(renderLayout());

    expect(guards.onboarding).toBe(true);
    expect(guards.welcome).toBe(false);
    expect(guards['(tabs)']).toBe(false);
    expect(guards['connect-github']).toBe(true);
  });

  it('opens the tabs for an onboarded email recruiter', () => {
    const store = useAuthStore.getState();
    store.signIn(EMAIL_SESSION);
    store.setRoles(['recruiter']);
    store.completeOnboarding();

    const guards = guardsOf(renderLayout());

    expect(guards['(tabs)']).toBe(true);
    expect(guards.onboarding).toBe(false);
    expect(guards.welcome).toBe(false);
    expect(guards['connect-github']).toBe(true);
  });

  it('opens onboarding for a GitHub account that is not onboarded yet', () => {
    useAuthStore.getState().signIn(GITHUB_SESSION);

    const guards = guardsOf(renderLayout());

    expect(guards.onboarding).toBe(true);
    expect(guards['connect-github']).toBe(true);
    expect(guards['(tabs)']).toBe(false);
    expect(guards.welcome).toBe(false);
  });

  it('opens the tabs after onboarding is complete', () => {
    const store = useAuthStore.getState();
    store.signIn(GITHUB_SESSION);
    store.setRoles(['developer']);
    store.completeOnboarding();

    const guards = guardsOf(renderLayout());

    expect(guards['(tabs)']).toBe(true);
    expect(guards.dev).toBe(true);
    expect(guards.onboarding).toBe(false);
    expect(guards['connect-github']).toBe(true);
    expect(guards.welcome).toBe(false);
  });

  it('keeps onboarding open when GitHub gets linked before onboarding', () => {
    useAuthStore.getState().signIn(GOOGLE_SESSION);
    const target = renderLayout();

    act(() => {
      useAuthStore.getState().signIn({ ...GOOGLE_SESSION, login: 'octocat', githubId: 583231 });
    });

    const guards = guardsOf(target);
    expect(guards.onboarding).toBe(true);
    expect(guards['connect-github']).toBe(true);
  });
});
