'use server';

import { auth } from '@/auth';
import { createAdminClient } from '@/app/utils/supabase/server';
import { Invoice } from '@/types/globalTypes';

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
export interface IncomeSummary {
  received: number; // payments received (before fees)
  fees: number;     // processing fees on those payments
  payments: number; // how many payments
}

// Invoice payments received in a year (by the date each payment was received),
// across all invoices
export async function fetchIncomeForYearAction(year: number): Promise<IncomeSummary> {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('invoices').select('payments');
  if (error) throw new Error(error.message);

  let received = 0;
  let fees = 0;
  let payments = 0;
  for (const invoice of data ?? []) {
    for (const p of (invoice.payments ?? []) as { amount?: number; fees?: number; date_received?: string }[]) {
      if (!p.date_received || !p.date_received.startsWith(`${year}-`)) continue;
      received += Number(p.amount ?? 0);
      fees += Number(p.fees ?? 0);
      payments += 1;
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return { received: round(received), fees: round(fees), payments };
}
