-- Starting point for an account's balance, e.g. what you owed on a card the
-- day before the first statement you imported. Transactions after this date
-- are added on top.
alter table public.accounts
  add column if not exists opening_balance      numeric(12, 2),
  add column if not exists opening_balance_date date;

-- Balances printed on each statement, read from the PDF. Used to pre-fill the
-- opening balance and to check that imported transactions add up.
alter table public.statements
  add column if not exists previous_balance numeric(12, 2),
  add column if not exists new_balance      numeric(12, 2);
