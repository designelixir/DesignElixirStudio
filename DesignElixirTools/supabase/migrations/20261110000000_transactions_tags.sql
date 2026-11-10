-- Free-form tags on each transaction (e.g. "client-acme", "trip-nyc-2026").
-- Suggestions come from the distinct tags already used, so there's no separate tags table.
alter table public.transactions
  add column if not exists tags text[] not null default '{}';

-- Fast "has this tag" lookups (tags @> array['x'])
create index if not exists transactions_tags_idx
  on public.transactions using gin (tags);
