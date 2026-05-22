'use server';

import { auth } from '@/auth';
import { createAdminClient } from '@/app/utils/supabase/server';
import { TimeEntry } from '@/app/types/globalTypes';

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');
}

interface FetchTimeEntriesParams {
  projectIds?: string[];
  startDate?: string;
  endDate?: string;
}

export async function fetchTimeEntriesAction(params: FetchTimeEntriesParams): Promise<TimeEntry[]> {
  await requireAuth();
  const supabase = createAdminClient();

  let query = supabase
    .from('time-tracking')
    .select('*')
    .eq('tracking_finished', true)
    .order('start_time', { ascending: false });

  if (params.startDate) query = query.gte('start_time', params.startDate);
  if (params.endDate) query = query.lte('start_time', params.endDate);
  if (params.projectIds && params.projectIds.length > 0) {
    query = query.in('project_id', params.projectIds.map(id => parseInt(id)));
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as TimeEntry[]) ?? [];
}

export async function updateTimeEntryAction(entryId: string, updates: Partial<TimeEntry>): Promise<void> {
  await requireAuth();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('time-tracking')
    .update(updates)
    .eq('id', entryId);

  if (error) throw error;
}

export async function deleteTimeEntryAction(entryId: string): Promise<void> {
  await requireAuth();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('time-tracking')
    .delete()
    .eq('id', entryId);

  if (error) throw error;
}