'use server';

import { auth } from '@/auth';
import { createAdminClient } from '@/app/utils/supabase/server';

// Guard every action with this
async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function fetchClientsAction() {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('clients').select('*');
  if (error) throw error;
  return data;
}

export async function fetchClientTimesAction(clientIds: string[]) {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('time-tracking')
    .select('client_id, time_lapsed')
    .in('client_id', clientIds)
    .eq('tracking_finished', true);
  if (error) throw error;
  return data;
}

export async function createClientAction(formData: any) {
  await requireAuth();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('clients')
    .insert([formData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClientAction(clientId: string, formData: any) {
  await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('clients')
    .update(formData)
    .eq('id', clientId);
  if (error) throw error;
}