'use client';

import dynamic from 'next/dynamic';
import { memo } from 'react';
import { InvoiceFields, PDFLineItem } from '../types/globalTypes';
import InvoiceDocument from './InvoiceDocument';

const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFViewer),
  { ssr: false }
);

interface Props {
  fields: InvoiceFields;
  items: PDFLineItem[];
}

export default memo(function PDFPreview({ fields, items }: Props) {
  console.log('PDFPreview rendered', new Date().toISOString());

  return (
    <div className='full-width flex-column pdf-preview-container' style={{ flex: 1 }}>
      <PDFViewer style={{ width: '100%', height: '100%' }}>
        <InvoiceDocument fields={fields} items={items} />
      </PDFViewer>
    </div>
  );
});