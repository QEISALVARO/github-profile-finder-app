import { useContext } from 'react';
import { useColorScheme } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

import { ThemeContext } from './context';
import { themes, type Theme, type ThemeMode } from './tokens';

/** design.md §1.4 — "phone" content width; keeps tablet/web proportional. */
export const MAX_CONTENT_WIDTH = 430;

export interface AppTheme extends Theme {
  maxWidth: number;
}

/**
 * FR-G2 — resolved theme. `themeMode` is the user toggle persisted by the store;
 * `'system'` follows the OS setting. A surrounding `ThemeScope` (used by the
 * /dev showcase) overrides the palette for its subtree.
 */
export function useTheme(): AppTheme {
  const scoped = useContext(ThemeContext);
  const themeMode = useAppStore((s) => s.themeMode);
  const systemScheme = useColorScheme();

  const mode: ThemeMode =
    themeMode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themeMode;
  const theme = scoped ?? themes[mode];

  return { ...theme, maxWidth: MAX_CONTENT_WIDTH };
}
