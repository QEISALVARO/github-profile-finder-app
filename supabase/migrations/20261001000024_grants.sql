-- supabase/migrations/20261001000024_grants.sql
-- Table-level privileges untuk role anon/authenticated.
-- RLS (08) tetap menegakkan baris; grant ini mencegah "permission denied"
-- sebelum RLS dievaluasi (muncul saat RPC/trigger jalan sebagai authenticated).

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

-- rate_limits: hanya service_role (deny table-level untuk anon/authenticated
-- agar RLS/permission menghasilkan penolakan, bukan 0 baris).
revoke all on public.rate_limits from anon, authenticated;

-- sequences (untuk kolom serial/identity, bila ada)
grant usage, select on all sequences in schema public to authenticated;