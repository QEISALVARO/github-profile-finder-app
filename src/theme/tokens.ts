/**
 * Gitscope design tokens — the single source of truth for colour, elevation
 * and radii. No component may declare a raw colour; add a token here instead.
 * Source: design.md §1.
 */

export type ThemeMode = 'light' | 'dark';

export type BaseColors = {
  ink: string;
  muted: string;
  paper: string;
  surface: string;
  line: string;
  accent: string;
  accentSoft: string;
  nav: string;
  navText: string;
};

export type FixedColors = {
  onAccent: string;
  greenText: string;
  greenStrong: string;
  error: string;
  warnText: string;
  warnBg: string;
  heat0: string;
  heat1: string;
  heat2: string;
  heat3: string;
  heat4: string;
  langDefault: string;
  langJavaScript: string;
  langTypeScript: string;
  langHTML: string;
  langRuby: string;
  langPython: string;
  langGo: string;
  white: string;
  black: string;
  backdrop: string;
  ringTrack: string;
  onAccentGlass: string;
};

export type DerivedColors = {
  topbarBg: string;
  tabsTrack: string;
  navInactive: string;
  scoreCircleBorder: string;
  coverDot: string;
  githubCardMuted: string;
  networkCardMuted: string;
  networkBtnBorder: string;
  connectedPillBg: string;
  recentDotRing: string;
  loaderTrack: string;
};

export type ColorTokens = BaseColors & FixedColors & DerivedColors;

export type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export type ShadowTokens = {
  card: ShadowStyle;
  profile: ShadowStyle;
  tab: ShadowStyle;
  nav: ShadowStyle;
  sheet: ShadowStyle;
  toast: ShadowStyle;
};

export type Theme = {
  mode: ThemeMode;
  colors: ColorTokens;
  shadows: ShadowTokens;
  radii: typeof radii;
};

export const lightBase: BaseColors = {
  ink: '#111612',
  muted: '#68716a',
  paper: '#f4f6f1',
  surface: '#ffffff',
  line: '#dce1da',
  accent: '#2dd86f',
  accentSoft: '#dff9e8',
  nav: '#111612',
  navText: '#ffffff',
};

export const darkBase: BaseColors = {
  ink: '#f3f7f2',
  muted: '#9fa8a1',
  paper: '#101410',
  surface: '#181d19',
  line: '#303831',
  accent: '#2dd86f',
  accentSoft: '#1d3c27',
  nav: '#f0f4ef',
  navText: '#121612',
};

/** Colours that intentionally do not change between light and dark. */
export const fixedColors: FixedColors = {
  onAccent: '#101510',
  greenText: '#258b4d',
  greenStrong: '#18733a',
  error: '#d04444',
  warnText: '#9b6b12',
  warnBg: '#fff2cc',
  heat0: '#dce1da',
  heat1: '#b9efca',
  heat2: '#75df9b',
  heat3: '#35c96d',
  heat4: '#168d45',
  langDefault: '#718096',
  langJavaScript: '#f1e05a',
  langTypeScript: '#3178c6',
  langHTML: '#e34c26',
  langRuby: '#701516',
  langPython: '#3572a5',
  langGo: '#00add8',
  white: '#ffffff',
  black: '#000000',
  backdrop: 'rgba(4,8,5,0.58)',
  ringTrack: 'rgba(255,255,255,0.45)',
  onAccentGlass: 'rgba(255,255,255,0.5)',
};

export const radii = {
  xs: 2,
  sm: 5,
  md: 6,
  control: 9,
  card: 15,
  panel: 16,
  hero: 17,
  feature: 18,
  pill: 9999,
} as const;

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Mix `pctA` percent of `hexA` with the remainder of `hexB`. */
export function mix(hexA: string, hexB: string, pctA: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const ratio = Math.min(100, Math.max(0, pctA)) / 100;
  const channel = (x: number, y: number) => Math.round(x * ratio + y * (1 - ratio));
  return `rgb(${channel(a.r, b.r)},${channel(a.g, b.g)},${channel(a.b, b.b)})`;
}

function derived(base: BaseColors): DerivedColors {
  return {
    topbarBg: withAlpha(base.paper, 0.92),
    tabsTrack: withAlpha(base.line, 0.55),
    navInactive: withAlpha(base.navText, 0.55),
    scoreCircleBorder: mix(base.accent, base.line, 55),
    coverDot: withAlpha(fixedColors.onAccent, 0.22),
    githubCardMuted: withAlpha(base.surface, 0.6),
    networkCardMuted: withAlpha(base.surface, 0.65),
    networkBtnBorder: withAlpha(base.surface, 0.18),
    connectedPillBg: withAlpha(base.accent, 0.12),
    recentDotRing: withAlpha(base.accent, 0.22),
    loaderTrack: withAlpha(base.ink, 0.25),
  };
}

function makeShadows(shadowColor: string): ShadowTokens {
  return {
    card: {
      shadowColor,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    profile: {
      shadowColor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.07,
      shadowRadius: 15,
      elevation: 4,
    },
    tab: {
      shadowColor,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 5,
      elevation: 1,
    },
    nav: {
      shadowColor: fixedColors.black,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.22,
      shadowRadius: 15,
      elevation: 8,
    },
    sheet: {
      shadowColor: fixedColors.black,
      shadowOffset: { width: 0, height: -15 },
      shadowOpacity: 0.25,
      shadowRadius: 25,
      elevation: 16,
    },
    toast: {
      shadowColor: fixedColors.black,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
  };
}

function makeTheme(mode: ThemeMode, base: BaseColors): Theme {
  return {
    mode,
    colors: {
      ...base,
      ...fixedColors,
      // heat0 follows the theme's divider colour.
      heat0: base.line,
      ...derived(base),
    },
    shadows: makeShadows(mode === 'light' ? base.ink : fixedColors.black),
    radii,
  };
}

export const lightTheme = makeTheme('light', lightBase);
export const darkTheme = makeTheme('dark', darkBase);
export const themes: Record<ThemeMode, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};

export type ColorToken = keyof ColorTokens;
export type ThemeRadius = keyof typeof radii;

/** Language colour lookup used by language dots and progress labels. */
export const languageColors: Record<string, ColorToken> = {
  JavaScript: 'langJavaScript',
  TypeScript: 'langTypeScript',
  HTML: 'langHTML',
  Ruby: 'langRuby',
  Python: 'langPython',
  Go: 'langGo',
};
