// components/invoice/PDFToolbar.tsx
'use client';

import { useState } from 'react';
import { InvoiceFields, PDFLineItem, SelectedClientData } from '../types/globalTypes';
import { PaymentEntry } from './PDFToolbarPayments';
import PDFToolbarDetails from './PDFToolbarDetails';
import PDFToolbarTime from './PDFToolbarTime';
import PDFToolbarPayments from './PDFToolbarPayments';

type Tab = 'details' | 'items' | 'payments';

const TABS: { id: Tab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'items', label: 'Line Items' },
  { id: 'payments', label: 'Payments' },
];

interface PDFToolbarProps {
  fields: InvoiceFields;
  items: PDFLineItem[];
  selectedClient: SelectedClientData | null;
  onFieldChange: (key: keyof InvoiceFields, val: string | boolean | number) => void;
  onItemUpdate: (id: number, patch: Partial<PDFLineItem>) => void;
  onItemAdd: (item: Omit<PDFLineItem, 'id'>) => void;
  onItemRemove: (id: number) => void;
  onClientSelect: (client: SelectedClientData | null) => void;
  onClientClear: () => void;
  invoiceTotal: number;
  payments: PaymentEntry[];
  onPaymentsChange: (payments: PaymentEntry[]) => void;
  defaultRate?: number;
  existingTimeEntryIds?: string[];
  invoiceId?: string;
  onCommitToPDF: () => void;
  onTimeEntriesSaved: (ids: string[], meta: { totalSeconds: number; earliest: Date | null; latest: Date | null }) => void;
}

export default function PDFToolbar({
  fields,
  items,
  selectedClient,
  onFieldChange,
  onItemUpdate,
  onItemAdd,
  onItemRemove,
  onClientSelect,
  onClientClear,
  invoiceTotal,
  payments,
  onPaymentsChange,
  defaultRate = 0,
  existingTimeEntryIds = [],
  invoiceId,
  onCommitToPDF,
  onTimeEntriesSaved,
}: PDFToolbarProps) {
  const [tab, setTab] = useState<Tab>('details');

  return (
    <div className="pdf-toolbar-wrapper">
      <div className='pdf-toolbar-tabs-wrapper flex-center-start'>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? 'tab-button tab-button-active' : 'tab-button'}
            style={{ flex: 1, fontSize: '12px' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className='pdf-tab-container'>
        {tab === 'details' && (
          <PDFToolbarDetails
            fields={fields}
            selectedClient={selectedClient}
            onFieldChange={onFieldChange}
            onClientSelect={onClientSelect}
            onClientClear={onClientClear}
          />
        )}
        {tab === 'items' && (
          <PDFToolbarTime
            selectedClient={selectedClient}
            existingTimeEntryIds={existingTimeEntryIds}
            invoiceId={invoiceId}
            fields={fields}
            items={items}
            onFieldChange={onFieldChange}
            onItemUpdate={onItemUpdate}
            onItemAdd={onItemAdd}
            onItemRemove={onItemRemove}
            defaultRate={defaultRate}
            onTimeEntriesSaved={onTimeEntriesSaved}
          />
        )}
        {tab === 'payments' && (
          <PDFToolbarPayments
            fields={fields}
            invoiceTotal={invoiceTotal}
            payments={payments}
            onPaymentsChange={onPaymentsChange}
          />
        )}
      </div>

      <button
        onClick={onCommitToPDF}
        className='green-button'
        style={{ width: 'calc(100% - 10px)', marginBottom: '8px' }}
      >
        Update PDF Preview
      </button>
    </div>
  );
}