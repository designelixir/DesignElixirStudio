'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useDebounce } from '@/app/hooks/useDebounce';
import { InvoiceFields, PDFLineItem, SelectedClientData, Invoice } from '../types/globalTypes';
import InvoiceHeader from './InvoiceHeader';
import PDFPreview from './PDFPreview';
import PDFToolbar from './PDFToolBar';
import { createClient } from '@/app/utils/supabase/client';
import { PaymentEntry } from './PaymentEntry';
import { saveInvoice, applyInvoiceToTimeEntries } from './invoiceActions';
import { useRouter } from 'next/navigation';

const DEFAULT_FIELDS: InvoiceFields = {
  fromName: 'Design Elixir Studio',
  fromEmail: 'megan@designelixir.studio',
  fromPhone: '303.960.1941',
  fromAddress: '6451 E Highway 82, Unit D\nTwin Lakes, CO 81251',
  toName: '',
  toEmail: '',
  toPhone: '',
  toDetails: '',
  invNumber: '',
  invDate: new Date().toISOString().split('T')[0],
  invDue: '',
  invProject: '',
  paid: false,
  payments: [],
  notes: '',
  terms: '',
  footer: '',
  adjustments: 0,
  adjustmentsDesc: '',
};

function invoiceToFields(invoice: Invoice): InvoiceFields {
  return {
    fromName: 'Design Elixir Studio',
    fromEmail: 'megan@designelixir.studio',
    fromPhone: '303.960.1941',
    fromAddress: '6451 E Highway 82, Unit D\nTwin Lakes, CO 81251',
    toName: `${invoice.client_first} ${invoice.client_last}`,
    toEmail: invoice.client_email,
    toPhone: invoice.client_phone || '',
    toDetails: '',
    invNumber: invoice.id,
    invDate: invoice.invoice_date?.split('T')[0] ?? '',
    invDue: invoice.invoice_due?.split('T')[0] ?? '',
    invProject: invoice.project_name || '',
    paid: invoice.paid,
    payments: invoice.payments,
    notes: invoice.notes || '',
    terms: '',
    footer: '',
    adjustments: invoice.adjustments || 0,
    adjustmentsDesc: invoice.adjustments_descriptor || '',
  };
}

function invoiceToItems(invoice: Invoice): PDFLineItem[] {
  return (invoice.line_items || []).map((item, i) => ({
    id: (item as any).id ?? i + 1,
    desc: (item as any).desc ?? '',
    qty: (item as any).qty ?? 1,
    qtyDisplay: String((item as any).qty ?? 1),
    rate: (item as any).rate ?? 0,
    type: (item as any).type ?? 'hourly',
  }));
}

interface Props {
  invoice?: Invoice;
}

export default function InvoiceWrapper({ invoice }: Props) {
  const isEdit = !!invoice;
  const router = useRouter();
  const [selectedTimeEntryIds, setSelectedTimeEntryIds] = useState<string[]>([]);
const [timeEntriesMeta, setTimeEntriesMeta] = useState<{
  totalSeconds: number;
  earliest: Date | null;
  latest: Date | null;
}>({ totalSeconds: 0, earliest: null, latest: null });

  const initialItems = invoice ? invoiceToItems(invoice) : [];

  const [fields, setFields] = useState<InvoiceFields>(
    invoice ? invoiceToFields(invoice) : DEFAULT_FIELDS
  );
  const [items, setItems] = useState<PDFLineItem[]>(initialItems);
  const [selectedClient, setSelectedClient] = useState<SelectedClientData | null>(
    invoice?.client_id ? {
      client_id: String(invoice.client_id),
      client_name: `${invoice.client_first} ${invoice.client_last}`,
      client_first: invoice.client_first,
      client_last: invoice.client_last,
      project_id: String(invoice.project_id ?? ''),
      project_name: invoice.project_name || '',
      project_color: invoice.project_color || '',
      project_hourly: invoice.project_hourly || 50,
    } : null
  );
  const [payments, setPayments] = useState<PaymentEntry[]>( invoice?.payments ?? [] );
  const [saving, setSaving] = useState(false);
  const nextIdRef = useRef( initialItems.length > 0 ? Math.max(...initialItems.map(i => i.id)) + 1 : 1 );
  const filteredItems = useMemo(() => items.filter(i => i.desc.trim() !== ''), [items]);
  const [committedFields, setCommittedFields] = useState<InvoiceFields>( invoice ? invoiceToFields(invoice) : DEFAULT_FIELDS );
  const [committedItems, setCommittedItems] = useState<PDFLineItem[]>(initialItems);
  const selectedTimeEntryIdsRef = useRef<string[]>([]);
  const handleCommitToPDF = () => {
    console.log(fields.fromAddress)
    setCommittedFields(fields);
    setCommittedItems(items.filter(i => i.desc.trim() !== ''));
  };

  const handleTimeEntriesSaved = (
  ids: string[],
  meta: { totalSeconds: number; earliest: Date | null; latest: Date | null }
) => {
  selectedTimeEntryIdsRef.current = ids;
  setTimeEntriesMeta(meta);
};


  const invoiceTotal = items.reduce((s, i) => s + i.qty * i.rate, 0)
    - (parseFloat(String(fields.adjustments)) || 0);

  useEffect(() => {
    if (!selectedClient || isEdit) return;
    const fetchClientDetails = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('clients')
        .select('client_email, client_phone, client_billable_rate')
        .eq('id', selectedClient.client_id)
        .single();

      const billingRate = data?.client_billable_rate || 0;

      setFields(prev => ({
        ...prev,
        toName: `${selectedClient.client_first} ${selectedClient.client_last}`,
        toEmail: data?.client_email || '',
        toPhone: data?.client_phone || '',
        invProject: selectedClient.project_name || '',
      }));

      if (billingRate > 0) {
        setItems(prev => prev.map(item => ({
          ...item,
          rate: item.rate === 0 ? billingRate : item.rate,
        })));
      }
    };
    fetchClientDetails();
  }, [selectedClient, isEdit]);

  const set = (key: keyof InvoiceFields, val: string | boolean | number) =>
    setFields(prev => ({ ...prev, [key]: val }));

  const updateItem = (id: number, patch: Partial<PDFLineItem>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const addItem = (draft: Omit<PDFLineItem, 'id'>) =>
    setItems(prev => [...prev, { ...draft, id: nextIdRef.current++ }]);

  const removeItem = (id: number) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const clearClient = () => {
    setSelectedClient(null);
    setFields(prev => ({ ...prev, toName: '', toEmail: '', toPhone: '', invNumber: '' }));
  };

const handleSave = async () => {
  setSaving(true);
  try {
    const timeEntryIds = selectedTimeEntryIdsRef.current.length > 0
      ? selectedTimeEntryIdsRef.current
      : (invoice?.time_entries?.map(String) ?? []);

    const meta = timeEntriesMeta.totalSeconds > 0
      ? timeEntriesMeta
      : {
          totalSeconds: invoice?.time_entries_sum ? invoice.time_entries_sum * 3600 : 0,
          earliest: invoice?.start_date ? new Date(invoice.start_date) : null,
          latest: invoice?.end_date ? new Date(invoice.end_date) : null,
        };

    const saved = await saveInvoice(
      fields,
      items,
      payments,
      selectedClient,
      timeEntryIds,
      meta,
    );

    if (selectedTimeEntryIdsRef.current.length > 0) {
      await applyInvoiceToTimeEntries(saved.id, selectedTimeEntryIdsRef.current);
    }
    if (!isEdit) router.push(`/invoices/${saved.id}`);
  } catch (err) {
    console.error('Save failed:', err);
  } finally {
    setSaving(false);
  }
};

  return (
    <section className='full-width flex-start-start flex-column'>
      <InvoiceHeader
        fields={committedFields}
        items={committedItems}
        onSave={handleSave}
        saving={saving}
        isEdit={isEdit}
      />
      <div className='flex-start-spacebetween basic-padding full-width'>
        <div className='pdf-preview-container'>
          <PDFPreview fields={committedFields} items={committedItems} />

        </div>
        <PDFToolbar
          fields={fields}
          items={items}
          selectedClient={selectedClient}
          onFieldChange={set}
          onItemUpdate={updateItem}
          onItemAdd={addItem}
          onItemRemove={removeItem}
          onClientSelect={isEdit ? () => {} : setSelectedClient}
          onClientClear={isEdit ? () => {} : clearClient}
          invoiceTotal={invoiceTotal}
          payments={payments}
          onPaymentsChange={setPayments}
          onTimeEntriesSaved={(ids, meta) => {
              selectedTimeEntryIdsRef.current = ids;
              setTimeEntriesMeta(meta);
            }}
          invoiceId={invoice?.id}
          existingTimeEntryIds={invoice?.time_entries?.map(String) ?? []}

          onCommitToPDF={handleCommitToPDF}



        />
      </div>
    </section>
  );
}