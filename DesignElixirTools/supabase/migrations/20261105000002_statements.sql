-- Statements: one row per uploaded PDF statement
create table if not exists public.statements (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  account_id    uuid not null references public.accounts (id) on delete restrict,
  file_path     text not null,
  file_name     text not null,
  file_type     text not null,
  period_start  date,
  period_end    date,
  status        text not null default 'uploaded'
);
alter table public.statements enable row level security;

-- Display name you give the statement, e.g. "Chase Sapphire – Oct 2026"
alter table public.statements add column if not exists name text;

-- Link transactions to the statement they came from.
-- If a statement is deleted, its transactions stay but lose the link.
alter table public.transactions
  drop constraint if exists transactions_statement_id_fkey,
  add constraint transactions_statement_id_fkey
    foreign key (statement_id) references public.statements (id) on delete set null;
create index if not exists transactions_statement_id_idx on public.transactions (statement_id);

-- Private storage bucket for the PDFs (20 MB max, PDFs only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('statements', 'statements', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;
