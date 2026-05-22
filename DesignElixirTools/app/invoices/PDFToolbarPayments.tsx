// components/invoice/PDFToolbarPayments.tsx
'use client';

import { useState } from 'react';
import { InvoiceFields } from '../types/globalTypes';
import Image from 'next/image';
import { InvoicePayment as PaymentEntry } from '../types/globalTypes';
export type { PaymentEntry }

const PAYMENT_METHODS = [
  'Cash',
  'Check',
  'Stripe',
  'Stripe (ACH)',
  'Venmo',
  'PayPal',
  'Zelle',
];

interface PDFToolbarPaymentsProps {
  fields: InvoiceFields;
  invoiceTotal: number;
  payments: PaymentEntry[];
  onPaymentsChange: (payments: PaymentEntry[]) => void;
}

function emptyPayment(defaultAmount = 0): PaymentEntry {
  return {
    id: crypto.randomUUID(),
    method: 'Stripe',
    amount: defaultAmount,
    date_received: new Date().toISOString().split('T')[0],
    fees: 0,
  };
}

export default function PDFToolbarPayments({
  fields,
  invoiceTotal,
  payments,
  onPaymentsChange,
}: PDFToolbarPaymentsProps) {
  const [draft, setDraft] = useState<Omit<PaymentEntry, 'id'>>(emptyPayment(invoiceTotal));


  const updateEntry = (id: string, patch: Partial<PaymentEntry>) => {
    onPaymentsChange(payments.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const removeEntry = (id: string) => {
    onPaymentsChange(payments.filter(p => p.id !== id));
  };

  const commitDraft = () => {
    onPaymentsChange([...payments, { ...draft, id: crypto.randomUUID() }]);
    const alreadyPaid = payments.reduce((s, p) => s + p.amount, 0) + draft.amount;
    const remaining = Math.max(0, invoiceTotal - alreadyPaid);
    setDraft(emptyPayment(remaining));
  };

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalFees = payments.reduce((s, p) => s + (p.fees || 0), 0);
  const balance = invoiceTotal - totalPaid;

  return (
    <div style={{ width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr className='pdf-line-items-table'>
            <th style={{ textAlign: 'left', width: '120px' }}>Method</th>
            <th style={{ textAlign: 'left' }}>Date</th>
            <th style={{ textAlign: 'right', width: '100px' }}>Amount</th>
            <th style={{ textAlign: 'right', width: '80px' }}>Fees</th>
            <th style={{ width: '28px' }}></th>
          </tr>
        </thead>
        <tbody>

          {/* Committed rows */}
          {payments.map(p => (
            <tr className='pdf-line-items-table' key={p.id}>
              <td>
                <select
                  value={p.method}
                  onChange={e => updateEntry(p.id, { method: e.target.value })}
                  style={{ fontSize: '12px', width: '100%' }}
                >
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </td>
              <td>
                <input
                  type='date'
                  value={p.date_received}
                  onChange={e => updateEntry(p.id, { date_received: e.target.value })}
                  style={{ width: '100%' }}
                />
              </td>
              <td>
                <input
                  type='number'
                  value={p.amount || ''}
                  onChange={e => updateEntry(p.id, { amount: parseFloat(e.target.value) || 0 })}
                  placeholder='0.00'
                  style={{ width: '100%', textAlign: 'right' }}
                />
              </td>
              <td>
                <input
                  type='number'
                  value={p.fees || ''}
                  onChange={e => updateEntry(p.id, { fees: parseFloat(e.target.value) || 0 })}
                  placeholder='0.00'
                  style={{ width: '100%', textAlign: 'right' }}
                />
              </td>
              <td style={{ textAlign: 'center' }}>
                <button
                  onClick={() => removeEntry(p.id)}
                  className='icon-button'
                  
                ><Image src="/trash.svg" alt="trash icon" width={15} height={15} /></button>
              </td>
            </tr>
          ))}

          {/* Draft row */}
          <tr>
            <td style={{ padding: '3px 2px' }}>
              <select
                value={draft.method}
                onChange={e => setDraft(prev => ({ ...prev, method: e.target.value }))}
                style={{ fontSize: '12px', width: '100%' }}
              >
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </td>
            <td style={{ padding: '3px 2px' }}>
              <input
                type='date'
                value={draft.date_received}
                onChange={e => setDraft(prev => ({ ...prev, date_received: e.target.value }))}
                style={{ width: '100%' }}
              />
            </td>
            <td style={{ padding: '3px 2px' }}>
              <input
                type='number'
                value={draft.amount || ''}
                onChange={e => setDraft(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder='0.00'
                style={{ width: '100%', textAlign: 'right' }}
              />
            </td>
            <td style={{ padding: '3px 2px' }}>
              <input
                type='number'
                value={draft.fees || ''}
                onChange={e => setDraft(prev => ({ ...prev, fees: parseFloat(e.target.value) || 0 }))}
                placeholder='0.00'
                style={{ width: '100%', textAlign: 'right' }}
              />
            </td>
            <td style={{ textAlign: 'center' }}>
              <button
                onClick={commitDraft}
                className='button'
                title='Add payment'
                style={{ fontSize: '24px', fontWeight: '200', padding: '5px 10px', lineHeight: '24px' }}
              >+</button>
            </td>
          </tr>

        </tbody>
      </table>

      {/* Summary */}
      <div style={{ paddingTop: '8px', borderTop: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div className='flex-center-spacebetween' style={{ fontSize: '12px' }}>
          <span style={{ opacity: 0.6 }}>Invoice total</span>
          <span>${invoiceTotal.toFixed(2)}</span>
        </div>
        <div className='flex-center-spacebetween' style={{ fontSize: '12px' }}>
          <span style={{ opacity: 0.6 }}>Total paid</span>
          <span>${totalPaid.toFixed(2)}</span>
        </div>
        {totalFees > 0 && (
          <div className='flex-center-spacebetween' style={{ fontSize: '12px' }}>
            <span style={{ opacity: 0.6 }}>Total fees</span>
            <span>−${totalFees.toFixed(2)}</span>
          </div>
        )}
        <div className='flex-center-spacebetween' style={{ fontSize: '13px', fontWeight: 600, borderTop: '0.5px solid var(--border)', paddingTop: '6px', marginTop: '2px' }}>
          <span style={{ color: balance > 0 ? 'var(--color-warning, #f59e0b)' : balance < 0 ? 'var(--color-error, #ef4444)' : 'inherit' }}>
            {balance > 0 ? 'Balance due' : balance < 0 ? 'Overpaid' : 'Paid in full ✓'}
          </span>
          {balance !== 0 && (
            <span style={{ color: balance > 0 ? 'var(--color-warning, #f59e0b)' : 'var(--color-error, #ef4444)' }}>
              ${Math.abs(balance).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}