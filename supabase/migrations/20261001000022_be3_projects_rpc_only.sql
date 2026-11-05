-- supabase/migrations/20261001000022_be3_projects_rpc_only.sql
-- A3 (hardening BE-3): akses baca `public.projects` HANYA lewat RPC.
--
-- Konteks: migrasi 019 menjalankan `revoke all on public.projects from
-- authenticated`, tetapi tetap membuat kebijakan
-- "projects: visible or owner read". Tanpa GRANT SELECT, kebijakan itu tidak
-- pernah dievaluasi untuk `authenticated` (klien tidak bisa membaca tabel
-- langsung; hanya RPC SECURITY DEFINER). Kebijakan inert menyesatkan pembaca
-- matriks RLS, jadi dihapus di sini.
--
-- Keputusan: RPC-only. Tidak ada GRANT tabel langsung untuk anon/authenticated;
-- baca lewat search_projects / featured_projects / my_projects. Tulis hanya
-- service_role (Edge Function publish-project) — tanpa kebijakan tulis.
-- Alasan lengkap: docs/backend/decisions.md (ADR-015).

-- Tidak ada privilese tabel langsung untuk peran klien (termasuk anon yang
-- sebelumnya belum dicabut eksplisit).
revoke all on public.projects from anon, authenticated;

-- Hapus seluruh kebijakan lama, termasuk kebijakan baca yang inert.
drop policy if exists "projects: visible or owner read" on public.projects;
drop policy if exists "projects: public read" on public.projects;
drop policy if exists "projects: owner read" on public.projects;
drop policy if exists "projects: owner insert" on public.projects;
drop policy if exists "projects: owner update" on public.projects;
drop policy if exists "projects: owner delete" on public.projects;

comment on table public.projects is
  'Proyek developer. RLS aktif; TIDAK ada grant/kebijakan untuk anon/authenticated — baca hanya via RPC definer (search_projects, featured_projects, my_projects), tulis hanya service_role. Lihat ADR-015.';
