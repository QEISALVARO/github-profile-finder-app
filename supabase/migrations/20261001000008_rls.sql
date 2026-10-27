-- supabase/migrations/20261001000008_rls.sql
-- Row Level Security: aktifkan di semua tabel public + kebijakan PRD v2 §7.1
-- DEFAULT DENY: tidak ada aksi yang diizinkan kecuali ada kebijakan eksplisit

-- ─── Aktifkan RLS ─────────────────────────────────────────────────────────────
alter table public.countries          enable row level security;
alter table public.cities             enable row level security;
alter table public.profiles           enable row level security;
alter table public.developer_settings enable row level security;
alter table public.recruiter_profiles enable row level security;
alter table public.github_snapshots   enable row level security;
alter table public.analyses           enable row level security;
alter table public.projects           enable row level security;
alter table public.keyword_aliases    enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.pipeline_entries   enable row level security;
alter table public.reports            enable row level security;
alter table public.push_tokens        enable row level security;
alter table public.blocks             enable row level security;
alter table public.abuse_reports      enable row level security;

-- ─── countries: baca publik (authenticated), tulis service role ──────────────
create policy "countries: authenticated read"
  on public.countries for select to authenticated using (true);

-- ─── cities: baca publik (authenticated), tulis service role ─────────────────
create policy "cities: authenticated read"
  on public.cities for select to authenticated using (true);

-- ─── keyword_aliases: baca publik (authenticated), tulis service role ─────────
create policy "keyword_aliases: authenticated read"
  on public.keyword_aliases for select to authenticated using (true);

-- ─── profiles ─────────────────────────────────────────────────────────────────
-- Baca diri sendiri
create policy "profiles: owner read"
  on public.profiles for select to authenticated
  using (id = auth.uid());

-- Baca profil developer lain HANYA bila listed=true (+ negara terisi)
create policy "profiles: public listed read"
  on public.profiles for select to authenticated
  using (
    id != auth.uid()
    and exists (
      select 1 from public.developer_settings ds
      where ds.user_id = profiles.id and ds.listed = true
    )
    and country_code is not null
  );

-- Baca profil lawan bicara di percakapan aktif
create policy "profiles: conversation participant read"
  on public.profiles for select to authenticated
  using (
    id != auth.uid()
    and exists (
      select 1 from public.conversations c
      where
        c.status = ''active''
        and (
          (c.recruiter_id = auth.uid() and c.developer_id = profiles.id)
          or
          (c.developer_id = auth.uid() and c.recruiter_id = profiles.id)
        )
    )
  );

-- Update diri sendiri (kolom sensitif dikunci di RPC)
create policy "profiles: owner update"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- github_id dan country_source tidak bisa diubah langsung oleh klien
    -- (dibatasi di RPC; klien tidak bisa set github_id atau country_source='inferred')
  );

-- ─── developer_settings ───────────────────────────────────────────────────────
create policy "developer_settings: owner read/write"
  on public.developer_settings for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Recruiter hanya baca bila developer listed
create policy "developer_settings: recruiter read listed"
  on public.developer_settings for select to authenticated
  using (
    user_id != auth.uid()
    and listed = true
  );

-- ─── recruiter_profiles ───────────────────────────────────────────────────────
create policy "recruiter_profiles: owner read/write"
  on public.recruiter_profiles for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── github_snapshots: hanya service role yang menulis ───────────────────────
create policy "github_snapshots: authenticated read"
  on public.github_snapshots for select to authenticated using (true);

-- ─── analyses: hanya service role yang menulis ───────────────────────────────
create policy "analyses: authenticated read"
  on public.analyses for select to authenticated using (true);

-- ─── projects ─────────────────────────────────────────────────────────────────
-- Baca jika published and not is_hidden dan pemilik listed
create policy "projects: public read"
  on public.projects for select to authenticated
  using (
    published = true
    and is_hidden = false
    and (
      -- pemilik bisa baca proyeknya sendiri
      owner_id = auth.uid()
      or
      -- proyek lain: pemilik harus listed
      exists (
        select 1 from public.developer_settings ds
        where ds.user_id = projects.owner_id and ds.listed = true
      )
    )
  );

-- Tulis hanya pemilik
create policy "projects: owner insert"
  on public.projects for insert to authenticated
  with check (owner_id = auth.uid());

create policy "projects: owner update"
  on public.projects for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "projects: owner delete"
  on public.projects for delete to authenticated
  using (owner_id = auth.uid());

-- ─── conversations ────────────────────────────────────────────────────────────
create policy "conversations: participant read"
  on public.conversations for select to authenticated
  using (auth.uid() in (recruiter_id, developer_id));

create policy "conversations: recruiter insert"
  on public.conversations for insert to authenticated
  with check (recruiter_id = auth.uid());

create policy "conversations: participant update"
  on public.conversations for update to authenticated
  using (auth.uid() in (recruiter_id, developer_id));

-- ─── messages ─────────────────────────────────────────────────────────────────
create policy "participants read"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.recruiter_id, c.developer_id)
    )
  );

create policy "participants send"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.recruiter_id, c.developer_id)
        and c.status = ''active''
    )
  );

-- ─── pipeline_entries ─────────────────────────────────────────────────────────
create policy "pipeline_entries: owner read/write"
  on public.pipeline_entries for all to authenticated
  using (recruiter_id = auth.uid())
  with check (recruiter_id = auth.uid());

-- ─── reports ──────────────────────────────────────────────────────────────────
create policy "reports: owner read/write"
  on public.reports for all to authenticated
  using (recruiter_id = auth.uid())
  with check (recruiter_id = auth.uid());

-- ─── push_tokens ──────────────────────────────────────────────────────────────
create policy "push_tokens: owner read/write"
  on public.push_tokens for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── blocks ───────────────────────────────────────────────────────────────────
create policy "blocks: owner read/write"
  on public.blocks for all to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- ─── abuse_reports ────────────────────────────────────────────────────────────
create policy "abuse_reports: reporter insert"
  on public.abuse_reports for insert to authenticated
  with check (reporter_id = auth.uid());

create policy "abuse_reports: reporter read"
  on public.abuse_reports for select to authenticated
  using (reporter_id = auth.uid());
