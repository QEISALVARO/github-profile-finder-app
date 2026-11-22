import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { router } from 'expo-router';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { completePasswordRecoveryFromUrl, isPasswordRecoveryUrl } from '@/lib/auth';

import UpdatePasswordScreen, { recoveryUrlFrom } from '../auth/update-password';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  ...jest.requireActual<{ default: Record<string, unknown> }>(
    'react-native-safe-area-context/jest/mock',
  ).default,
}));

const mockUpdatePassword = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/api/queries', () => ({
  useUpdatePassword: () => ({ mutateAsync: mockUpdatePassword, isPending: false }),
  useSignOut: () => ({ mutateAsync: mockSignOut, isPending: false }),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

let mockUrl: string | null = 'gitscope://auth/update-password?code=abc';

jest.mock('expo-linking', () => ({
  useURL: () => mockUrl,
}));

jest.mock('@/lib/auth', () => ({
  completePasswordRecoveryFromUrl: jest.fn(),
  isPasswordRecoveryUrl: jest.fn(),
}));

const mockedComplete = completePasswordRecoveryFromUrl as jest.MockedFunction<
  typeof completePasswordRecoveryFromUrl
>;
const mockedIsRecovery = isPasswordRecoveryUrl as jest.MockedFunction<
  typeof isPasswordRecoveryUrl
>;
const mockedReplace = router.replace as jest.Mock;

let tree: ReactTestRenderer | null = null;

async function render(): Promise<ReactTestRenderer> {
  await act(async () => {
    tree = create(<UpdatePasswordScreen />);
  });
  return tree as ReactTestRenderer;
}

async function press(target: ReactTestRenderer, label: string): Promise<void> {
  const button = target.root
    .findAll((node) => node.props.accessibilityLabel === label)
    .find((node) => typeof node.props.onPress === 'function');
  if (!button) throw new Error(`Tombol "${label}" tidak ditemukan`);
  await act(async () => {
    await button.props.onPress();
  });
}

async function type(target: ReactTestRenderer, label: string, value: string): Promise<void> {
  const input = target.root.find(
    (node) =>
      node.props.accessibilityLabel === label && typeof node.props.onChangeText === 'function',
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
  mockUrl = 'gitscope://auth/update-password?code=abc';
  mockedIsRecovery.mockReset();
  mockedComplete.mockReset();
  mockUpdatePassword.mockReset();
  mockSignOut.mockReset();
  jest.clearAllMocks();
});

describe('recoveryUrlFrom', () => {
  it('uses the web href and native deep link without duplicating tokens', () => {
    expect(recoveryUrlFrom('gitscope://auth/update-password?code=abc', {}, 'https://app/x')).toBe(
      'https://app/x',
    );
    expect(recoveryUrlFrom(null, { code: 'abc', type: 'recovery' })).toBe(
      'gitscope://auth/update-password?code=abc&type=recovery',
    );
  });
});

describe('update password recovery flow', () => {
  it('exchanges a valid recovery link and shows the new-password form', async () => {
    mockedIsRecovery.mockReturnValue(true);
    mockedComplete.mockResolvedValueOnce({ error: null });

    const target = await render();

    expect(mockedComplete).toHaveBeenCalledWith('gitscope://auth/update-password?code=abc');
    const text = textOf(target.toJSON());
    expect(text).toContain('Buat password baru.');
    expect(text).toContain('PASSWORD BARU');
  });

  it('shows a clear message for an expired or used link', async () => {
    mockedIsRecovery.mockReturnValue(true);
    mockedComplete.mockResolvedValueOnce({
      error: 'Tautan reset sudah kedaluwarsa atau pernah dipakai. Minta tautan baru.',
      reason: 'oauth_failed',
    });

    const target = await render();
    const text = textOf(target.toJSON());

    expect(text).toContain('Tautan tidak dapat dipakai.');
    expect(text).toContain('kedaluwarsa atau pernah dipakai');
    expect(text).not.toContain('Buat password baru.');
  });

  it('refuses the form when the route has no recovery token', async () => {
    mockUrl = 'gitscope://auth/update-password';
    mockedIsRecovery.mockReturnValue(true);
    mockedComplete.mockResolvedValueOnce({
      error: 'Tautan reset tidak valid atau tidak membawa token. Minta tautan baru.',
      reason: 'oauth_failed',
    });

    const target = await render();
    const text = textOf(target.toJSON());

    expect(mockedComplete).toHaveBeenCalledWith('gitscope://auth/update-password');
    expect(text).toContain('Tautan tidak dapat dipakai.');
    expect(text).not.toContain('Simpan password baru');
  });

  it('validates password length and matching confirmation before calling Supabase', async () => {
    mockedIsRecovery.mockReturnValue(true);
    mockedComplete.mockResolvedValueOnce({ error: null });
    const target = await render();

    await type(target, 'PASSWORD BARU', 'pendek');
    await type(target, 'ULANGI PASSWORD BARU', 'berbeda123');
    await press(target, 'Simpan password baru');

    const text = textOf(target.toJSON());
    expect(text).toContain('Password minimal 8 karakter.');
    expect(text).toContain('Konfirmasi password tidak sama.');
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('saves a valid password, ends the recovery session, and offers login', async () => {
    mockedIsRecovery.mockReturnValue(true);
    mockedComplete.mockResolvedValueOnce({ error: null });
    mockUpdatePassword.mockResolvedValueOnce({ error: null });
    mockSignOut.mockResolvedValueOnce(undefined);
    const target = await render();

    await type(target, 'PASSWORD BARU', 'rahasia-baru-123');
    await type(target, 'ULANGI PASSWORD BARU', 'rahasia-baru-123');
    await press(target, 'Simpan password baru');

    expect(mockUpdatePassword).toHaveBeenCalledWith('rahasia-baru-123');
    expect(mockSignOut).toHaveBeenCalled();
    expect(textOf(target.toJSON())).toContain('Password berhasil disimpan.');

    await press(target, 'Masuk dengan password baru');
    expect(mockedReplace).toHaveBeenCalledWith('/login');
  });

  it('shows an actionable error when the recovery session expired during update', async () => {
    mockedIsRecovery.mockReturnValue(true);
    mockedComplete.mockResolvedValueOnce({ error: null });
    mockUpdatePassword.mockResolvedValueOnce({
      error: 'Sesi reset tidak valid atau sudah berakhir. Minta tautan reset baru.',
      reason: 'session_expired',
    });
    const target = await render();

    await type(target, 'PASSWORD BARU', 'rahasia-baru-123');
    await type(target, 'ULANGI PASSWORD BARU', 'rahasia-baru-123');
    await press(target, 'Simpan password baru');

    expect(textOf(target.toJSON())).toContain('Sesi reset tidak valid');
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockedReplace).not.toHaveBeenCalledWith('/login');
  });

  it('never writes the recovery code/token to AsyncStorage', async () => {
    mockedIsRecovery.mockReturnValue(true);
    mockedComplete.mockResolvedValueOnce({ error: null });
    const setItem = jest.spyOn(mockAsyncStorage, 'setItem');

    await render();

    const serialized = setItem.mock.calls.map((call) => JSON.stringify(call)).join(' ');
    expect(serialized).not.toContain('code=abc');
    expect(serialized).not.toContain('access_token');
    setItem.mockRestore();
  });
});
