-- Link each transaction to one of your expense categories.
-- (The existing text column `expense_category` keeps the bank's own category, e.g. Discover's "Restaurants".)
alter table public.transactions
  add column if not exists expense_category_id uuid
  references public.expense_categories (id) on delete set null;

create index if not exists transactions_expense_category_id_idx
  on public.transactions (expense_category_id);
