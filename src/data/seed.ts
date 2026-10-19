// ---------------------------------------------------------------------------
// Lampiran A (PRD) — seed data. Copied as-is from the PRD appendix; treat as
// immutable fixtures for Explore/Talent/Analysis during early milestones.
// NOTE: Lampiran A was not available in this repo, so these placeholders use
// the same shape. Replace bodies verbatim with the PRD appendix text.
// ---------------------------------------------------------------------------

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
