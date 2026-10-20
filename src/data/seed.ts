// ---------------------------------------------------------------------------
// Lampiran A (PRD) — seed data. Copied as-is from the PRD appendix; treat as
// immutable fixtures for Explore/Talent/Analysis during early milestones.
// The PRD model types (§4) live in `src/types` (single source of truth) and
// are re-exported here so existing `@/data/seed` imports keep working.
// ---------------------------------------------------------------------------

import type { Candidate, FeedProject, GithubRepo, GithubUser } from '@/types';

export type { Candidate, FeedProject, GithubRepo, GithubUser };

export interface SeedDeveloper {
  username: string;
  name: string;
  avatarUrl: string;
  location: string | null;
  bio: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  languages: string[];
  topRepos: SeedRepo[];
  score: number;
}

export interface SeedRepo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  pushedAt: string;
}

export const seedDevelopers: SeedDeveloper[] = [
  {
    username: 'octanerdtorres',
    name: 'Octane R. Torres',
    avatarUrl: 'https://i.pravatar.cc/160?img=12',
    location: 'Jakarta, ID',
    bio: 'Systems engineer — distributed schedulers, Go, Rust.',
    followers: 1840,
    following: 214,
    publicRepos: 78,
    languages: ['Go', 'Rust', 'TypeScript'],
    topRepos: [
      {
        name: 'flowqueue',
        description: 'Backpressure-aware job queue for Go services.',
        language: 'Go',
        stars: 2410,
        forks: 187,
        pushedAt: '2026-10-02T09:14:00Z',
      },
      {
        name: 'rusty-lru',
        description: 'Lock-free LRU cache with hit-rate metrics.',
        language: 'Rust',
        stars: 980,
        forks: 61,
        pushedAt: '2026-09-18T15:40:00Z',
      },
    ],
    score: 92,
  },
  {
    username: 'meiliscope',
    name: 'Mei Li',
    avatarUrl: 'https://i.pravatar.cc/160?img=47',
    location: 'Singapore, SG',
    bio: 'Frontend performance + design systems. React, Reanimated.',
    followers: 3120,
    following: 96,
    publicRepos: 64,
    languages: ['TypeScript', 'Swift'],
    topRepos: [
      {
        name: 'motion-kit',
        description: '60fps primitives built on react-native-reanimated.',
        language: 'TypeScript',
        stars: 4300,
        forks: 240,
        pushedAt: '2026-10-08T22:05:00Z',
      },
      {
        name: 'swift-lens',
        description: 'Type-safe key paths for SwiftUI state.',
        language: 'Swift',
        stars: 760,
        forks: 33,
        pushedAt: '2026-08-29T11:12:00Z',
      },
    ],
    score: 89,
  },
  {
    username: 'devon-okafor',
    name: 'Devon Okafor',
    avatarUrl: 'https://i.pravatar.cc/160?img=33',
    location: 'Lagos, NG',
    bio: 'ML infra. PyTorch, Ray, GPU scheduling.',
    followers: 2210,
    following: 150,
    publicRepos: 91,
    languages: ['Python', 'C++'],
    topRepos: [
      {
        name: 'gpu-fairshare',
        description: 'Fair-share scheduler for shared GPU clusters.',
        language: 'Python',
        stars: 1890,
        forks: 129,
        pushedAt: '2026-09-30T07:55:00Z',
      },
      {
        name: 'tracelite',
        description: 'Minimal tracing for PyTorch DataLoader bottlenecks.',
        language: 'C++',
        stars: 640,
        forks: 42,
        pushedAt: '2026-09-11T13:20:00Z',
      },
    ],
    score: 85,
  },
  {
    username: 'araujo-ci',
    name: 'Camila Araújo',
    avatarUrl: 'https://i.pravatar.cc/160?img=25',
    location: 'São Paulo, BR',
    bio: 'DevEx and CI at scale. GitHub Actions, Docker, Kotlin.',
    followers: 980,
    following: 302,
    publicRepos: 120,
    languages: ['Kotlin', 'Shell'],
    topRepos: [
      {
        name: 'actions-fastcache',
        description: 'Drop-in caching for GitHub Actions workflows.',
        language: 'Kotlin',
        stars: 1520,
        forks: 98,
        pushedAt: '2026-10-05T18:33:00Z',
      },
      {
        name: 'dockerslim-scripts',
        description: 'Hardened, minimal Dockerfiles with defaults baked in.',
        language: 'Shell',
        stars: 410,
        forks: 25,
        pushedAt: '2026-08-21T10:02:00Z',
      },
    ],
    score: 78,
  },
  {
    username: 'nils-b',
    name: 'Nils Bergström',
    avatarUrl: 'https://i.pravatar.cc/160?img=68',
    location: 'Stockholm, SE',
    bio: 'Open-source maintainer. Compilers, WASM, Rust.',
    followers: 5400,
    following: 41,
    publicRepos: 55,
    languages: ['Rust', 'Zig'],
    topRepos: [
      {
        name: 'wasmjit-mini',
        description: 'A tiny teaching-oriented JIT targeting WASM.',
        language: 'Rust',
        stars: 6100,
        forks: 410,
        pushedAt: '2026-10-11T06:48:00Z',
      },
      {
        name: 'zig-build-cache',
        description: 'Remote build cache for the Zig toolchain.',
        language: 'Zig',
        stars: 530,
        forks: 30,
        pushedAt: '2026-07-30T20:10:00Z',
      },
    ],
    score: 94,
  },
  {
    username: 'haruka-dev',
    name: 'Haruka Ito',
    avatarUrl: 'https://i.pravatar.cc/160?img=16',
    location: 'Tokyo, JP',
    bio: 'Realtime infrastructure. WebRTC, Elixir, Nerves.',
    followers: 1420,
    following: 187,
    publicRepos: 70,
    languages: ['Elixir', 'C'],
    topRepos: [
      {
        name: 'webrtc-mesh',
        description: 'Small-mesh SFU in Elixir with adaptive bitrate.',
        language: 'Elixir',
        stars: 2050,
        forks: 151,
        pushedAt: '2026-10-01T12:26:00Z',
      },
      {
        name: 'nerves-telemetry',
        description: 'Telemetry exporters for Nerves devices.',
        language: 'C',
        stars: 340,
        forks: 19,
        pushedAt: '2026-09-05T03:17:00Z',
      },
    ],
    score: 83,
  },
  {
    username: 'k-vasquez',
    name: 'Karla Vásquez',
    avatarUrl: 'https://i.pravatar.cc/160?img=44',
    location: 'Mexico City, MX',
    bio: 'Accessibility + mobile. React Native, Swift, a11y audits.',
    followers: 870,
    following: 260,
    publicRepos: 48,
    languages: ['TypeScript', 'Swift'],
    topRepos: [
      {
        name: 'a11y-rn',
        description: 'Accessibility lint rules for React Native apps.',
        language: 'TypeScript',
        stars: 1310,
        forks: 74,
        pushedAt: '2026-09-27T16:59:00Z',
      },
      {
        name: 'voiceover-notes',
        description: 'Swift helper for richer VoiceOver announcements.',
        language: 'Swift',
        stars: 290,
        forks: 12,
        pushedAt: '2026-08-14T09:41:00Z',
      },
    ],
    score: 74,
  },
  {
    username: 'patel-rust',
    name: 'Rohan Patel',
    avatarUrl: 'https://i.pravatar.cc/160?img=59',
    location: 'Bengaluru, IN',
    bio: 'Databases. Storage engines, consensus, observability.',
    followers: 4100,
    following: 78,
    publicRepos: 62,
    languages: ['Rust', 'Go'],
    topRepos: [
      {
        name: 'tiny-lsm',
        description: 'Educational LSM-tree storage engine in Rust.',
        language: 'Rust',
        stars: 5800,
        forks: 350,
        pushedAt: '2026-10-09T08:22:00Z',
      },
      {
        name: 'raftviz',
        description: 'Visual debugger for Raft consensus traces.',
        language: 'Go',
        stars: 1760,
        forks: 110,
        pushedAt: '2026-09-22T19:04:00Z',
      },
    ],
    score: 91,
  },
];

export const candidates: Candidate[] = [
  { login: 'sindresorhus', name: 'Sindre Sorhus', role: 'Front-End', language: 'TypeScript', location: 'Oslo', score: 96, avatar: 'https://github.com/sindresorhus.png', stage: 'Interviewing', availability: 'Open to work' },
  { login: 'yyx990803', name: 'Evan You', role: 'Front-End', language: 'TypeScript', location: 'Singapore', score: 94, avatar: 'https://github.com/yyx990803.png', stage: 'Saved', availability: 'Freelance' },
  { login: 'cassidoo', name: 'Cassidy Williams', role: 'Full-Stack', language: 'JavaScript', location: 'Chicago', score: 91, avatar: 'https://github.com/cassidoo.png', stage: 'Saved', availability: 'Open to work' },
  { login: 'gaearon', name: 'Dan Abramov', role: 'Front-End', language: 'JavaScript', location: 'London', score: 89, avatar: 'https://github.com/gaearon.png', stage: 'Hired', availability: 'Not available' },
];

export const feedProjects: FeedProject[] = [
  {
    id: 101, name: 'Nusa Commerce',
    description: 'Aplikasi marketplace mobile dengan payment gateway, live tracking, dan seller analytics.',
    role: 'Mobile', stack: ['Flutter 65%', 'Dart 35%'], location: 'Jakarta', score: 96, active: true, demo: 'Play Store', stars: 1280,
    developer: { login: 'angga-risky', name: 'Angga Risky', role: 'Mobile', language: 'Dart', location: 'Jakarta', score: 96, avatar: 'https://github.com/angga-risky.png', stage: 'Saved', availability: 'Open to work' },
  },
  {
    id: 102, name: 'Sentra AI Vision',
    description: 'Computer vision pipeline untuk inspeksi kualitas manufaktur secara real-time.',
    role: 'Data', stack: ['Python 72%', 'PyTorch 28%'], location: 'Bandung', score: 94, active: true, demo: 'Live Web', stars: 842,
    developer: { login: 'alishobeiri', name: 'Ali Shobeiri', role: 'AI / Data', language: 'Python', location: 'Bandung', score: 94, avatar: 'https://github.com/alishobeiri.png', stage: 'Interviewing', availability: 'Open to work' },
  },
  {
    id: 103, name: 'Karsa Microservices',
    description: 'High-performance commerce API dengan event-driven architecture dan observability.',
    role: 'Back-End', stack: ['Go 78%', 'Docker 22%'], location: 'Indonesia', score: 92, active: true, demo: 'API Docs', stars: 634,
    developer: { login: 'mgechev', name: 'Minko Gechev', role: 'Back-End', language: 'Go', location: 'Indonesia', score: 92, avatar: 'https://github.com/mgechev.png', stage: 'Saved', availability: 'Freelance' },
  },
  {
    id: 104, name: 'Ruang Dashboard',
    description: 'Accessible analytics dashboard dengan collaborative workspace dan modular charts.',
    role: 'Front-End', stack: ['React 58%', 'TypeScript 42%'], location: 'Surabaya', score: 90, active: false, demo: 'Vercel', stars: 471,
    developer: { login: 'cassidoo', name: 'Cassidy Williams', role: 'Front-End', language: 'TypeScript', location: 'Surabaya', score: 90, avatar: 'https://github.com/cassidoo.png', stage: 'Saved', availability: 'Open to work' },
  },
];

export const fallbackUser: GithubUser = {
  login: 'octocat',
  name: 'The Octocat',
  avatar_url: 'https://github.com/octocat.png',
  bio: "GitHub's friendly mascot, exploring code and open source.",
  followers: 16298,
  following: 9,
  public_repos: 8,
  location: 'San Francisco',
  html_url: 'https://github.com/octocat',
};

export const fallbackRepos: GithubRepo[] = [
  { id: 1, name: 'Spoon-Knife', description: 'A delightful repository for testing and learning.', language: 'TypeScript', stargazers_count: 13076, forks_count: 2401, homepage: 'https://octocat.github.io', pushed_at: '2025-01-12', html_url: 'https://github.com/octocat/Spoon-Knife' },
  { id: 2, name: 'Hello-World', description: 'My first repository on GitHub!', language: 'Go', stargazers_count: 3041, forks_count: 328, pushed_at: '2024-11-04', html_url: 'https://github.com/octocat/Hello-World' },
];

export const seedLanguages = [
  'TypeScript',
  'Go',
  'Rust',
  'Python',
  'Kotlin',
  'Swift',
  'Elixir',
  'C',
  'C++',
  'Zig',
  'Shell',
] as const;
