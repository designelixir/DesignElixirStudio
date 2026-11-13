-- Descriptor phrases for each statement company. A parsed statement line whose
-- descriptor contains a phrase (ignoring case) is filled in as that company,
-- with the phrase's own category and work/personal default.
-- Each entry: { "phrase": text, "default_category_id": uuid | null, "default_work_expense": bool | null }
alter table public.statement_companies
  add column if not exists phrases jsonb not null default '[]'::jsonb;
