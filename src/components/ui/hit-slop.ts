export type HitSlop = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export const MIN_TOUCH_TARGET = 44;

/**
 * D6 — touch targets must be at least 44×44 dp without changing the visual
 * size. Components below that size spread the difference as hit slop.
 */
export function hitSlopFor(width: number, height: number, min = MIN_TOUCH_TARGET): HitSlop {
  const horizontal = Math.max(0, Math.ceil((min - width) / 2));
  const vertical = Math.max(0, Math.ceil((min - height) / 2));

  return {
    top: vertical,
    bottom: vertical,
    left: horizontal,
    right: horizontal,
  };
}
