import { useColorScheme } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { FontFamily, MaxContentWidth, Radius, Spacing, Themes } from './tokens';
import type { Palette, ThemeMode } from './tokens';

export interface AppTheme {
  mode: ThemeMode;
  colors: Palette;
  spacing: typeof Spacing;
  radius: typeof Radius;
  fontFamily: typeof FontFamily;
  maxWidth: typeof MaxContentWidth;
}

/**
 * FR-G2 — resolved theme. `themeMode` is the user toggle persisted by the
 * store; 'system' follows the OS setting, so the palette flips instantly
 * on toggle (and on OS change when following system).
 */
export function useTheme(): AppTheme {
  const themeMode = useAppStore((s) => s.themeMode);
  const systemScheme = useColorScheme();

  const mode: ThemeMode =
    themeMode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themeMode;

  return {
    mode,
    colors: Themes[mode],
    spacing: Spacing,
    radius: Radius,
    fontFamily: FontFamily,
    maxWidth: MaxContentWidth,
  };
}
