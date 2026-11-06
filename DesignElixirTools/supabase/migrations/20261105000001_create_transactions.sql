create table if not exists public.transactions (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  account_id            uuid not null references public.accounts (id) on delete restrict,
  statement_descriptor  text,
  purchase              boolean not null default false,
  expense_category      text,
  cost                  numeric(12, 2) not null,
  date                  timestamptz not null,
  work_expense          boolean not null default false,
  tax_category          text,
  statement_id          text,
  description           text
);

create index if not exists transactions_account_id_idx on public.transactions (account_id);
create index if not exists transactions_date_idx on public.transactions (date desc);

alter table public.transactions enable row level security;
