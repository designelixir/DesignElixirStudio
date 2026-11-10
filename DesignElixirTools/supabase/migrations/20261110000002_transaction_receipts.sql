-- One receipt file per transaction (PDF, PNG or JPEG), stored in the private `receipts` bucket.
alter table public.transactions
  add column if not exists receipt_path text,      -- path inside the bucket
  add column if not exists receipt_file_name text; -- original file name, for display

-- Private storage bucket for receipts (20 MB max)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 20971520, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;
