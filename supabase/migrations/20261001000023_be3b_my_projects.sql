-- supabase/migrations/20261001000023_be3b_my_projects.sql
-- BE-3b: RPC my_projects() -> MyProjectsPage.
--
-- Layar "My Projects" membutuhkan proyek MILIK SENDIRI, termasuk yang belum
-- published/visible atau sedang di-hide admin (agar pemilik dapat memanggil
-- unpublish_project/republish_project dengan project_id yang benar).
-- Klien tidak dapat membaca public.projects langsung (ADR-015), jadi akses
-- diberikan lewat RPC definer ini.
--
-- Aturan:
-- - hanya baris owner_id = auth.uid(); peran developer wajib (FORBIDDEN).
-- - auth.uid() null -> UNAUTHORIZED (anon).
-- - urut created_at desc, id desc; keyset kursor base64url {"c","id"}.
-- - maksimum 100 baris per halaman (default 20).
-- - rate limit 120/jam (app_rate_limits.my_projects).
-- - tidak pernah mengembalikan email (tidak ada kolom email di projects).

create or replace function public.my_projects(
  p_cursor text default null,
  p_lim int default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_lim int := greatest(1, least(100, coalesce(p_lim, 20)));
  v_c timestamptz;
  v_id uuid;
  v_rows jsonb;
  v_next text;
  v_allowed boolean;
  v_retry int;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'developer' = any (p.roles)
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select allowed, retry_after into v_allowed, v_retry
  from public.check_rate_limit(
    auth.uid(),
    'my_projects',
    (select max_count from public.app_rate_limits where key = 'my_projects'),
    (select window_len from public.app_rate_limits where key = 'my_projects')
  );
  if not v_allowed then
    raise exception 'RATE_LIMITED: retry_after=%', v_retry using errcode = 'P0001';
  end if;

  -- Kursor base64url {"c": created_at, "id": uuid}. Kursor rusak -> VALIDATION.
  if p_cursor is not null and p_cursor <> '' then
    declare
      v_std text := translate(p_cursor, '-_', '+/');
    begin
      v_std := v_std || repeat('=', (4 - length(v_std) % 4) % 4);
      select (convert_from(decode(v_std, 'base64'), 'utf8')::jsonb->>'c')::timestamptz,
             ((convert_from(decode(v_std, 'base64'), 'utf8')::jsonb)->>'id')::uuid
      into v_c, v_id;
    exception when others then
      raise exception 'VALIDATION' using errcode = 'P0001';
    end;
    if v_c is null or v_id is null then
      raise exception 'VALIDATION' using errcode = 'P0001';
    end if;
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(x) - 'sort_c' - 'sort_id' order by x.sort_c desc, x.sort_id desc),
    '[]'::jsonb
  )
  into v_rows
  from (
    select
      p.id::text as "projectId",
      p.github_repo_id as "githubRepoId",
      p.name,
      p.description,
      p.role,
      (select coalesce(
          jsonb_agg(
            jsonb_build_object('name', s->>'name', 'percent', (s->>'percent')::int)
            order by (s->>'percent')::int desc
          ), '[]'::jsonb)
       from jsonb_array_elements(coalesce(p.stack, '[]'::jsonb)) s) as stack,
      p.active,
      p.demo_url as "demoUrl",
      p.demo_verified as "demoVerified",
      coalesce(p.score, 0) as score,
      p.stars,
      p.pushed_at as "pushedAt",
      p.published,
      p.visible,
      p.is_hidden as "isHidden",
      p.country_code as "countryCode",
      p.city,
      p.created_at as sort_c,
      p.id as sort_id
    from public.projects p
    where p.owner_id = auth.uid()
      and (v_c is null or (p.created_at, p.id) < (v_c, v_id))
    order by p.created_at desc, p.id desc
    limit v_lim + 1
  ) x;

  if jsonb_array_length(v_rows) > v_lim then
    v_rows := (
      select jsonb_agg(e order by ord)
      from jsonb_array_elements(v_rows) with ordinality a(e, ord)
      where ord <= v_lim
    );
    select encode(convert_to(
      jsonb_build_object('c', v_rows->-1->>'sort_c', 'id', v_rows->-1->>'sort_id')::text,
      'utf8'
    ), 'base64') into v_next;
    v_next := translate(rtrim(regexp_replace(v_next, '\s+', '', 'g'), '='), '+/', '-_');
  else
    v_next := null;
  end if;

  v_rows := (
    select coalesce(jsonb_agg(e - 'sort_c' - 'sort_id' order by ord), '[]'::jsonb)
    from jsonb_array_elements(v_rows) with ordinality a(e, ord)
  );

  return jsonb_build_object('items', v_rows, 'nextCursor', v_next);
end;
$func$;

comment on function public.my_projects(text, int) is
  'BE-3b RPC: proyek milik pemanggil (developer) termasuk unpublished/hidden; keyset kursor, maks 100, rate limit 120/jam. SECURITY DEFINER terkunci.';

insert into public.app_rate_limits (key, max_count, window_len, description) values
  ('my_projects', 120, '1 hour', 'Daftar proyek milik pemanggil (BE-3b)')
on conflict (key) do update set
  max_count = excluded.max_count,
  window_len = excluded.window_len,
  description = excluded.description;
