// ---------------------------------------------------------------------------
// PRD §4 — model data. Single source of truth for the GitHub domain types so
// M2 (feed) and M3 (analysis) share one definition — no duplicates.
// ---------------------------------------------------------------------------

export type GithubUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  followers: number;
  following: number;
  public_repos: number;
  location: string | null;
  html_url: string;
};

export type GithubRepo = {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count?: number;
  fork?: boolean;
  homepage?: string | null;
  pushed_at?: string;
  html_url: string;
};

export type Candidate = {
  login: string;
  name: string;
  role: string;
  language: string;
  location: string;
  score: number;
  avatar: string;
  stage: 'Saved' | 'Interviewing' | 'Hired';
  availability: string;
  /**
   * PRD v2 §11A — ISO 3166-1 alpha-2 of the declared country of residence.
   * `null` = unknown; such candidates never pass an active country filter
   * (POL-9). Added compatibly: existing fixtures without the field behave as
   * "no country declared".
   */
  countryCode?: string | null;
  /** City within `countryCode`, shown next to the flag on cards. */
  city?: string | null;
};

export type FeedProject = {
  id: number;
  name: string;
  description: string;
  role: string;
  stack: string[];
  location: string;
  score: number;
  active: boolean;
  demo: string;
  developer: Candidate;
  stars: number;
};
