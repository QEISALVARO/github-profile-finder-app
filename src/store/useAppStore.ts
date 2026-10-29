import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { fallbackRepos, fallbackUser } from '@/data/seed';
import type { AnalysisVM } from '../../contracts/src/types.ts';
import type { Candidate, GithubRepo, GithubUser } from '@/types';
import type { ThemeMode } from '@/theme/tokens';

// ---------------------------------------------------------------------------
// M3b additions (PRD §6) — analysis state read by the Analysis screen. All
// additions are additive; M2 keys (query, feedRole, feedLocation, recentOnly,
// error, loadingId) are untouched. M3c will add the analyzeDeveloper action
// that fills user/repos and resets `saved` (M2's setAnalysisTarget already
// resets `saved`).
// ---------------------------------------------------------------------------

export type ChatPerson = GithubUser | Candidate;

// ---------------------------------------------------------------------------
// PRD §6 — app state skeleton. Every key ships with its default now; feature
// milestones (M1+) only replace defaults with real logic.
// ---------------------------------------------------------------------------

export type TabKey = 'explore' | 'talent' | 'inbox' | 'profile';

export interface FilterState {
  language: string | null;
  minStars: number;
  maxResultAgeDays: number;
}

export interface AnalysisProgress {
  status: 'idle' | 'running' | 'done' | 'error';
  step: string | null;
  progress: number; // 0..1
}

export interface InboxItem {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
}

export interface ProfileState {
  savedUsernames: string[];
  lastQuery: string | null;
}

interface AppState {
  // --- D4: the ONLY persisted key is the theme toggle -----------------------
  themeMode: ThemeMode | 'system';
  setThemeMode: (mode: ThemeMode | 'system') => void;
  toggleTheme: () => void;

  // --- Explore feed (PRD §6) — NOT persisted --------------------------------
  query: string;
  setQuery: (q: string) => void;
  feedRole: string;
  setFeedRole: (role: string) => void;
  feedLocation: string;
  setFeedLocation: (location: string) => void;
  recentOnly: boolean;
  toggleRecentOnly: () => void;
  /** FR-E9 — empty string means no error. */
  error: string;
  setError: (error: string) => void;
  /** D2 — id of the card currently running Analyze, null = none. */
  loadingId: number | null;
  setLoadingId: (id: number | null) => void;
  /** FR-E8 — resets query/role/location/recentOnly, never error/loadingId. */
  resetFeedFilters: () => void;

  // --- Legacy M0 filters (kept for Talent/Analysis milestones) --------------
  filters: FilterState;
  setFilters: (patch: Partial<FilterState>) => void;
  resetFilters: () => void;

  // --- Analysis target ------------------------------------------------------
  /** Currently analysed developer; also drives the Profile tab (PRD §6). */
  user: GithubUser;
  repos: GithubRepo[];
  saved: boolean;
  /** R2: target lama (adapter VM) + VM penuh dari BE untuk komponen nyata. */
  setAnalysisTarget: (user: GithubUser, repos: GithubRepo[]) => void;
  /** AnalysisVM penuh dari Edge Function; null = belum ada analisis BE. */
  analysisVm: AnalysisVM | null;
  /** Banner stale (POL-5) — null berarti data fresh/cache tanpa peringatan. */
  staleNotice: string | null;
  setAnalysisVm: (vm: AnalysisVM | null, staleNotice?: string | null) => void;
  analysis: AnalysisProgress;
  setAnalysis: (patch: Partial<AnalysisProgress>) => void;
  resetAnalysis: () => void;

  // --- Inbox ----------------------------------------------------------------
  inbox: InboxItem[];
  unreadCount: number;
  markInboxRead: () => void;

  // --- Profile --------------------------------------------------------------
  profile: ProfileState;
  toggleSaved: (username: string) => void;

  // --- Active tab (kept for deep links / restore) ---------------------------
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;

  // --- Analysis (PRD §6) — M3b additive keys --------------------------------
  // NOTE: `user` / `repos` / `saved` live in the M2 "Analysis target" block
  // above — they are declared once, not twice.
  chat: { open: boolean; project: string; person: ChatPerson | null };
  notice: string;
  setUser: (user: GithubUser) => void;
  setRepos: (repos: GithubRepo[]) => void;
  setSaved: (saved: boolean) => void;
  openChat: (project?: string, person?: ChatPerson | null) => void;
  showNotice: (notice: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      themeMode: 'dark',
      setThemeMode: (mode) => set({ themeMode: mode }),
      toggleTheme: () => {
        const current = get().themeMode;
        const next =
          current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
        set({ themeMode: next });
      },

      query: '',
      setQuery: (query) => set({ query }),
      feedRole: 'All',
      setFeedRole: (feedRole) => set({ feedRole }),
      feedLocation: 'All locations',
      setFeedLocation: (feedLocation) => set({ feedLocation }),
      recentOnly: false,
      toggleRecentOnly: () => set((s) => ({ recentOnly: !s.recentOnly })),
      error: '',
      setError: (error) => set({ error }),
      loadingId: null,
      setLoadingId: (loadingId) => set({ loadingId }),
      resetFeedFilters: () =>
        set({ query: '', feedRole: 'All', feedLocation: 'All locations', recentOnly: false }),

      filters: { language: null, minStars: 50, maxResultAgeDays: 30 },
      setFilters: (patch) =>
        set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () =>
        set({ filters: { language: null, minStars: 50, maxResultAgeDays: 30 } }),

      user: fallbackUser,
      repos: fallbackRepos,
      saved: false,
      setAnalysisTarget: (user, repos) => set({ user, repos, saved: false }),
      analysisVm: null,
      staleNotice: null,
      setAnalysisVm: (analysisVm, staleNotice = null) => set({ analysisVm, staleNotice }),

      analysis: { status: 'idle', step: null, progress: 0 },
      setAnalysis: (patch) =>
        set((s) => ({ analysis: { ...s.analysis, ...patch } })),
      resetAnalysis: () =>
        set({ analysis: { status: 'idle', step: null, progress: 0 } }),

      // M0 demo state: one unread placeholder item so the Inbox dot (FR-G3)
      // is visible before real notifications exist; replaced in M1+.
      inbox: [
        {
          id: 'm0-welcome',
          title: 'Selamat datang di Gitscope',
          body: 'Notifikasi hasil analisis talent akan muncul di sini.',
          createdAt: 0,
          read: false,
        },
      ],
      unreadCount: 1,
      markInboxRead: () =>
        set((s) => ({
          inbox: s.inbox.map((i) => ({ ...i, read: true })),
          unreadCount: 0,
        })),

      profile: { savedUsernames: [], lastQuery: null },
      toggleSaved: (username) =>
        set((s) => {
          const saved = s.profile.savedUsernames.includes(username)
            ? s.profile.savedUsernames.filter((u) => u !== username)
            : [...s.profile.savedUsernames, username];
          return { profile: { ...s.profile, savedUsernames: saved } };
        }),

      activeTab: 'explore',
      setActiveTab: (activeTab) => set({ activeTab }),

      // M3b — additive analysis state (PRD §6). `user`/`repos`/`saved` are
      // owned by the M2 block above; M3b only adds the chat/notice slots and
      // the plain setters the Analysis screen + /dev fixtures need.
      chat: { open: false, project: '', person: null },
      notice: '',
      setUser: (user) => set({ user }),
      setRepos: (repos) => set({ repos }),
      setSaved: (saved) => set({ saved }),
      // Minimal additive actions for FR-A3/FR-A8 — they only set state; the
      // ChatSheet and Toast UIs land in M5.
      openChat: (project = '', person = null) =>
        set({ chat: { open: true, project, person } }),
      showNotice: (notice) => set({ notice }),
    }),
    {
      name: 'gitscope',
      storage: createJSONStorage(() => AsyncStorage),
      // D4 — persist only the dark/theme toggle, nothing else.
      partialize: (s) => ({ themeMode: s.themeMode }),
    }
  )
);
