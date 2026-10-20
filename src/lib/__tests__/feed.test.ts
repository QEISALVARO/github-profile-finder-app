import { feedProjects, type FeedProject } from '../../data/seed';
import { compactNumber, filterProjects, parseKeywords, type FeedFilters } from '../feed';

const base: FeedFilters = {
  query: '',
  role: 'All',
  location: 'All locations',
  recentOnly: false,
};

const ids = (projects: FeedProject[]): number[] => projects.map((p) => p.id);

describe('parseKeywords', () => {
  it('lowercases and splits on spaces and hyphens', () => {
    expect(parseKeywords('Flutter E-Commerce')).toEqual(['flutter', 'e', 'commerce']);
    expect(parseKeywords('  ')).toEqual([]);
  });
});

describe('filterProjects — PRD §7.1 acceptance criteria', () => {
  it('returns all projects with empty filters', () => {
    expect(ids(filterProjects(feedProjects, base))).toEqual([101, 102, 103, 104]);
  });

  it('query "flutter" leaves only Nusa Commerce', () => {
    expect(ids(filterProjects(feedProjects, { ...base, query: 'flutter' }))).toEqual([101]);
  });

  it('query "python" leaves only Sentra AI Vision', () => {
    expect(ids(filterProjects(feedProjects, { ...base, query: 'python' }))).toEqual([102]);
  });

  it('chip "Flutter E-Commerce" leaves only Nusa Commerce', () => {
    expect(ids(filterProjects(feedProjects, { ...base, query: 'Flutter E-Commerce' }))).toEqual([
      101,
    ]);
  });

  it('chip "Python ML" yields the empty state (PRD O4 — prototype behaviour)', () => {
    expect(filterProjects(feedProjects, { ...base, query: 'Python ML' })).toEqual([]);
  });

  it('chip "Golang" yields the empty state (PRD O4 — prototype behaviour)', () => {
    expect(filterProjects(feedProjects, { ...base, query: 'Golang' })).toEqual([]);
  });

  it('treats hyphen and space separators identically', () => {
    const hyphen = filterProjects(feedProjects, { ...base, query: 'e-commerce' });
    const space = filterProjects(feedProjects, { ...base, query: 'e commerce' });
    expect(ids(hyphen)).toEqual(ids(space));
    expect(hyphen.length).toBeGreaterThan(0);
  });

  it('role Mobile + location Jakarta leaves 1 project', () => {
    expect(
      ids(filterProjects(feedProjects, { ...base, role: 'Mobile', location: 'Jakarta' })),
    ).toEqual([101]);
  });

  it('role Back-End leaves Karsa Microservices', () => {
    expect(ids(filterProjects(feedProjects, { ...base, role: 'Back-End' }))).toEqual([103]);
  });

  it('location Indonesia matches every project with a non-empty location', () => {
    expect(ids(filterProjects(feedProjects, { ...base, location: 'Indonesia' }))).toEqual([
      101, 102, 103, 104,
    ]);
  });

  it('recentOnly hides the inactive Ruang Dashboard project', () => {
    expect(ids(filterProjects(feedProjects, { ...base, recentOnly: true }))).toEqual([
      101, 102, 103,
    ]);
  });

  it('matches case-insensitively', () => {
    expect(ids(filterProjects(feedProjects, { ...base, query: 'FLUTTER' }))).toEqual([101]);
  });
});

describe('compactNumber', () => {
  it.each([
    [842, '842'],
    [1280, '1.3K'],
    [2000, '2K'],
    [13076, '13.1K'],
    [1_250_000, '1.3M'],
    [999_950, '1M'],
    [0, '0'],
  ])('formats %d as %s', (input, expected) => {
    expect(compactNumber(input)).toBe(expected);
  });
});
