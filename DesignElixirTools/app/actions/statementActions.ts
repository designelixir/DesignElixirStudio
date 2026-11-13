'use server';

import { auth } from '@/auth';
import { createAdminClient } from '@/app/utils/supabase/server';
import type { Statement } from '@/types/globalTypes';

const BUCKET = 'statements';

export type StatementInput = Pick<
  Statement,
  'name' | 'account_id' | 'file_path' | 'file_name' | 'file_type' | 'period_start' | 'period_end'
>;

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');
  return session;
}

// Step 1 of an upload: get a one-time URL the browser can upload the PDF to
// directly (server actions reject bodies over 1 MB, so the file skips the server).
export async function createStatementUploadUrlAction(fileName: string) {
  await requireAuth();
  if (!fileName.toLowerCase().endsWith('.pdf')) throw new Error('Only PDF files are supported');

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const path = `${crypto.randomUUID()}/${safeName}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return { path: data.path, token: data.token };
}

// Step 2 of an upload: save the statement's details once the file is stored.
export async function createStatementAction(input: StatementInput): Promise<Statement> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('statements')
    .insert([input])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchStatementsAction(): Promise<Statement[]> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('statements')
    .select('*')
    .order('period_end', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchStatementAction(id: string): Promise<Statement | null> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('statements')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateStatementAction(
  id: string,
  input: Partial<
    Pick<Statement, 'name' | 'account_id' | 'period_start' | 'period_end' | 'status'>
  >
) {
  await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from('statements').update(input).eq('id', id);
  if (error) throw new Error(error.message);
}

// Short-lived link for viewing a statement's PDF (the bucket is private).
export async function getStatementFileUrlAction(filePath: string): Promise<string> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteStatementAction(id: string) {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('statements')
    .delete()
    .eq('id', id)
    .select('file_path')
    .single();
  if (error) throw new Error(error.message);
  if (data?.file_path) await supabase.storage.from(BUCKET).remove([data.file_path]);
}
