import {
  SCORE_COMPONENTS,
  TIER_COPY,
  componentPercent,
  componentRatioLabel,
} from '../score';

describe('componentRatioLabel', () => {
  it('returns "value/max"', () => {
    expect(componentRatioLabel(28, 30)).toBe('28/30');
  });

  it('handles zero value', () => {
    expect(componentRatioLabel(0, 30)).toBe('0/30');
  });

  it('handles value equal to max', () => {
    expect(componentRatioLabel(30, 30)).toBe('30/30');
  });
});

describe('componentPercent', () => {
  it('returns 0 when value is 0', () => {
    expect(componentPercent(0, 30)).toBe(0);
  });

  it('returns 100 when value equals max', () => {
    expect(componentPercent(30, 30)).toBe(100);
  });

  it('caps at 100 when value exceeds max', () => {
    expect(componentPercent(45, 30)).toBe(100);
  });

  it('returns 0 when max is 0', () => {
    expect(componentPercent(28, 0)).toBe(0);
  });

  it('returns 0 when max is negative', () => {
    expect(componentPercent(28, -5)).toBe(0);
  });

  it('scales proportionally for in-range values', () => {
    // 15/15 = 100; 7.5/15 = 50.
    expect(componentPercent(15, 15)).toBe(100);
    expect(componentPercent(7.5, 15)).toBe(50);
  });

  it('handles fractional results without rounding', () => {
    // 1/3 of 100 = 33.333...
    expect(componentPercent(1, 3)).toBeCloseTo(33.333, 2);
  });
});

describe('TIER_COPY', () => {
  it('contains three tiers', () => {
    expect(Object.keys(TIER_COPY)).toHaveLength(3);
    expect(TIER_COPY).toHaveProperty('high');
    expect(TIER_COPY).toHaveProperty('medium');
    expect(TIER_COPY).toHaveProperty('low');
  });

  it('high tier describes original active work', () => {
    expect(TIER_COPY.high).toContain('Original');
    expect(TIER_COPY.high).toContain('active');
  });

  it('medium tier advises verifying evidence', () => {
    expect(TIER_COPY.medium).toContain('verify');
    expect(TIER_COPY.medium).toContain('evidence');
  });

  it('low tier signals limited evidence', () => {
    expect(TIER_COPY.low).toContain('Limited');
    expect(TIER_COPY.low).toContain('evidence');
  });
});

describe('SCORE_COMPONENTS', () => {
  it('defines five components matching the BE formula maxima', () => {
    expect(SCORE_COMPONENTS).toHaveLength(5);
    expect(SCORE_COMPONENTS.map((c) => c.key)).toEqual([
      'originality',
      'activity',
      'proof',
      'substance',
      'depth',
    ]);
    expect(SCORE_COMPONENTS.map((c) => c.max)).toEqual([30, 20, 15, 20, 15]);
  });
});
