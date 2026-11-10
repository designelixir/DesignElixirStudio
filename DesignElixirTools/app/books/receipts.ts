'use client';

import { createClient } from '@/app/utils/supabase/client';
import {
  createReceiptUploadUrlAction,
  attachReceiptAction,
  getReceiptUrlAction,
} from '@/app/actions/receiptActions';

export const RECEIPT_ACCEPT = 'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg';
const MAX_BYTES = 20 * 1024 * 1024; // matches the bucket's limit

// A problem with the chosen file, or null if it's fine
export function receiptFileProblem(file: File): string | null {
  if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) return 'Receipts must be a PDF, PNG or JPEG.';
  if (file.size > MAX_BYTES) return 'Receipts must be 20 MB or smaller.';
  return null;
}

// Uploads straight to Storage with a one-time URL, then links it to the transaction
// (replacing any receipt it already had)
export async function uploadReceipt(transactionId: string, file: File) {
  const { path, token, contentType } = await createReceiptUploadUrlAction(transactionId, file.name);
  const { error } = await createClient()
    .storage.from('receipts')
    .uploadToSignedUrl(path, token, file, { contentType });
  if (error) throw error;
  await attachReceiptAction(transactionId, path, file.name);
}

// Opens a receipt in a new tab. The tab is opened before the link is fetched so
// the browser doesn't treat it as a pop-up.
export async function openReceipt(path: string) {
  const tab = window.open('', '_blank');
  try {
    const url = await getReceiptUrlAction(path);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (err) {
    tab?.close();
    console.error('Error opening receipt:', err);
    alert(err instanceof Error ? err.message : 'Could not open the receipt');
  }
}
