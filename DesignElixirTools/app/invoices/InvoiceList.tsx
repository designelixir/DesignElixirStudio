'use client';

import { useEffect, useState } from 'react';
import { fetchInvoicesAction } from '@/app/actions/invoiceActions';
import { Invoice } from '@/app/types/globalTypes';
import Link from 'next/link';

interface InvoiceListProps {
  clientId?: string;
  projectId?: string;
}

function RatioPieChart({ ratio }: { ratio: number | null }) {
  if (ratio === null) {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '2px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', opacity: 0.4,
      }}>?</div>
    );
  }

  

  const clamped = Math.min(ratio, 1);
  const pct = ratio * 100;
  const color = ratio >= 0.85 ? '#22c55e' : ratio >= 0.65 ? '#f59e0b' : '#ef4444';

  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = clamped * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <svg width={32} height={32} viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={16} cy={16} r={r} fill="none" stroke="var(--white-2, #e5e7eb)" strokeWidth={4} />
        <circle
          cx={16} cy={16} r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span style={{ fontSize: '9px', opacity: 0.6 }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function InvoiceList({ clientId, projectId }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const sorted = [...invoices].sort((a, b) => {
    // Unpaid first
    const aUnpaid = !a.paid ? 0 : 1;
    const bUnpaid = !b.paid ? 0 : 1;
    if (aUnpaid !== bUnpaid) return aUnpaid - bUnpaid;
    // Then chronological by invoice_date
    const aDate = a.invoice_date ? new Date(a.invoice_date).getTime() : 0;
    const bDate = b.invoice_date ? new Date(b.invoice_date).getTime() : 0;
    return aDate - bDate;
  });

  useEffect(() => {
    fetchInvoices();
  }, [clientId, projectId]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoicesAction({ clientId, projectId });
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInvoiceTotal = (invoice: Invoice): number => {
    return (invoice.line_items_total || 0) - (invoice.adjustments || 0);
  };

  const getPaymentStatus = (invoice: Invoice) => {
    const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
    const total = getInvoiceTotal(invoice);
    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
    if (payments.length === 0) return { label: 'Unpaid', color: 'orange' };
    if (totalPaid >= total) return { label: 'Paid', color: 'green' };
    return { label: `Partial (${((totalPaid / total) * 100).toFixed(0)}%)`, color: '#f59e0b' };
  };

  // tracked hours = time_entries_sum (stored as hours)
  // billed hours = invoice total / hourly rate
  // ratio = billed / tracked (how much of tracked time was billed)
  const getHoursData = (invoice: Invoice): {
    trackedHours: number | null;
    billedHours: number | null;
    ratio: number | null;
  } => {
    const trackedHours = invoice.time_entries_sum ?? null;
    const hourlyRate = invoice.project_hourly ?? null;
    const invoiceTotal = getInvoiceTotal(invoice);

    if (!hourlyRate) return { trackedHours, billedHours: null, ratio: null };

    const billedHours = invoiceTotal / hourlyRate;
    const ratio = trackedHours && trackedHours > 0 ? billedHours / trackedHours : null;

    return { trackedHours, billedHours, ratio };
  };

  const fmtHours = (h: number | null): string => {
    if (h === null) return '—';
    return `${h.toFixed(2)}`;
  };

  if (loading) return <div>Loading invoices...</div>;
  if (invoices.length === 0) return <p style={{ opacity: 0.5 }}>No invoices found.</p>;

  return (
    <table className='full-width'>
      <thead>
        <tr>
          <th><label>Invoice ID</label></th>
          <th style={{ textAlign: 'left' }}><label>Client</label></th>
          
          <th style={{ textAlign: 'left' }}><label>Date</label></th>
          <th style={{ textAlign: 'right' }}><label>Tracked</label></th>
          <th style={{ textAlign: 'right' }}><label>Billed</label></th>
          <th style={{ textAlign: 'center' }}><label>Ratio</label></th>
          <th style={{ textAlign: 'right' }}><label>Total</label></th>
          <th style={{ textAlign: 'left' }}><label>Status</label></th>
        </tr>
      </thead>
      <tbody>
        {invoices.map(invoice => {
          const total = getInvoiceTotal(invoice);
          const status = getPaymentStatus(invoice);
          const { trackedHours, billedHours, ratio } = getHoursData(invoice);
          const currentYear = new Date().getFullYear();
          const invoiceYear = invoice.invoice_date ? new Date(invoice.invoice_date).getFullYear() : currentYear;

          return (
            <tr
              key={invoice.id}
              className={
                status.label === 'Paid' ? 'paid-invoice-row' :
                status.label.startsWith('Partial') ? 'partially-paid-invoice-row' :
                'unpaid-invoice-row'
              }
              style={{ opacity: invoiceYear < currentYear ? 0.25 : 1 }}
            >
              <td>
                <Link href={`/invoices/${invoice.id}`}>
                  <strong>{invoice.id}</strong>
                </Link>
              </td>
              <td>
                <div key={projectId} className="search-select-client-entry" style={{border: 'unset', padding: 'unset'}}>
              <div className='client-tag-wrapper' style={{backgroundColor: 'unset', }}>
                <div className='circle' style={{ backgroundColor: invoice.project_color || '#CCCCCC' }} />
                <p className='no-text-spacing'><Link href={`/client-list/${invoice.client_id}`}>{invoice.client_first} {invoice.client_last} </Link> - <strong>{invoice.project_name}</strong></p>
              </div>
            </div>
                </td>
              
              <td>
                <p className='no-text-spacing'>
                  {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '—'}
                </p>
              </td>
              <td style={{ textAlign: 'right' }}>
                <p className='teal-text no-text-spacing'><strong>{fmtHours(trackedHours)}</strong></p>
              </td>
              <td style={{ textAlign: 'right' }}>
                <p className='no-text-spacing'>{fmtHours(billedHours)}</p>
              </td>
              <td style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <RatioPieChart ratio={ratio} />
                </div>
              </td>
              <td style={{ textAlign: 'right' }}>
                <strong style={{ color: 'green' }}>${total.toFixed(2)}</strong>
              </td>
              <td>
                <span style={{ color: status.color, fontWeight: 'bold', fontSize: '13px' }}>
                  {status.label}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}