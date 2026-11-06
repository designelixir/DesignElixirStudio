create table if not exists public.expense_categories (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  title            text not null,
  description      text,
  -- How much of an expense in this category can be written off, 0–100 (e.g. 50 = 50%)
  percent_writeoff numeric(5, 2) not null default 0
                   check (percent_writeoff between 0 and 100),
  -- Hex color like #FF6600
  color            text check (color ~* '^#[0-9a-f]{6}$')
);

alter table public.expense_categories enable row level security;
