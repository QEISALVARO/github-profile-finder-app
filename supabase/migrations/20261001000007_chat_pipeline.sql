-- supabase/migrations/20261001000007_chat_pipeline.sql
-- Tabel conversations, messages, pipeline_entries, reports, push_tokens, blocks, abuse_reports

create table public.conversations (
  id               uuid primary key default gen_random_uuid(),
  recruiter_id     uuid not null references public.profiles,
  developer_id     uuid not null references public.profiles,
  project_id       uuid references public.projects,
  context_label    text,
  status           text not null default 'active' check (status in ('active', 'declined', 'blocked')),
  last_message_at  timestamptz,
  created_at       timestamptz not null default now(),
  unique (recruiter_id, developer_id, project_id)
);
comment on table public.conversations is 'Percakapan recruiter<->developer. status: active|declined|blocked.';

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations on delete cascade,
  sender_id        uuid not null references public.profiles,
  body             text not null check (length(body) between 1 and 4000),
  created_at       timestamptz not null default now(),
  delivered_at     timestamptz,
  read_at          timestamptz
);
create index on public.messages (conversation_id, created_at);
comment on table public.messages is 'Pesan realtime. Panjang maks 4000 karakter.';

create table public.pipeline_entries (
  id              uuid primary key default gen_random_uuid(),
  recruiter_id    uuid not null references public.profiles on delete cascade,
  github_login    text not null,
  stage           public.pipeline_stage not null default 'saved',
  note            text,
  updated_at      timestamptz not null default now(),
  unique (recruiter_id, github_login)
);
comment on table public.pipeline_entries is 'Pipeline rekrutmen per recruiter. Hanya pemilik yang bisa akses.';

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles on delete cascade,
  analysis_id  uuid not null references public.analyses,
  storage_path text,
  created_at   timestamptz not null default now()
);
comment on table public.reports is 'Laporan PDF per-kandidat (POL-3: hanya per-kandidat, tanpa ekspor massal).';

create table public.push_tokens (
  user_id  uuid references public.profiles on delete cascade,
  token    text not null,
  platform text,
  primary key (user_id, token)
);
comment on table public.push_tokens is 'Token push notification Expo per device.';

create table public.blocks (
  blocker_id  uuid references public.profiles on delete cascade,
  blocked_id  uuid references public.profiles on delete cascade,
  primary key (blocker_id, blocked_id)
);
comment on table public.blocks is 'Blokir antar pengguna.';

create table public.abuse_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles,
  target_type text,
  target_id   text,
  reason      text,
  created_at  timestamptz default now()
);
comment on table public.abuse_reports is 'Laporan penyalahgunaan (moderasi).';
