'use server';

import { auth } from '@/auth';
import { createAdminClient } from '@/app/utils/supabase/server';

const BUCKET = 'receipts';

// File types a receipt can be, by extension → content type
const RECEIPT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');
  return session;
}

// Step 1 of an upload: a one-time URL the browser uploads the file to directly
// (server actions reject bodies over 1 MB, so the file skips the server).
export async function createReceiptUploadUrlAction(transactionId: string, fileName: string) {
  await requireAuth();
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const contentType = RECEIPT_TYPES[ext];
  if (!contentType) throw new Error('Receipts must be a PDF, PNG or JPEG');

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const path = `${transactionId}/${crypto.randomUUID()}/${safeName}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return { path: data.path, token: data.token, contentType };
}

// Step 2: link the uploaded file to the transaction, removing any receipt it replaces
export async function attachReceiptAction(transactionId: string, path: string, fileName: string) {
  await requireAuth();
  if (!path.startsWith(`${transactionId}/`)) throw new Error('Receipt does not belong to this transaction');
  const supabase = createAdminClient();
  const { data: before, error: readError } = await supabase
    .from('transactions')
    .select('receipt_path')
    .eq('id', transactionId)
    .single();
  if (readError) throw new Error(readError.message);

  const { error } = await supabase
    .from('transactions')
    .update({ receipt_path: path, receipt_file_name: fileName })
    .eq('id', transactionId);
  if (error) throw new Error(error.message);

  if (before?.receipt_path && before.receipt_path !== path) {
    await supabase.storage.from(BUCKET).remove([before.receipt_path]);
  }
}

export async function removeReceiptAction(transactionId: string) {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('receipt_path')
    .eq('id', transactionId)
    .single();
  if (error) throw new Error(error.message);

  const { error: updateError } = await supabase
    .from('transactions')
    .update({ receipt_path: null, receipt_file_name: null })
    .eq('id', transactionId);
  if (updateError) throw new Error(updateError.message);

  if (data?.receipt_path) await supabase.storage.from(BUCKET).remove([data.receipt_path]);
}

// Short-lived link for viewing a receipt (the bucket is private)
export async function getReceiptUrlAction(path: string): Promise<string> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
