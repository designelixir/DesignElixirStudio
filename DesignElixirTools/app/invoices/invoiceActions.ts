'use server';

import { createAdminClient } from '@/app/utils/supabase/server';
import { InvoiceFields, PDFLineItem, SelectedClientData } from '../types/globalTypes';
import { PaymentEntry } from './PaymentEntry';

export async function saveInvoice(
  fields: InvoiceFields,
  items: PDFLineItem[],
  payments: PaymentEntry[],
  selectedClient: SelectedClientData | null,
  selectedTimeEntryIds: string[] = [],
  timeEntriesMeta?: { totalSeconds: number; earliest: Date | null; latest: Date | null },
) {
  const supabase = await createAdminClient();

  const lineItemsTotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const invoiceTotal = lineItemsTotal - (parseFloat(String(fields.adjustments)) || 0);
  const isPaid = payments.length > 0 && totalPaid >= invoiceTotal;
  const hourlyRate = selectedClient?.project_hourly ? Number(selectedClient.project_hourly) : 50;
  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const hasTimeEntries = selectedTimeEntryIds.length > 0;

  // If we have IDs but no meta, fetch from DB
  let resolvedMeta = timeEntriesMeta;
  if (hasTimeEntries && (!resolvedMeta || resolvedMeta.totalSeconds === 0)) {
    const { data: entries } = await supabase
      .from('time-tracking')
      .select('time_lapsed, start_time')
      .in('id', selectedTimeEntryIds);

    if (entries && entries.length > 0) {
      const totalSeconds = entries.reduce((s, e) => s + (e.time_lapsed || 0), 0);
      const dates = entries
        .map(e => new Date(e.start_time))
        .sort((a, b) => a.getTime() - b.getTime());
      resolvedMeta = {
        totalSeconds,
        earliest: dates[0] ?? null,
        latest: dates[dates.length - 1] ?? null,
      };
    }
  }

  const totalHours = resolvedMeta ? resolvedMeta.totalSeconds / 3600 : 0;

  const { data, error } = await supabase.from('invoices').upsert({
    id: fields.invNumber || `${fields.invDate?.replace(/-/g, '') || new Date().toISOString().split('T')[0].replace(/-/g, '')}_${String(selectedClient?.client_id ?? 'DRAFT').slice(0, 6).toUpperCase()}`,

    invoice_date: fields.invDate || null,
    invoice_due: fields.invDue || null,

    ...(hasTimeEntries && {
      time_entries: selectedTimeEntryIds,
      time_entries_sum: totalHours,
      start_date: resolvedMeta?.earliest ? toDateStr(resolvedMeta.earliest) : null,
      end_date: resolvedMeta?.latest ? toDateStr(resolvedMeta.latest) : null,
    }),

    client_id: selectedClient?.client_id ? Number(selectedClient.client_id) : null,
    client_first: selectedClient?.client_first ?? fields.toName.split(' ')[0] ?? '',
    client_last: selectedClient?.client_last ?? fields.toName.split(' ').slice(1).join(' ') ?? '',
    client_email: fields.toEmail,
    client_phone: fields.toPhone || null,

    project_id: selectedClient?.project_id ? Number(selectedClient.project_id) : null,
    project_name: fields.invProject || null,
    project_hourly: selectedClient?.project_hourly ? Number(selectedClient.project_hourly) : null,

    line_items: items,
    line_items_total: lineItemsTotal,

    adjustments: fields.adjustments || null,
    adjustments_descriptor: fields.adjustmentsDesc || null,
    notes: fields.notes || null,

    payments: payments,
    paid: isPaid,

    draft: true,
  }, { onConflict: 'id' }).select().single();

  if (error) throw new Error(error.message);
  return data;
}



export async function getInvoice(id: string) {
  const supabase = await createAdminClient();
  const decodedId = decodeURIComponent(id);
  
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', decodedId)
    .single();
    
  if (error) throw new Error(error.message);
  return data;
}

export async function applyInvoiceToTimeEntries(invoiceId: string, entryIds: string[]) {
  if (entryIds.length === 0) return;
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from('time-tracking')
    .update({ invoice_id: invoiceId })
    .in('id', entryIds);

  if (error) throw new Error(error.message);
}

export async function fetchTimeEntriesByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('time-tracking')
    .select('*')
    .in('id', ids);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function removeTimeEntryFromInvoice(
  invoiceId: string,
  entryIdToRemove: string,
  remainingEntryIds: string[],
) {
  console.log('removeTimeEntryFromInvoice called:', { invoiceId, entryIdToRemove, remainingEntryIds });
  const supabase = await createAdminClient();

  const { error: entryError, data: entryData } = await supabase
    .from('time-tracking')
    .update({ invoice_id: null })
    .eq('id', entryIdToRemove)
    .select();
  console.log('entry update result:', entryData, entryError);
  if (entryError) throw new Error(entryError.message);

  const { error: invoiceError, data: invoiceData } = await supabase
    .from('invoices')
    .update({ time_entries: remainingEntryIds })
    .eq('id', invoiceId)
    .select();
  console.log('invoice update result:', invoiceData, invoiceError);
  if (invoiceError) throw new Error(invoiceError.message);
}