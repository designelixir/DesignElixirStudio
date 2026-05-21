// components/invoice/PDFToolbarDetails.tsx
'use client';

import { useEffect } from 'react';
import { InvoiceFields, SelectedClientData } from '../types/globalTypes';
import SearchAndSelectClient from '../components/SearchAndSelectClient';
import SelectableCalendar from '../components/SelectableCalendar';

const BILL_TO_ADDRESSES = [
  { label: 'Twin Lakes', value: '6451 E Highway 82, Unit D\nTwin Lakes, CO 81251' },
  { label: 'Denver', value: '3929 Lipan Street\nDenver, CO 80211' },
];

interface PDFToolbarDetailsProps {
  fields: InvoiceFields;
  selectedClient: SelectedClientData | null;
  onFieldChange: (key: keyof InvoiceFields, val: string | boolean | number) => void;
  onClientSelect: (client: SelectedClientData | null) => void;
  onClientClear: () => void;
}



export default function PDFToolbarDetails({
  fields,
  selectedClient,
  onFieldChange,
  onClientSelect,
  onClientClear,
}: PDFToolbarDetailsProps) 


{
    useEffect(() => {
  if (!fields.invDate || fields.invDue) return;
  const due = new Date(fields.invDate);
  due.setDate(due.getDate() + 14);
  onFieldChange('invDue', due.toISOString().split('T')[0]);
}, [fields.invDate]);


  return (
    <>
      <div className='flex-start-start flex-column form-input-wrapper'>
        <label>Client</label>
        <SearchAndSelectClient
          selectedClient={selectedClient}
          onClientSelect={(client) => {
            if (!client) { onClientClear(); return; }
            onClientSelect(client);
          }}
        />
      </div>
      
      <div className='flex-center-start'>
        <div className='flex-start-start flex-column form-input-wrapper'>
            <label>Invoice date</label>
            <SelectableCalendar
            label="Invoice date"
            value={fields.invDate ? new Date(fields.invDate) : null}
            onChange={(date) => onFieldChange('invDate', date.toISOString().split('T')[0])}
            allowFutureDates={true}
            showPassedTimeValue={true}
            showTime={false}
            />
        </div>
        <div className='flex-start-start flex-column form-input-wrapper'>
            <label>Due date</label>
            <SelectableCalendar
            label="Due date"
            value={fields.invDue ? new Date(fields.invDue) : null}
            onChange={(date) => onFieldChange('invDue', date.toISOString().split('T')[0])}
            allowFutureDates={true}
            showPassedTimeValue={true}
            showTime={false}
            />
        </div>
      </div>
      
      
      <div className='flex-start-start flex-column form-input-wrapper'>
        <label>Notes</label>
        <textarea
          value={fields.notes}
          onChange={e => onFieldChange('notes', e.target.value)}
          rows={4}
          style={{width: '100%'}}
          placeholder='Visible to client…'
        />
      </div>
      <div className='flex-start-start flex-column form-input-wrapper'>
        <label>Bill to address</label>
        <select
          className='full-width'
          value={fields.fromAddress}
          onChange={e => onFieldChange('fromAddress', e.target.value)}
        >
          <option value="">Select address…</option>
          {BILL_TO_ADDRESSES.map(addr => (
            <option key={addr.label} value={addr.value}>{addr.label}</option>
          ))}
        </select>
      </div>
    </>
  );
}