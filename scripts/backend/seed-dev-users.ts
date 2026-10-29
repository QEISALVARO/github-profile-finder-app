// @ts-nocheck
// scripts/backend/seed-dev-users.ts
// Skrip Deno / Node untuk mengisi akun pengguna dev lokal via Supabase Admin API
// Digunakan saat verifikasi lokal agar developer & recruiter dapat login nyata di Supabase Studio / App.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4Mzg3OTYwMH0.dummy_service_role_key";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface DevUser {
  id: string;
  email: string;
  login: string;
  name: string;
  role: "developer" | "recruiter";
  countryCode: string;
  city: string;
}

const DEV_USERS: DevUser[] = [
  {
    id: "11111111-1111-4111-a111-111111111111",
    email: "budi@dev.local",
    login: "budi_id",
    name: "Budi Santoso",
    role: "developer",
    countryCode: "ID",
    city: "Jakarta",
  },
  {
    id: "22222222-2222-4222-a222-222222222222",
    email: "tan@dev.local",
    login: "tan_sg",
    name: "Tan Wei Ming",
    role: "developer",
    countryCode: "SG",
    city: "Singapore",
  },
  {
    id: "33333333-3333-4333-a333-333333333333",
    email: "alex@dev.local",
    login: "alex_us",
    name: "Alex Rivers",
    role: "developer",
    countryCode: "US",
    city: "San Francisco",
  },
  {
    id: "44444444-4444-4444-a444-444444444444",
    email: "lars@dev.local",
    login: "lars_no",
    name: "Lars Olsen",
    role: "developer",
    countryCode: "NO",
    city: "Oslo",
  },
  {
    id: "55555555-5555-4555-a555-555555555555",
    email: "sari_rec@co.local",
    login: "sari_rec",
    name: "Sari Talent Lead",
    role: "recruiter",
    countryCode: "ID",
    city: "Jakarta",
  },
  {
    id: "66666666-6666-4666-a666-666666666666",
    email: "james_rec@co.local",
    login: "james_rec",
    name: "James Hunter",
    role: "recruiter",
    countryCode: "GB",
    city: "London",
  },
];

async function seed() {
  console.log("Seeding dev users into local Supabase...");

  for (const u of DEV_USERS) {
    // 1. Buat atau perbarui di auth.admin
    const { error: authError } = await admin.auth.admin.createUser({
      id: u.id,
      email: u.email,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        user_name: u.login,
        name: u.name,
        avatar_url: `https://avatars.githubusercontent.com/u/${u.login}?v=4`,
      },
    });

    if (authError && !authError.message.includes("already registered")) {
      console.warn(`Warning saat membuat user ${u.email}:`, authError.message);
    }

    // 2. Insert/Update ke public.profiles
    const { error: profileError } = await admin.from("profiles").upsert({
      id: u.id,
      github_login: u.login,
      name: u.name,
      avatar_url: `https://avatars.githubusercontent.com/u/${u.login}?v=4`,
      roles: [u.role],
      country_code: u.countryCode,
      city: u.city,
      country_source: "self",
      country_confidence: 100,
    });

    if (profileError) {
      console.error(`Gagal membuat profil ${u.login}:`, profileError.message);
    } else {
      console.log(`✓ Dev user siap: ${u.login} (${u.role}, ${u.countryCode})`);
    }
  }

  console.log("Selesai seeding akun dev.");
}

seed().catch(console.error);

