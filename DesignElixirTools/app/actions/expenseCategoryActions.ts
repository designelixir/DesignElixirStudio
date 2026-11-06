'use server';

import { auth } from '@/auth';
import { createAdminClient } from '@/app/utils/supabase/server';
import type { ExpenseCategory } from '@/types/globalTypes';

export type ExpenseCategoryInput = Omit<ExpenseCategory, 'id' | 'created_at'>;

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function fetchExpenseCategoriesAction(): Promise<ExpenseCategory[]> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('title');
  if (error) throw new Error(error.message);
  return data;
}

export async function createExpenseCategoryAction(input: ExpenseCategoryInput): Promise<ExpenseCategory> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('expense_categories')
    .insert([input])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateExpenseCategoryAction(
  id: string,
  input: Partial<ExpenseCategoryInput>
): Promise<ExpenseCategory> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('expense_categories')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
