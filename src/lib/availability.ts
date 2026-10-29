// ---------------------------------------------------------------------------
// FE-2 — availability vocabulary shared by the data layer and the UI.
//
// Single source of truth so the store, onboarding, settings, feed cards and
// talent cards can never drift apart. `useAuthStore` re-exports these names,
// so existing `@/store/useAuthStore` imports keep working.
// ---------------------------------------------------------------------------

/** PRD v2 §7 — the three states stored in `profiles.availability`. */
export type Availability = 'open_to_work' | 'freelance' | 'not_available';

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  open_to_work: 'Open to work',
  freelance: 'Open for freelance',
  not_available: 'Not available',
};

/** Seed / free-text label → contract enum (unknown values fall back safely). */
const AVAILABILITY_BY_LABEL: Record<string, Availability> = {
  'Open to work': 'open_to_work',
  'Open for freelance': 'freelance',
  Freelance: 'freelance',
  'Not available': 'not_available',
};

export function toAvailability(label: string): Availability {
  return AVAILABILITY_BY_LABEL[label] ?? 'not_available';
}

/** Accepts either the enum or an already-rendered label. */
export function availabilityLabel(value: Availability | string): string {
  if (value in AVAILABILITY_LABELS) return AVAILABILITY_LABELS[value as Availability];
  return value;
}
