/**
 * Typography scale + native font sizing (design.md §2, D5).
 *
 * Font sizes below are the prototype's CSS px values. Always render them
 * through `fs()` so readable mode lifts 4–10 px text to a native size.
 * `FONT_MODE = 'exact'` restores the prototype sizes.
 */

import type { ColorToken } from './tokens';

export type FontWeight = '400' | '500' | '600' | '700' | '800';

export const MAX_FONT_SCALE = 1.2;

export const FONT_MODE: 'readable' | 'exact' = 'readable';

const READABLE_MAP: Record<number, number> = {
  4: 8,
  5: 8.5,
  6: 9,
  7: 9.5,
  8: 10,
  9: 11,
  10: 12,
};

/** Convert a prototype CSS px size to a native font size. */
export function fs(px: number): number {
  return FONT_MODE === 'exact' ? px : (READABLE_MAP[px] ?? px);
}

export const fontFamilies = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
  mono: 'DMMono_500Medium',
} as const;

/** Map a numeric CSS-style weight to the matching Manrope family. */
export function fontFamilyFor(weight: FontWeight = '400', mono = false): string {
  if (mono) return fontFamilies.mono;
  switch (weight) {
    case '500':
      return fontFamilies.medium;
    case '600':
      return fontFamilies.semibold;
    case '700':
      return fontFamilies.bold;
    case '800':
      return fontFamilies.extrabold;
    case '400':
    default:
      return fontFamilies.regular;
  }
}

export type TextVariantName =
  | 'h1Intro'
  | 'h1Page'
  | 'h1Hero'
  | 'h1Account'
  | 'h3Section'
  | 'h3Feed'
  | 'h2Identity'
  | 'h3Profile'
  | 'titleCard'
  | 'body'
  | 'bodyIntro'
  | 'bodyPage'
  | 'caption'
  | 'eyebrow'
  | 'eyebrowSm'
  | 'mono7'
  | 'mono6';

export type TextVariant = {
  /** Prototype px size — T applies `fs()`. */
  size: number;
  weight: FontWeight;
  mono: boolean;
  lineHeight?: number;
  letterSpacing?: number;
  color: ColorToken;
};

/** design.md §2.3 — named text styles. */
export const textVariants: Record<TextVariantName, TextVariant> = {
  h1Intro: { size: 42, weight: '800', mono: false, lineHeight: 1.02, letterSpacing: -2.5, color: 'ink' },
  h1Page: { size: 38, weight: '800', mono: false, lineHeight: 1.04, letterSpacing: -2.1, color: 'ink' },
  h1Hero: { size: 28, weight: '700', mono: false, letterSpacing: -1.4, color: 'ink' },
  h1Account: { size: 23, weight: '700', mono: false, letterSpacing: -1, color: 'ink' },
  h3Section: { size: 18, weight: '700', mono: false, letterSpacing: -0.6, color: 'ink' },
  h3Feed: { size: 17, weight: '700', mono: false, letterSpacing: -0.5, color: 'ink' },
  h2Identity: { size: 17, weight: '700', mono: false, letterSpacing: -0.6, color: 'ink' },
  h3Profile: { size: 16, weight: '700', mono: false, letterSpacing: -0.5, color: 'ink' },
  titleCard: { size: 14, weight: '700', mono: false, letterSpacing: -0.4, color: 'ink' },
  body: { size: 12, weight: '400', mono: false, lineHeight: 1.55, color: 'ink' },
  bodyIntro: { size: 13, weight: '400', mono: false, lineHeight: 1.6, color: 'muted' },
  bodyPage: { size: 12, weight: '400', mono: false, lineHeight: 1.6, color: 'muted' },
  caption: { size: 9, weight: '400', mono: false, lineHeight: 1.55, color: 'muted' },
  eyebrow: { size: 10, weight: '500', mono: true, letterSpacing: 1.8, color: 'greenText' },
  eyebrowSm: { size: 8, weight: '500', mono: true, letterSpacing: 1.8, color: 'greenText' },
  mono7: { size: 7, weight: '500', mono: true, color: 'muted' },
  mono6: { size: 6, weight: '500', mono: true, color: 'greenStrong' },
};

/** Explore H1 size: clamp(37, 10vw, 45) in the prototype. */
export function introHeadingSize(width: number): number {
  return Math.min(45, Math.max(37, width * 0.1));
}
