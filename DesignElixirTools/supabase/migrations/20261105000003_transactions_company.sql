-- Company/merchant a transaction is with, e.g. "Amazon", "Home Depot"
alter table public.transactions add column if not exists company text;
create index if not exists transactions_company_idx on public.transactions (company);
