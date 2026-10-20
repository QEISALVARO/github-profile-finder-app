// ---------------------------------------------------------------------------
// Feature flags (PRD §8 D8).
// ---------------------------------------------------------------------------

/**
 * D8 — heatmap cell sizing. `false` (default): fixed 7×7 cells, matching the
 * prototype (fills ~1/3 of the card width). `true`: cells stretch so the grid
 * fills the card's inner width — `cell = (innerWidth − 11*3) / 12`.
 */
export const HEATMAP_FULL_WIDTH = false;
