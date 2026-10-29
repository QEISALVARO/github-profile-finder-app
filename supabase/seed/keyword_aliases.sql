-- supabase/seed/keyword_aliases.sql
-- Seed alias kata kunci untuk pencarian teknologi / framework
-- Skema: keyword_aliases(alias text pk, expands text[]).
-- Contoh kontrak: golang -> {go}; ml -> {pytorch, tensorflow, machine, learning}.

insert into public.keyword_aliases (alias, expands) values
  ('golang', '{go}'),
  ('reactjs', '{react}'),
  ('react.js', '{react}'),
  ('vuejs', '{vue}'),
  ('nodejs', '{node}'),
  ('node.js', '{node}'),
  ('postgres', '{postgresql}'),
  ('ts', '{typescript}'),
  ('js', '{javascript}'),
  ('py', '{python}'),
  ('ml', '{pytorch,tensorflow,machine,learning}'),
  ('ai', '{"artificial intelligence"}'),
  ('k8s', '{kubernetes}'),
  ('docker-compose', '{docker}')
on conflict (alias) do update set
  expands = excluded.expands;
