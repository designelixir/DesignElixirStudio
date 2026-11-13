-- Statements no longer store printed opening / closing balances; an account's
-- starting point is its own opening_balance + opening_balance_date.
-- This permanently deletes any balances already saved on statements.
alter table public.statements
  drop column if exists previous_balance,
  drop column if exists new_balance;
