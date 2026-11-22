import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import LoginScreen from '../login';
import RegisterScreen from '../register';
import ForgotPasswordScreen from '../forgot-password';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  ...jest.requireActual<{ default: Record<string, unknown> }>(
    'react-native-safe-area-context/jest/mock',
  ).default,
}));

let mockRouteParams: { next?: string } = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockRouteParams,
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/lib/auth', () => ({
  signInWithGitHub: jest.fn(),
  signInWithGoogle: jest.fn(),
}));

const mockMutateSignIn = jest.fn();
const mockMutateSignUp = jest.fn();
const mockMutateResend = jest.fn();
const mockMutateReset = jest.fn();

jest.mock('@/api/queries', () => ({
  useSignInWithEmail: () => ({ mutateAsync: mockMutateSignIn, isPending: false }),
  useSignUpWithEmail: () => ({ mutateAsync: mockMutateSignUp, isPending: false }),
  useResendSignupConfirmation: () => ({ mutateAsync: mockMutateResend, isPending: false }),
  useResetPassword: () => ({ mutateAsync: mockMutateReset, isPending: false }),
}));

const mockedReplace = router.replace as jest.Mock;

let tree: ReactTestRenderer | null = null;

function render(node: ReactElement): ReactTestRenderer {
  act(() => {
    tree = create(node);
  });
  return tree as ReactTestRenderer;
}

async function press(target: ReactTestRenderer, label: string): Promise<void> {
  const button = target.root
    .findAll((n) => n.props.accessibilityLabel === label)
    .find((n) => typeof n.props.onPress === 'function');
  if (!button) throw new Error(`Tombol "${label}" tidak ditemukan`);
  await act(async () => {
    await button.props.onPress();
  });
}

async function type(target: ReactTestRenderer, label: string, value: string): Promise<void> {
  const input = target.root.find(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onChangeText === 'function',
  );
  await act(async () => {
    input.props.onChangeText(value);
  });
}

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

afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  mockRouteParams = {};
  jest.clearAllMocks();
});

describe('Login email', () => {
  it('validates email and password before calling the backend', async () => {
    const target = render(<LoginScreen />);

    await press(target, 'Masuk');

    const text = textOf(target.toJSON());
    expect(text).toContain('Masukkan alamat email yang valid.');
    expect(text).toContain('Password minimal 8 karakter.');
    expect(mockMutateSignIn).not.toHaveBeenCalled();
  });

  it('shows an actionable backend error and stays on the screen', async () => {
    mockMutateSignIn.mockResolvedValueOnce({
      error: 'Email atau password salah.',
      reason: 'invalid_credentials',
    });
    const target = render(<LoginScreen />);

    await type(target, 'EMAIL', 'rina@company.com');
    await type(target, 'PASSWORD', 'rahasia123');
    await press(target, 'Masuk');

    expect(textOf(target.toJSON())).toContain('Email atau password salah.');
    expect(mockedReplace).not.toHaveBeenCalled();
  });

  it('returns to an allowlisted analysis target after email login', async () => {
    mockMutateSignIn.mockResolvedValueOnce({ error: null, session: {} });
    mockRouteParams = { next: '/explore/analysis?login=angga-risky&confirmed=1' };
    const target = render(<LoginScreen />);

    await type(target, 'EMAIL', 'rina@company.com');
    await type(target, 'PASSWORD', 'rahasia123');
    await press(target, 'Masuk');

    expect(mockedReplace).toHaveBeenCalledWith('/explore/analysis?login=angga-risky');
  });

  it('rejects an external return URL after login', async () => {
    mockMutateSignIn.mockResolvedValueOnce({ error: null, session: {} });
    mockRouteParams = { next: 'https://evil.example/phish' };
    const target = render(<LoginScreen />);

    await type(target, 'EMAIL', 'rina@company.com');
    await type(target, 'PASSWORD', 'rahasia123');
    await press(target, 'Masuk');

    expect(mockedReplace).toHaveBeenCalledWith('/onboarding');
    expect(mockedReplace).not.toHaveBeenCalledWith('https://evil.example/phish');
  });

  it('links to register and forgot password', async () => {
    const target = render(<LoginScreen />);

    await press(target, 'Daftar');
    await press(target, 'Lupa password');

    expect(mockedReplace).toHaveBeenCalledWith('/register');
    expect(router.push).toHaveBeenCalledWith('/forgot-password');
  });
});

describe('Register email', () => {
  it('requires matching passwords', async () => {
    const target = render(<RegisterScreen />);

    await type(target, 'EMAIL', 'rina@company.com');
    await type(target, 'PASSWORD', 'rahasia123');
    await type(target, 'ULANGI PASSWORD', 'beda123456');
    await press(target, 'Daftar');

    expect(textOf(target.toJSON())).toContain('Konfirmasi password tidak sama.');
    expect(mockMutateSignUp).not.toHaveBeenCalled();
  });

  it('shows the confirmation state when Supabase requires email confirmation', async () => {
    mockMutateSignUp.mockResolvedValueOnce({ error: null, needsEmailConfirmation: true });
    const target = render(<RegisterScreen />);

    await type(target, 'EMAIL', 'rina@company.com');
    await type(target, 'PASSWORD', 'rahasia123');
    await type(target, 'ULANGI PASSWORD', 'rahasia123');
    await press(target, 'Daftar');

    const text = textOf(target.toJSON());
    expect(text).toContain('Konfirmasi email Anda.');
    expect(text).toContain('Kirim ulang email konfirmasi');
    expect(mockedReplace).not.toHaveBeenCalled();
  });
});

describe('Forgot password', () => {
  it('shows a neutral success state after requesting a link', async () => {
    mockMutateReset.mockResolvedValueOnce({ error: null });
    const target = render(<ForgotPasswordScreen />);

    await type(target, 'EMAIL', 'rina@company.com');
    await press(target, 'Kirim tautan reset');

    const text = textOf(target.toJSON());
    expect(text).toContain('Tautan reset dikirim.');
    expect(text).toContain('tidak ada tautan yang dibuat');
    expect(mockMutateReset).toHaveBeenCalledWith('rina@company.com');
  });

  it('surfaces a safe backend failure without opening a different flow', async () => {
    mockMutateReset.mockResolvedValueOnce({
      error: 'Tidak dapat memproses permintaan. Coba lagi beberapa saat lagi.',
      reason: 'failed',
    });
    const target = render(<ForgotPasswordScreen />);

    await type(target, 'EMAIL', 'unknown@company.com');
    await press(target, 'Kirim tautan reset');

    expect(textOf(target.toJSON())).toContain('Tidak dapat memproses permintaan');
    expect(textOf(target.toJSON())).not.toContain('Tautan reset dikirim.');
  });

  it('validates the email address', async () => {
    const target = render(<ForgotPasswordScreen />);

    await press(target, 'Kirim tautan reset');

    expect(textOf(target.toJSON())).toContain('Masukkan alamat email yang valid.');
    expect(mockMutateReset).not.toHaveBeenCalled();
  });
});
