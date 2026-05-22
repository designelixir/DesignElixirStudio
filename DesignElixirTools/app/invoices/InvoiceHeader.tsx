'use client';

import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { useMemo } from 'react';
import { InvoiceFields, PDFLineItem } from '../types/globalTypes';
import InvoiceDocument from './InvoiceDocument';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFDownloadLink),
  { ssr: false }
);

interface Props {
  fields: InvoiceFields;
  items: PDFLineItem[];
  onSave: () => void;
  saving: boolean;
  isEdit: boolean;
}

export default function InvoiceHeader({ fields, items, onSave, saving, isEdit }: Props) {
  const fileName = `Invoice-${fields.toName || 'draft'}-${fields.invDate}.pdf`;

  const document = useMemo(
    () => <InvoiceDocument fields={fields} items={items} />,
    [fields, items]
  );

  return (
    <div className='flex-center-spacebetween no-flex-grow full-width calculated-time-wrapper'>
      <div className='basic-padding'>
        <h2 className='no-text-spacing'>
          <NextLink href="/invoices" className='no-link-styling' style={{ opacity: 0.5 }}>Invoices</NextLink>
          &nbsp;| {isEdit ? 'View / Edit Invoice' : 'Create Invoice'}
        </h2>
        <p className='no-text-spacing' style={{ fontSize: '13px', opacity: 0.6, marginTop: '2px' }}>
          {fields.toName ? `Invoice for ${fields.toName}` : 'No client selected'}
          {fields.invNumber ? ` · #${fields.invNumber}` : ''}
        </p>
      </div>
      <div className='flex-center-end' style={{ gap: '8px' }}>
        <button onClick={onSave} disabled={saving} className='system-button'>
          {saving ? 'Saving…' : 'Save Invoice'}
        </button>
        <PDFDownloadLink document={document} fileName={fileName}>
          {({ loading }) => (
            <button disabled={loading}>{loading ? 'Preparing…' : '⬇ Download PDF'}</button>
          )}
        </PDFDownloadLink>
      </div>
    </div>
  );
}