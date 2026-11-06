-- Accounts used for book keeping (bank accounts, credit cards, etc.)
create table if not exists public.accounts (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  name             text not null,
  brand            text,
  checking_account boolean not null default false,
  credit_card      boolean not null default false,
  loan             boolean default false,
  interest_rate    numeric(6, 3),            -- percent, e.g. 24.990 = 24.99% APR
  payment_day      smallint check (payment_day between 1 and 31) -- day of month payment is due
);

-- Server actions use the service-role (admin) client, which bypasses RLS.
-- Enabling RLS with no policies keeps the table closed to the anon key.
alter table public.accounts enable row level security;
