#!/usr/bin/env bash
# scripts/backend/mutation-check.sh
# Uji mutasi M1-M5: membuktikan pgTAP benar-benar menangkap regresi.
# BUTUH: Supabase lokal hidup (make up && make reset). JANGAN di-commit
# dalam keadaan termutasi — skrip selalu memulihkan via `make reset`.
#
# Cara pakai: bash scripts/backend/mutation-check.sh
# Setiap mutasi: terapkan -> make test-db (HARUS ada not ok) -> make reset.
# Bila mutasi TIDAK menggagalkan tes apa pun -> celah cakupan, tambahkan
# asersi pgTAP di supabase/tests/ lalu ulangi.
set -u

SUPABASE="${SUPABASE:-npx supabase}"
PASS=0
FAIL=0

run_mutation() {
  local id="$1" desc="$2" sql="$3" expect_fail="$4"
  echo "=== $id: $desc ==="
  # shellcheck disable=SC2086
  $SUPABASE db execute --local "$sql" 2>&1 | tail -n 2
  local out
  out=$($SUPABASE test db 2>&1)
  echo "$out" | grep -E "not ok|# Failed|Result:" | head -n 10
  if echo "$out" | grep -q "not ok"; then
    echo "$id: GAGAL sesuai harapan (bagus) — tes menangkap mutasi."
    PASS=$((PASS + 1))
  else
    echo "$id: TIDAK gagal — CELAH CAKUPAN pada $expect_fail."
    FAIL=$((FAIL + 1))
  fi
  echo "--- memulihkan via make reset ---"
  make reset 2>&1 | tail -n 2
  echo ""
}

# M1: matikan RLS messages -> 01 dan 03 harus gagal
run_mutation "M1" "disable RLS public.messages" \
  "alter table public.messages disable row level security;" \
  "01_rls_enabled, 03_rls_policies"

# M2: hapus trigger POL-9 -> 04 harus gagal
run_mutation "M2" "drop trigger POL-9 pada developer_settings" \
  "drop trigger if exists developer_settings_pol9_check on public.developer_settings;" \
  "04_pol9_enforcement"

# M3: bocorkan analyses ke authenticated -> 02 harus gagal
run_mutation "M3" "grant select analyses ke authenticated" \
  "grant select on public.analyses to authenticated;" \
  "02_default_deny"

# M4: Paris -> FR (seharusnya NULL ambigu) -> 05 harus gagal
run_mutation "M4" "normalize_location Paris mengembalikan FR" \
  "create or replace function public.normalize_location(t text) returns table(country_code char(2), city text) language sql immutable as \$\$ select 'FR'::char(2), null::text \$\$;" \
  "05_location_normalize"

# M5: longgarkan insert messages tanpa status active -> 03 harus gagal
run_mutation "M5" "tambah kebijakan insert messages permissive" \
  "create policy messages_mutation_m5 on public.messages for insert to authenticated with check (true);" \
  "03_rls_policies"

echo "=== RINGKASAN: $PASS mutasi tertangkap, $FAIL celah cakupan ==="
make reset 2>&1 | tail -n 1
[ "$FAIL" -eq 0 ]
