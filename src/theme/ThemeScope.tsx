import { useMemo, type ReactNode } from 'react';

import { ThemeContext } from './context';
import { themes, type ThemeMode } from './tokens';

export interface ThemeScopeProps {
  /** Force this palette for the subtree, e.g. the light/dark /dev showcase. */
  mode: ThemeMode;
  children: ReactNode;
}

/** Renders children with an explicitly forced palette. */
export function ThemeScope({ mode, children }: ThemeScopeProps) {
  const theme = useMemo(() => themes[mode], [mode]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export default ThemeScope;
