import { createContext } from 'react';

import type { Theme } from './tokens';

/**
 * Palette injected by `ThemeScope`. `null` means "no override" — components then
 * follow the persisted app preference (see `useTheme`).
 */
export const ThemeContext = createContext<Theme | null>(null);
