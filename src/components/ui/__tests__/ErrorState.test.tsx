import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import type { ReactElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ErrorState } from '@/components/ui/ErrorState';

/**
 * TASK 4 — `RATE_LIMITED` cooldown pada kartu error:
 *  - detik dihitung live (bukan salinan statis yang cepat basi),
 *  - tombol Retry terkunci sampai jeda lewat, lalu terbuka sendiri,
 *  - tanpa `retryAfter` tombol langsung bisa dipakai.
 */

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.useFakeTimers();

function render(element: ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(element);
  });
  return tree;
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

function retryButton(tree: ReactTestRenderer) {
  return tree.root
    .findAll(
      (node) =>
        node.props.accessibilityLabel === 'Coba lagi' &&
        typeof node.props.onPress === 'function',
    )
    .at(0);
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('ErrorState retry cooldown', () => {
  it('locks retry and counts the wait down to zero', async () => {
    const onRetry = jest.fn();
    const tree = render(
      <ErrorState
        title="Terlalu banyak permintaan"
        message="Batas permintaan tercapai."
        retryAfter={42}
        onRetry={onRetry}
      />,
    );

    expect(textOf(tree.toJSON())).toContain('Coba lagi dalam 42 detik.');
    const locked = retryButton(tree);
    expect(locked?.props.disabled).toBe(true);
    expect(locked?.props.accessibilityState).toEqual({ disabled: true });
    expect(onRetry).not.toHaveBeenCalled();

    await advance(1000);
    expect(textOf(tree.toJSON())).toContain('Coba lagi dalam 41 detik.');

    // Sisa jawaannya habis: baris detik hilang dan tombol terbuka kembali.
    await advance(41_000);
    expect(textOf(tree.toJSON())).not.toContain('detik.');
    expect(retryButton(tree)?.props.disabled).toBe(false);

    act(() => {
      retryButton(tree)?.props.onPress();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps retry usable when there is no cooldown', () => {
    const onRetry = jest.fn();
    const tree = render(<ErrorState title="Data gagal dimuat" onRetry={onRetry} />);

    expect(textOf(tree.toJSON())).not.toContain('detik.');
    expect(retryButton(tree)?.props.disabled).toBe(false);

    act(() => {
      retryButton(tree)?.props.onPress();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('restarts the countdown when a new retryAfter arrives', async () => {
    const tree = render(
      <ErrorState title="Terlalu banyak permintaan" retryAfter={10} onRetry={jest.fn()} />,
    );

    await advance(5000);
    expect(textOf(tree.toJSON())).toContain('5 detik.');

    act(() => {
      tree.update(
        <ErrorState title="Terlalu banyak permintaan" retryAfter={30} onRetry={jest.fn()} />,
      );
    });
    expect(textOf(tree.toJSON())).toContain('Coba lagi dalam 30 detik.');
    expect(retryButton(tree)?.props.disabled).toBe(true);
  });
});
