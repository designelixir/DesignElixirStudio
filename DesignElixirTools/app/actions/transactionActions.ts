'use server';

import { auth } from '@/auth';
import { createAdminClient } from '@/app/utils/supabase/server';
import type { Transaction } from '@/types/globalTypes';

// `tags` is optional on insert (the column defaults to no tags)
// `tags` is optional on insert (the column defaults to no tags); receipts are
// attached separately (receiptActions)
export type TransactionInput = Omit<
  Transaction,
  'id' | 'created_at' | 'tags' | 'receipt_path' | 'receipt_file_name' | 'reconciled'
> & {
  tags?: string[];
  reconciled?: number | null;
};

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function fetchTransactionsAction(): Promise<Transaction[]> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createTransactionAction(input: TransactionInput): Promise<Transaction> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('transactions')
    .insert([input])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTransactionAction(id: string, input: Partial<TransactionInput>) {
  await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from('transactions').update(input).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTransactionAction(id: string) {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('transactions').delete().eq('id', id).select('receipt_path').single();
  if (error) throw new Error(error.message);
  // Don't leave the receipt file behind
  if (data?.receipt_path) await supabase.storage.from('receipts').remove([data.receipt_path]);
}

// Saves many transactions at once (e.g. everything read from a statement)
export async function createTransactionsAction(inputs: TransactionInput[]): Promise<number> {
  await requireAuth();
  if (inputs.length === 0) return 0;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('transactions').insert(inputs).select('id');
  if (error) throw new Error(error.message);
  return data.length;
}

export async function countTransactionsForStatementAction(statementId: string): Promise<number> {
  await requireAuth();
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('statement_id', statementId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fetchTransactionsForStatementAction(statementId: string): Promise<Transaction[]> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('statement_id', statementId)
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Every company name used so far, for the searchable company field
export async function fetchCompaniesAction(): Promise<string[]> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('company')
    .not('company', 'is', null);
  if (error) throw new Error(error.message);
  return uniqueCompanies(data.map((row) => row.company as string));
}

// Adds one tag to many transactions at once (skips ones that already have it).
// Returns how many were changed.
export async function addTagToTransactionsAction(ids: string[], rawTag: string): Promise<number> {
  await requireAuth();
  const tag = rawTag.trim().replace(/\s+/g, ' ').toLowerCase(); // same rule as the tag field
  if (!tag) throw new Error('Enter a tag');
  if (ids.length === 0) return 0;
  const supabase = createAdminClient();

  // Read current tags in chunks (keeps the request URL short)
  const rows: { id: string; tags: string[] | null }[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from('transactions').select('id, tags').in('id', ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    rows.push(...data);
  }

  const toUpdate = rows.filter((r) => !(r.tags ?? []).includes(tag));
  for (let i = 0; i < toUpdate.length; i += 20) {
    const results = await Promise.all(
      toUpdate
        .slice(i, i + 20)
        .map((r) => supabase.from('transactions').update({ tags: [...(r.tags ?? []), tag] }).eq('id', r.id))
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }
  return toUpdate.length;
}

// Every tag used so far, for the tag field's suggestions. Pages through, since
// Supabase returns at most 1,000 rows per request.
export async function fetchTagsAction(): Promise<string[]> {
  await requireAuth();
  const supabase = createAdminClient();
  const pageSize = 1000;
  const tags: string[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('transactions')
      .select('tags')
      .neq('tags', '{}')
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    for (const row of data) tags.push(...((row.tags as string[]) ?? []));
    if (data.length < pageSize) break;
  }
  return uniqueCompanies(tags);
}

// De-duplicates ignoring case/spacing ("amazon" and "Amazon " count once), sorted A→Z
function uniqueCompanies(names: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed && !byKey.has(trimmed.toLowerCase())) byKey.set(trimmed.toLowerCase(), trimmed);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

export interface TransactionFilters {
  from?: string;          // ISO timestamp, inclusive
  to?: string;            // ISO timestamp, exclusive
  accountId?: string;
  categoryId?: string;    // your expense category (expense_category_id)
  workExpense?: boolean;  // true = work only, false = personal only, undefined = both
}

// Transactions matching the filters. Supabase returns at most 1,000 rows per
// request, so this pages through until everything is loaded.
export async function fetchFilteredTransactionsAction(filters: TransactionFilters = {}): Promise<Transaction[]> {
  await requireAuth();
  const supabase = createAdminClient();
  const pageSize = 1000;
  const all: Transaction[] = [];

  for (let offset = 0; ; offset += pageSize) {
    let query = supabase.from('transactions').select('*');
    if (filters.from) query = query.gte('date', filters.from);
    if (filters.to) query = query.lt('date', filters.to);
    if (filters.accountId) query = query.eq('account_id', filters.accountId);
    if (filters.categoryId) query = query.eq('expense_category_id', filters.categoryId);
    if (filters.workExpense !== undefined) query = query.eq('work_expense', filters.workExpense);

    const { data, error } = await query
      .order('date', { ascending: false })
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all;
}

// Date of the oldest transaction, for the year filter (null if there are none)
export async function fetchEarliestTransactionDateAction(): Promise<string | null> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('date')
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.date ?? null;
}
