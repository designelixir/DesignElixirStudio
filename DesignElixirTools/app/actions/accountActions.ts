'use server';

import { auth } from '@/auth';
import { createAdminClient } from '@/app/utils/supabase/server';
import type { Account } from '@/types/globalTypes';

type AccountInput = Omit<Account, 'id' | 'created_at'>;

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function fetchAccountsAction(): Promise<Account[]> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function createAccountAction(input: AccountInput): Promise<Account> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('accounts')
    .insert([input])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateAccountAction(id: string, input: Partial<AccountInput>) {
  await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from('accounts').update(input).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAccountAction(id: string) {
  await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchAccountByNameAction(name: string): Promise<Account | null> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('name', name)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
export async function fetchAccountAction(id: string): Promise<Account | null> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
