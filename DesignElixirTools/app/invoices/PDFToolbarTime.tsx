// components/invoice/PDFToolbarTime.tsx
'use client';

import { useState, useEffect } from 'react';
import { InvoiceFields, PDFLineItem, SelectedClientData } from '../types/globalTypes';
import PDFToolbarLineItems from './PDFToolbarLineItems';
import { fetchTimeEntriesByIds } from './invoiceActions';
import SelectTimeEntriesModal from './SelectTimeEntriesModal';

interface TimeEntryMeta {
  totalSeconds: number;
  earliest: Date | null;
  latest: Date | null;
  count: number;
}

interface PDFToolbarTimeProps {
  selectedClient: SelectedClientData | null;
  existingTimeEntryIds: string[];
  invoiceId?: string;
  fields: InvoiceFields;
  items: PDFLineItem[];
  onFieldChange: (key: keyof InvoiceFields, val: string | boolean | number) => void;
  onItemUpdate: (id: number, patch: Partial<PDFLineItem>) => void;
  onItemAdd: (item: Omit<PDFLineItem, 'id'>) => void;
  onItemRemove: (id: number) => void;
  defaultRate?: number;
  onTimeEntriesSaved: (ids: string[], meta: { totalSeconds: number; earliest: Date | null; latest: Date | null }) => void;
}

export default function PDFToolbarTime({
  selectedClient,
  existingTimeEntryIds,
  invoiceId,
  fields,
  items,
  onFieldChange,
  onItemUpdate,
  onItemAdd,
  onItemRemove,
  defaultRate = 0,
  onTimeEntriesSaved,
}: PDFToolbarTimeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIds, setCurrentIds] = useState<string[]>(existingTimeEntryIds);
  const [meta, setMeta] = useState<TimeEntryMeta | null>(null);

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    if (existingTimeEntryIds.length === 0) return;
    setCurrentIds(existingTimeEntryIds);
    fetchTimeEntriesByIds(existingTimeEntryIds).then(data => {
      const totalSeconds = data.reduce((s: number, e: any) => s + (e.time_lapsed || 0), 0);
      const dates = data
        .map((e: any) => new Date(e.start_time))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());
      setMeta({
        totalSeconds,
        earliest: dates[0] ?? null,
        latest: dates[dates.length - 1] ?? null,
        count: existingTimeEntryIds.length,
      });
    });
  }, [existingTimeEntryIds.join(',')]);

  const handleDone = (ids: string[], newMeta: { totalSeconds: number; earliest: Date | null; latest: Date | null }) => {
    setCurrentIds(ids);
    setMeta({ ...newMeta, count: ids.length });
    onTimeEntriesSaved(ids, newMeta);
    setIsOpen(false);
  };

  return (
    <div>
      <SelectTimeEntriesModal
        selectedClient={selectedClient}
        existingTimeEntryIds={currentIds}
        invoiceId={invoiceId}
        isOpen={isOpen}
        meta={meta}
        onOpen={() => setIsOpen(true)}
        onDone={handleDone}
        onClose={() => setIsOpen(false)}
        fmt={fmt}
      />

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
        <PDFToolbarLineItems
          fields={fields}
          items={items}
          onFieldChange={onFieldChange}
          onItemUpdate={onItemUpdate}
          onItemAdd={onItemAdd}
          onItemRemove={onItemRemove}
          defaultRate={defaultRate}
        />
      </div>
    </div>
  );
}