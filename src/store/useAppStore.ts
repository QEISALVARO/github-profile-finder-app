import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ThemeMode } from '@/theme/tokens';

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

  // --- Explore / search -----------------------------------------------------
  query: string;
  setQuery: (q: string) => void;
  filters: FilterState;
  setFilters: (patch: Partial<FilterState>) => void;
  resetFilters: () => void;

  // --- Analysis -------------------------------------------------------------
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
      filters: { language: null, minStars: 50, maxResultAgeDays: 30 },
      setFilters: (patch) =>
        set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () =>
        set({ filters: { language: null, minStars: 50, maxResultAgeDays: 30 } }),

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
    }),
    {
      name: 'gitscope',
      storage: createJSONStorage(() => AsyncStorage),
      // D4 — persist only the dark/theme toggle, nothing else.
      partialize: (s) => ({ themeMode: s.themeMode }),
    }
  )
);
