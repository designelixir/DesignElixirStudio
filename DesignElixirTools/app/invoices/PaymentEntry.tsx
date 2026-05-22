'use client';

import { useState } from 'react';
import { Invoice } from '../types/globalTypes';

const PAYMENT_METHODS = [
  'Cash',
  'Check',
  'Stripe (Card)',
  'Stripe (ACH)',
  'Venmo',
  'PayPal',
  'Zelle',
];

export interface PaymentEntry {
  id: string;
  method: string;
  amount: number;
  date_received: string;
  fees: number;
}

interface PaymentFieldsProps {
  invoice: Invoice;
  invoiceTotal: number;
  initialPayments?: PaymentEntry[];
  onChange?: (payments: PaymentEntry[]) => void;
}

function emptyPayment(defaultAmount: number): PaymentEntry {
  return {
    id: crypto.randomUUID(),
    method: 'Zelle',
    amount: defaultAmount,
    date_received: new Date().toISOString().split('T')[0],
    fees: 0,
  };
}

export default function PaymentFields({
  invoice,
  invoiceTotal,
  initialPayments,
  onChange,
}: PaymentFieldsProps) {
  const [paid, setPaid] = useState(invoice.paid ?? false);
  const [payments, setPayments] = useState<PaymentEntry[]>(
    initialPayments && initialPayments.length > 0
      ? initialPayments
      : [emptyPayment(invoiceTotal)]
  );

  const updatePayments = (next: PaymentEntry[]) => {
    setPayments(next);
    onChange?.(next);
  };

  const updateEntry = (id: string, patch: Partial<PaymentEntry>) => {
    updatePayments(payments.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const addEntry = () => {
    const alreadyPaid = payments.reduce((s, p) => s + p.amount, 0);
    const remaining = Math.max(0, invoiceTotal - alreadyPaid);
    updatePayments([...payments, emptyPayment(remaining)]);
  };

  const removeEntry = (id: string) => {
    updatePayments(payments.filter(p => p.id !== id));
  };

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalFees = payments.reduce((s, p) => s + (p.fees || 0), 0);
  const balance = invoiceTotal - totalPaid;

  return (
    <div className='flex-start-start flex-column' style={{ gap: '8px', width: '100%' }}>

      {/* Paid toggle */}
      <div className='flex-start-start flex-column form-input-wrapper'>
        <label>Status</label>
        <div className='flex-center-start' style={{ gap: '8px' }}>
          <label className='switch'>
            <input
              type='checkbox'
              checked={paid}
              onChange={e => setPaid(e.target.checked)}
            />
            <span className='slider'></span>
          </label>
          <span style={{ fontSize: '12px' }}>{paid ? 'Paid' : 'Unpaid'}</span>
        </div>
      </div>

      {/* Payment entries */}
      {paid && (
        <div className='flex-start-start flex-column' style={{ gap: '6px', width: '100%' }}>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 80px 24px', gap: '4px', width: '100%' }}>
            {['Method', 'Date Received', 'Amount', 'Fees', ''].map(h => (
              <span key={h} style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{h}</span>
            ))}
          </div>

          {/* Payment rows */}
          {payments.map(p => (
            <div
              key={p.id}
              style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 80px 24px', gap: '4px', width: '100%', alignItems: 'center' }}
            >
              <select
                value={p.method}
                onChange={e => updateEntry(p.id, { method: e.target.value })}
                style={{ fontSize: '12px', width: '100%' }}
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <input
                type='date'
                value={p.date_received}
                onChange={e => updateEntry(p.id, { date_received: e.target.value })}
                style={{ width: '100%' }}
              />

              <input
                type='number'
                value={p.amount || ''}
                onChange={e => updateEntry(p.id, { amount: parseFloat(e.target.value) || 0 })}
                placeholder='0.00'
                style={{ width: '100%', textAlign: 'right' }}
              />

              <input
                type='number'
                value={p.fees || ''}
                onChange={e => updateEntry(p.id, { fees: parseFloat(e.target.value) || 0 })}
                placeholder='0.00'
                style={{ width: '100%', textAlign: 'right' }}
              />

              <button
                onClick={() => removeEntry(p.id)}
                className='icon-button'
                style={{ opacity: 0.4, fontSize: '14px' }}
              >
                ×
              </button>
            </div>
          ))}

          {/* Add payment */}
          <button
            onClick={addEntry}
            className='system-button'
            style={{ width: '100%', border: '0.5px dashed', padding: '6px', marginTop: '2px' }}
          >
            + Add payment
          </button>

          {/* Summary */}
          <div style={{ width: '100%', borderTop: '0.5px solid var(--border)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
      )}
    </div>
  );
}