-- Companies as they appear on statements: the bank descriptors you've matched to
-- each one, plus defaults applied when a parsed statement line matches.
create table if not exists public.statement_companies (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  name                 text not null,
  -- Bank descriptors linked to this company, as printed (e.g. "ADOBE *CREATIVE CLOUD SAN JOSE CA")
  descriptors          text[] not null default '{}',
  default_category_id  uuid references public.expense_categories (id) on delete set null,
  -- true = work, false = personal, null = no default
  default_work_expense boolean
);

alter table public.statement_companies enable row level security;

-- One row per company name, ignoring case
create unique index if not exists statement_companies_name_key
  on public.statement_companies (lower(name));
-- Fast "which company has this descriptor" lookups
create index if not exists statement_companies_descriptors_idx
  on public.statement_companies using gin (descriptors);

-- Seed from transactions you've already logged: every company with the
-- descriptors used for it, its most-used category, and work/personal when
-- every one of its transactions agrees.
insert into public.statement_companies (name, descriptors, default_category_id, default_work_expense)
select
  min(trim(company)),
  coalesce(
    array_agg(distinct trim(statement_descriptor))
      filter (where statement_descriptor is not null and trim(statement_descriptor) <> ''),
    '{}'
  ),
  mode() within group (order by expense_category_id),
  case when bool_and(work_expense) then true when not bool_or(work_expense) then false end
from public.transactions
where company is not null and trim(company) <> ''
group by lower(trim(company))
on conflict do nothing;
