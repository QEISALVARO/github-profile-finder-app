import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * R1 Auth & Profil — frontend layer (PRD v2 §6, §11A, §13).
 *
 * Mode saat ini: **UI-only / mock session** (keputusan 20 Okt 2026). Sesi
 * "Continue with GitHub" dibuat lokal dan dipersist; integrasi Supabase
 * (K1/K2 — GitHub OAuth via `signInWithOAuth`) menyusul setelah R0, tanpa
 * mengubah bentuk state di file ini.
 *
 * Kebijakan yang dijaga di sini:
 * - POL-1  `listed` hanya bisa true bila negara domisili terisi.
 * - POL-9  menghapus negara otomatis mematikan `listed`.
 * - POL-4  `open_to_messages` wajib eksplisit (default false).
 * - §11A   `targetCountries` recruiter; kosong = semua negara.
 */

export type UserRole = 'developer' | 'recruiter';
export type Availability = 'open_to_work' | 'freelance' | 'not_available';
export type CountrySource = 'self' | 'inferred';

export interface AuthSession {
  login: string;
  name: string;
  avatarUrl: string;
  githubId: number;
  bio: string | null;
  locationText: string | null;
}

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  open_to_work: 'Open to work',
  freelance: 'Open for freelance',
  not_available: 'Not available',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  developer: 'Developer',
  recruiter: 'Recruiter',
};

/** Ringkasan peran untuk badge Profile (PRD v2 §13). */
export function summarizeRoles(roles: UserRole[]): string {
  if (roles.length === 2) return 'DEVELOPER · RECRUITER';
  if (roles[0] === 'recruiter') return 'RECRUITER';
  return 'DEVELOPER';
}

interface AuthState {
  /** true setelah persist selesai direhydrate — dipakai root layout untuk
      menunda render agar tidak ada redirect palsu saat cold start. */
  hydrated: boolean;

  session: AuthSession | null;
  roles: UserRole[];
  onboarded: boolean;
  /** Error login terakhir (OAuth gagal / dibatalkan) untuk slot UI Welcome. */
  authError: string | null;
  setAuthError: (error: string | null) => void;

  // --- profiles + developer_settings ---------------------------------------
  countryCode: string | null;
  city: string | null;
  countrySource: CountrySource | null;
  listed: boolean;
  openToMessages: boolean;
  availability: Availability;

  // --- recruiter_profiles ---------------------------------------------------
  company: string;
  title: string;
  /** 0..N negara tujuan; kosong = semua negara (PRD v2 §11A). */
  targetCountries: string[];

  // --- actions --------------------------------------------------------------
  signIn: (session: AuthSession) => void;
  signOut: () => void;
  setRoles: (roles: UserRole[]) => void;
  completeOnboarding: () => void;
  /** Menyetujui negara domisili (self = otoritatif, confidence 100). */
  setResidence: (patch: { countryCode: string | null; city?: string | null }) => void;
  setListed: (listed: boolean) => void;
  setOpenToMessages: (value: boolean) => void;
  setAvailability: (value: Availability) => void;
  setRecruiterProfile: (patch: { company?: string; title?: string }) => void;
  setTargetCountries: (iso2: string[]) => void;
  /** Hapus akun (§13): reset seluruh state auth; theme sengaja dipertahankan. */
  deleteAccount: () => void;
}

const initialState = {
  // Gate render hanya untuk native (AsyncStorage async) supaya cold start tidak
  // sempat melempar ke route yang salah. Web client & static render (SSR)
  // dianggap hydrated sejak frame pertama agar tidak terjadi hydration
  // mismatch dengan HTML hasil `expo export -p web`.
  hydrated: Platform.OS === 'web',
  session: null,
  roles: [] as UserRole[],
  onboarded: false,
  authError: null as string | null,
  countryCode: null,
  city: null,
  countrySource: null,
  listed: false,
  openToMessages: false,
  availability: 'not_available' as Availability,
  company: '',
  title: '',
  targetCountries: [] as string[],
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,

      signIn: (session) => set({ session, authError: null }),

      signOut: () => set({ session: null, onboarded: false, authError: null }),

      setAuthError: (authError) => set({ authError }),

      setRoles: (roles) => set({ roles }),

      completeOnboarding: () =>
        set((s) => (s.session && s.roles.length > 0 ? { onboarded: true } : {})),

      setResidence: ({ countryCode, city }) =>
        set((s) => ({
          countryCode,
          city: city === undefined ? s.city : city,
          countrySource: countryCode ? 'self' : null,
          // POL-9 — tanpa negara, developer tidak boleh `listed`.
          listed: countryCode ? s.listed : false,
        })),

      setListed: (listed) =>
        set((s) => ({ listed: listed && Boolean(s.countryCode) })),

      setOpenToMessages: (openToMessages) => set({ openToMessages }),

      setAvailability: (availability) => set({ availability }),

      setRecruiterProfile: (patch) => set((s) => ({ ...s, ...patch })),

      setTargetCountries: (iso2) => set({ targetCountries: iso2 }),

      deleteAccount: () => set({ ...initialState, hydrated: true }),
    }),
    {
      name: 'gitscope.auth',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist seluruh state domain auth (sesi mock + pengaturan), kecuali
      // flag hydration yang hanya berlaku per proses.
      partialize: (s) => ({
        session: s.session,
        roles: s.roles,
        onboarded: s.onboarded,
        countryCode: s.countryCode,
        city: s.city,
        countrySource: s.countrySource,
        listed: s.listed,
        openToMessages: s.openToMessages,
        availability: s.availability,
        company: s.company,
        title: s.title,
        targetCountries: s.targetCountries,
      }),
      onRehydrateStorage: () => () => {
        // Jangan setState saat static render: setState memicu persist menulis
        // storage, dan storage web butuh `window` (crash `window is not
        // defined` saat `expo export -p web`).
        if (typeof window === 'undefined') return;
        useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);
