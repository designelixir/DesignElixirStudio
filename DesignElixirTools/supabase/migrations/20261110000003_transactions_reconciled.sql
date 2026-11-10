-- Amount of a transaction that's been paid back / offset (e.g. a friend's share
-- of a dinner). Spending totals count cost minus this; account balances don't.
alter table public.transactions
  add column if not exists reconciled numeric(12, 2)
  check (reconciled is null or reconciled >= 0);
