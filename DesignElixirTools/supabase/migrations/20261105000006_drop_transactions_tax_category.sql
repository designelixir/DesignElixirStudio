-- Tax category is no longer used (no transactions had a value when this was written)
alter table public.transactions drop column if exists tax_category;
