'use server';

import { auth } from '@/auth';
import { createAdminClient } from '@/app/utils/supabase/server';
import type { StatementCompany, StatementCompanyPhrase } from '@/types/globalTypes';

export type StatementCompanyInput = Pick<
  StatementCompany,
  'name' | 'descriptors' | 'default_category_id' | 'default_work_expense' | 'phrases'
>;

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');
  return session;
}

// Trimmed, no blanks, no repeats (ignoring case)
function cleanDescriptors(list: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const d of list) {
    const t = d.trim().replace(/\s+/g, ' ');
    if (t && !byKey.has(t.toLowerCase())) byKey.set(t.toLowerCase(), t);
  }
  return [...byKey.values()];
}

// Phrases keep their inner spaces (runs collapsed to one), drop blanks, and keep
// the last entry when the same phrase (ignoring case) is listed twice
function cleanPhrases(list: StatementCompanyPhrase[]): StatementCompanyPhrase[] {
  const byKey = new Map<string, StatementCompanyPhrase>();
  for (const p of list) {
    const phrase = p.phrase.replace(/\s+/g, ' ').trim();
    if (!phrase) continue;
    byKey.set(phrase.toLowerCase(), {
      phrase,
      default_category_id: p.default_category_id || null,
      default_work_expense: typeof p.default_work_expense === 'boolean' ? p.default_work_expense : null,
    });
  }
  return [...byKey.values()];
}

export interface DescriptorCount {
  descriptor: string;
  count: number;
}

// Every distinct statement descriptor on your transactions, with how many lines
// use it, most-used first. Pages through, since Supabase returns at most 1,000 rows.
export async function fetchStatementDescriptorsAction(): Promise<DescriptorCount[]> {
  await requireAuth();
  const supabase = createAdminClient();
  const counts = new Map<string, number>();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('transactions')
      .select('statement_descriptor')
      .not('statement_descriptor', 'is', null)
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    for (const row of data) {
      const d = (row.statement_descriptor as string).replace(/\s+/g, ' ').trim();
      if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    if (data.length < pageSize) break;
  }
  return [...counts]
    .map(([descriptor, count]) => ({ descriptor, count }))
    .sort((a, b) => b.count - a.count || a.descriptor.localeCompare(b.descriptor));
}

export async function fetchStatementCompaniesAction(): Promise<StatementCompany[]> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('statement_companies').select('*').order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function createStatementCompanyAction(input: StatementCompanyInput): Promise<StatementCompany> {
  await requireAuth();
  const name = input.name.trim();
  if (!name) throw new Error('Enter a company name');
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('statement_companies')
    .insert([{ ...input, name, descriptors: cleanDescriptors(input.descriptors), phrases: cleanPhrases(input.phrases ?? []) }])
    .select()
    .single();
  if (error) throw new Error(error.code === '23505' ? `“${name}” already exists` : error.message);
  return data;
}

export async function updateStatementCompanyAction(
  id: string,
  input: Partial<StatementCompanyInput>
): Promise<StatementCompany> {
  await requireAuth();
  const patch = { ...input };
  if (patch.name !== undefined) {
    patch.name = patch.name.trim();
    if (!patch.name) throw new Error('Enter a company name');
  }
  if (patch.descriptors) patch.descriptors = cleanDescriptors(patch.descriptors);
  if (patch.phrases) patch.phrases = cleanPhrases(patch.phrases);
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('statement_companies').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.code === '23505' ? `“${patch.name}” already exists` : error.message);
  return data;
}

export async function deleteStatementCompanyAction(id: string) {
  await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from('statement_companies').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
