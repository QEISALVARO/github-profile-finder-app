# Makefile — Gitscope Backend baku
# Prasyarat: Docker, Supabase CLI (npx supabase / supabase), Deno

.PHONY: up down reset test test-db test-contracts types lint help bench-seed preflight

SUPABASE ?= npx supabase
DENO ?= deno

help:
	@echo "Gitscope Backend Commands:"
	@echo "  make preflight   - Periksa Docker/Supabase CLI/Deno sebelum test backend"
	@echo "  make up          - Start local Supabase containers (Docker)"
	@echo "  make down        - Stop local Supabase containers"
	@echo "  make reset       - Reset local database (run all migrations & seeds from scratch)"
	@echo "  make test        - Run both pgTAP database tests and Deno contract tests"
	@echo "  make test-db     - Run pgTAP tests via Supabase CLI"
	@echo "  make test-contracts - Run Deno contract and schema tests"
	@echo "  make types       - Generate TypeScript definitions to contracts/src/database.types.ts"
	@echo "  make lint        - Lint local Supabase database migrations"
	@echo "  make bench-seed  - Load 10k proyek sintetis utk bench feed (BUKAN bagian reset)"

preflight:
	bash scripts/backend/preflight.sh

up: preflight
	$(SUPABASE) start

down:
	$(SUPABASE) stop

reset: preflight up
	$(SUPABASE) db reset

test: preflight test-db test-contracts

test-db: preflight
	$(SUPABASE) test db

test-contracts: preflight
	$(DENO) test --frozen --config contracts/deno.json --allow-read --allow-env contracts/tests/
	$(DENO) test --frozen --config supabase/deno.json --allow-read --allow-env supabase/functions/

types: preflight
	$(SUPABASE) gen types typescript --local --schema public > contracts/src/database.types.ts

lint: preflight
	$(SUPABASE) db lint

# Bench feed: TIDAK otomatis di reset; muat manual sebelum bench-feed.ts.
bench-seed:
	$(SUPABASE) db execute --local -f supabase/seed/bench.sql
