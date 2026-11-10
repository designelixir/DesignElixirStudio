-- Groups each expense category under one fixed parent (categories act as sub-categories).
-- Nullable: existing categories stay unassigned until you pick one.
-- Keep this list in sync with PARENT_CATEGORIES in app/books/categories/parentCategories.ts.
alter table public.expense_categories
  add column if not exists parent_category text
  check (parent_category in (
    'automotive',
    'home_improvement',
    'medical',
    'stuff',
    'food',
    'services',
    'entertainment',
    'payments',
    'misc'
  ));
