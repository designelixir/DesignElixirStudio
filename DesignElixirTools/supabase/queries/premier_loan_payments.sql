-- Premier Loan (Premier Members): loan details + 18 payments, Jun 2025 – Oct 2026.
-- Safe to run more than once: columns are only added if missing, and a payment
-- is skipped if the same date + amount + descriptor is already on the account.

begin;

-- 1. Loan columns (same as migrations/20261105000008_loan_fields.sql)
alter table public.accounts
  add column if not exists minimum_payment   numeric(12, 2),
  add column if not exists payment_frequency text
    check (payment_frequency in ('monthly', 'biweekly', 'weekly')),
  add column if not exists term_months       integer check (term_months > 0),
  add column if not exists loan_start_date   date;

-- 2. Loan details (rate, opening balance $7,500 on 2025-06-04 and "loan" are already set)
update public.accounts
set minimum_payment   = 247.59,
    payment_frequency = 'monthly',
    term_months       = 36,
    loan_start_date   = '2025-06-04'
where id = '8210eafd-b856-47bd-a5aa-cd198338583c';

-- 3. Payments. Dated at noon Denver time, like the app does.
insert into public.transactions
  (account_id, date, cost, purchase, work_expense, company, statement_descriptor, expense_category_id)
select
  '8210eafd-b856-47bd-a5aa-cd198338583c',
  (p.day || ' 12:00')::timestamp at time zone 'America/Denver',
  p.cost,
  false,                                   -- payment, not a purchase
  false,
  'Premier Members',
  p.descriptor,
  '09b060ab-196a-40ba-a040-61b68a70f174'   -- "Payments" category
from (values
  ('2025-06-23', 500.00, 'MEGAN BYERS CO: MEGAN BYERS'),
  ('2025-06-23', 800.00, 'From Share 0005'),
  ('2025-07-28', 550.00, 'MEGAN BYERS CO: MEGAN BYERS'),
  ('2025-09-05', 247.59, 'MEGAN BYERS CO: MEGAN BYERS'),
  ('2025-10-05', 247.59, 'From Share 0005'),
  ('2025-11-19', 200.00, 'From Share 0005 PartialPmt 0.00 to 200.00'),
  ('2025-11-25',  50.00, 'MEGAN BYERS CO: MEGAN BYERS PartialPmt 200.00 to 2.41'),
  ('2025-12-01', 247.59, 'MEGAN BYERS CO: MEGAN BYERS PartialPmt 2.41 to 0.00'),
  ('2026-01-19', 247.59, 'From Share 0005'),
  ('2026-02-25', 247.59, 'MEGAN BYERS CO: MEGAN BYERS'),
  ('2026-03-17', 247.59, 'MEGAN BYERS CO: MEGAN BYERS'),
  ('2026-04-29', 495.18, 'MEGAN BYERS CO: MEGAN BYERS'),
  ('2026-05-21', 247.59, 'MEGAN BYERS CO: MEGAN BYERS'),
  ('2026-07-21', 247.59, 'MEGAN BYERS CO: MEGAN BYERS'),
  ('2026-08-20', 247.59, 'From Share 0005'),
  ('2026-08-24', 247.59, 'MEGAN BYERS CO: MEGAN BYERS'),
  ('2026-09-17', 247.59, 'MEGAN BYERS CO: MEGAN BYERS'),
  ('2026-10-27', 495.18, 'MEGAN BYERS CO: MEGAN BYERS')
) as p(day, cost, descriptor)
where not exists (
  select 1 from public.transactions t
  where t.account_id = '8210eafd-b856-47bd-a5aa-cd198338583c'
    and t.date = (p.day || ' 12:00')::timestamp at time zone 'America/Denver'
    and t.cost = p.cost
    and t.statement_descriptor = p.descriptor
);

commit;

-- Check: should be 18 payments totaling 5813.85
select count(*) as payments, sum(cost) as total_paid
from public.transactions
where account_id = '8210eafd-b856-47bd-a5aa-cd198338583c';
