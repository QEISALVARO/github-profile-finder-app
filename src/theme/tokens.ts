/**
 * Design tokens — Gitscope (design.md §1.1–1.3).
 * Dark-first palette anchored on bg #111612 and accent #2dd86f.
 */

export type ThemeMode = 'light' | 'dark';

export interface Palette {
  bg: string;
  surface: string;
  surfaceElement: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  live: string;
  danger: string;
  warning: string;
  info: string;
  overlay: string;
  shadow: string;
}

export const DarkPalette: Palette = {
  bg: '#111612',
  surface: '#171D19',
  surfaceElement: '#1D2420',
  border: '#28312B',
  text: '#EDF3EE',
  textSecondary: '#9DA8A0',
  textMuted: '#5F6B63',
  accent: '#2DD86F',
  accentSoft: '#2DD86F1F',
  onAccent: '#0A130D',
  live: '#2DD86F',
  danger: '#FF5C5C',
  warning: '#F5B83D',
  info: '#4DA3FF',
  overlay: '#00000099',
  shadow: '#000000',
};

export const LightPalette: Palette = {
  bg: '#F5F8F5',
  surface: '#FFFFFF',
  surfaceElement: '#EDF2EE',
  border: '#DCE4DE',
  text: '#111612',
  textSecondary: '#57635B',
  textMuted: '#8B968E',
  accent: '#17A553',
  accentSoft: '#17A5531A',
  onAccent: '#FFFFFF',
  live: '#17A553',
  danger: '#D63030',
  warning: '#B67A11',
  info: '#2074D4',
  overlay: '#11161266',
  shadow: '#111612',
};

export const Themes: Record<ThemeMode, Palette> = {
  dark: DarkPalette,
  light: LightPalette,
};

export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
  ten: 40,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

// Registered font names (expo-google-fonts registers each weight under its
// exported constant name — required for correct rendering on Android).
export const FontFamily = {
  sans: 'Manrope_400Regular',
  sansMedium: 'Manrope_500Medium',
  sansSemibold: 'Manrope_600SemiBold',
  sansBold: 'Manrope_700Bold',
  sansExtrabold: 'Manrope_800ExtraBold',
  mono: 'DMMono_500Medium',
} as const;

export type FontWeightKey = keyof typeof FontFamily;

export const MaxContentWidth = 430;

/** #RRGGBB / #RGB → rgba() with the given alpha (0–1). */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.min(1, Math.max(0, alpha));
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Linear mix of two hex colors; weight 0 = colorA, 1 = colorB. */
export function mix(colorA: string, colorB: string, weight: number): string {
  const w = Math.min(1, Math.max(0, weight));
  const parse = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };
  const [r1, g1, b1] = parse(colorA);
  const [r2, g2, b2] = parse(colorB);
  const toHex = (n: number) =>
    Math.round(n)
      .toString(16)
      .padStart(2, '0');
  const r = toHex(r1 + (r2 - r1) * w);
  const g = toHex(g1 + (g2 - g1) * w);
  const b = toHex(b1 + (b2 - b1) * w);
  return `#${r}${g}${b}`;
}
