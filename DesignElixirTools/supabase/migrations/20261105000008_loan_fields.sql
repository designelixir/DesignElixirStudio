-- Loan details (only used when accounts.loan is true)
alter table public.accounts
  add column if not exists minimum_payment   numeric(12, 2),
  add column if not exists payment_frequency text
    check (payment_frequency in ('monthly', 'biweekly', 'weekly')),
  add column if not exists term_months       integer check (term_months > 0),
  add column if not exists loan_start_date   date;
