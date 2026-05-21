'use server';

import { auth } from '@/auth';
import { createAdminClient } from '@/app/utils/supabase/server';
import { Invoice } from '@/app/admin/types/globalTypes';

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');
}

interface FetchInvoicesParams {
  clientId?: string;
  projectId?: string;
  filterPaid?: 'all' | 'paid' | 'unpaid';
}

export async function fetchInvoicesAction(params: FetchInvoicesParams): Promise<Invoice[]> {
  await requireAuth();
  const supabase = createAdminClient();

  let query = supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (params.clientId) query = query.eq('client_id', parseInt(params.clientId));
  if (params.projectId) query = query.eq('project_id', parseInt(params.projectId));
  if (params.filterPaid === 'paid') query = query.eq('paid', true);
  if (params.filterPaid === 'unpaid') query = query.eq('paid', false);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Invoice[]) ?? [];
}