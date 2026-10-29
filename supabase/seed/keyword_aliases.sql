-- supabase/seed/keyword_aliases.sql
-- Seed alias kata kunci untuk pencarian teknologi / framework

insert into public.keyword_aliases (alias, canonical, confidence) values
  ('golang', 'go', 1.0),
  ('reactjs', 'react', 1.0),
  ('react.js', 'react', 1.0),
  ('vuejs', 'vue', 1.0),
  ('nodejs', 'node', 1.0),
  ('node.js', 'node', 1.0),
  ('postgres', 'postgresql', 1.0),
  ('ts', 'typescript', 1.0),
  ('js', 'javascript', 1.0),
  ('py', 'python', 1.0),
  ('ml', 'machine learning', 0.9),
  ('ai', 'artificial intelligence', 0.8),
  ('k8s', 'kubernetes', 1.0),
  ('docker-compose', 'docker', 0.9)
on conflict (alias) do update set
  canonical = excluded.canonical,
  confidence = excluded.confidence;
