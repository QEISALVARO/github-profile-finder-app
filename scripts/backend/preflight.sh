#!/usr/bin/env bash
# Preflight dependency backend. Jangan pernah mengubah "tidak tersedia" menjadi
# lulus: script ini keluar non-zero dan menjelaskan apa yang belum terverifikasi.
set -u

missing=0

note() {
  printf '  - %s\n' "$1"
}

echo "Preflight backend Gitscope"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker      : TIDAK ADA"
  note "Install Docker Desktop/Engine dan pastikan daemon berjalan."
  missing=1
elif ! docker info >/dev/null 2>&1; then
  echo "Docker      : TIDAK BERJALAN"
  note "Jalankan Docker daemon sebelum make up / make reset."
  missing=1
else
  echo "Docker      : OK"
fi

if command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI: OK ($(supabase --version 2>/dev/null | head -n 1))"
elif npx --no-install supabase --version >/dev/null 2>&1; then
  echo "Supabase CLI: OK (npx, lokal)"
elif command -v npx >/dev/null 2>&1; then
  echo "Supabase CLI: TIDAK TERPASANG"
  note "Install: https://supabase.com/docs/guides/cli (atau npm i -D supabase)."
  note "CI menyediakan CLI lewat supabase/setup-cli."
  missing=1
else
  echo "Supabase CLI: TIDAK ADA (npx juga tidak ada)"
  missing=1
fi

if command -v deno >/dev/null 2>&1; then
  echo "Deno        : OK ($(deno --version 2>/dev/null | head -n 1))"
else
  echo "Deno        : TIDAK ADA"
  note "Install Deno untuk contract/function tests, atau jalankan job CI backend."
  missing=1
fi

if [ "$missing" -ne 0 ]; then
  cat <<'EOF'

STATUS: BLOCKED — dependency backend belum lengkap.
Migration, pgTAP, dan Deno contract tests BELUM terverifikasi di environment ini.
Jangan menandainya lulus. Alternatif: jalankan job "Backend CI" di GitHub Actions
(.github/workflows/backend.yml), yang melakukan start Supabase, db reset, pgTAP,
type check, dan Deno tests.
EOF
  exit 2
fi

echo "STATUS: dependency backend tersedia."
