-- Which statement parser to run automatically when one of this account's statements
-- is opened (a key from STATEMENT_FORMATS, e.g. 'discover'). Null = pick from the brand.
alter table public.accounts
  add column if not exists statement_parser text;
