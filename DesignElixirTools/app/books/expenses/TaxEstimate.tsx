'use client';

import { useState, useEffect, useMemo } from 'react';
import { ExpenseCategory, Transaction } from '@/types/globalTypes';
import { fetchIncomeForYearAction, IncomeSummary } from '@/app/actions/invoiceActions';
import { computeCategoryTotals } from '../categories/categoryTotals';

interface TaxEstimateProps {
  transactions: Transaction[]; // all transactions; work ones in `year` are used
  categories: ExpenseCategory[];
  year: number;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
// Shared with the Expenses page, so the rate is entered once
export const TAX_RATE_KEY = 'books-tax-rate';
const DEFAULT_TAX_RATE = '20';

function Row({ label, value, note, strong, color }: { label: string; value: string; note?: string; strong?: boolean; color?: string }) {
  return (
    <div className='flex-center-spacebetween' style={{ gap: '20px', padding: '3px 0' }}>
      <span>
        {label}
        {note && <span style={{ color: '#999', fontSize: '11px' }}> · {note}</span>}
      </span>
      <span style={{ color, fontWeight: strong ? 700 : undefined, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

// Income received this year − fees − work write-offs = taxable; × your rate = estimated tax
export default function TaxEstimate({ transactions, categories, year }: TaxEstimateProps) {
  const [income, setIncome] = useState<IncomeSummary | null>(null);
  const [error, setError] = useState('');
  const [rate, setRate] = useState(DEFAULT_TAX_RATE);

  useEffect(() => {
    setRate(window.localStorage.getItem(TAX_RATE_KEY) || DEFAULT_TAX_RATE);
  }, []);

  useEffect(() => {
    fetchIncomeForYearAction(year)
      .then(setIncome)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load income'));
  }, [year]);

  // Work write-offs for the year (same rules as the Expenses page)
  const writeOff = useMemo(() => {
    const from = new Date(year, 0, 1).getTime();
    const to = new Date(year + 1, 0, 1).getTime();
    const work = transactions.filter((t) => {
      const time = new Date(t.date).getTime();
      return t.work_expense && time >= from && time < to;
    });
    return computeCategoryTotals(work, categories).totalWriteOff;
  }, [transactions, categories, year]);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!income) return <p style={{ color: '#666' }}>Loading...</p>;

  const rateNumber = Number(rate) || 0;
  const taxable = Math.max(income.received - income.fees - writeOff, 0);
  const tax = Math.round(taxable * rateNumber) / 100;

  return (
    <div style={{ fontSize: '14px', maxWidth: '420px' }}>
      <h6 style={{ margin: '0 0 8px' }}>Estimated taxes · {year}</h6>
      <Row
        label='Income received'
        value={currency.format(income.received)}
        note={`${income.payments} invoice payment${income.payments === 1 ? '' : 's'}`}
      />
      <Row label='− Processing fees' value={currency.format(income.fees)} color='#3a9d4f' />
      <Row label='− Work write-offs' value={currency.format(writeOff)} color='#3a9d4f' />
      <div style={{ borderTop: '1px solid #eee', marginTop: '4px', paddingTop: '4px' }}>
        <Row label='Taxable income' value={currency.format(taxable)} strong />
      </div>
      <div className='flex-center-spacebetween' style={{ gap: '20px', padding: '3px 0' }}>
        <span>
          × Tax rate{' '}
          <input
            type='number'
            min='0'
            max='100'
            step='0.1'
            value={rate}
            aria-label='Tax rate (%)'
            style={{ width: '80px' }}
            onChange={(e) => {
              setRate(e.target.value);
              window.localStorage.setItem(TAX_RATE_KEY, e.target.value);
            }}
          />{' '}
          %
        </span>
      </div>
      <div style={{ borderTop: '2px solid #333', marginTop: '4px', paddingTop: '4px' }}>
        <Row label='Estimated tax owed' value={currency.format(tax)} strong color='#b35c00' />
      </div>
      <p style={{ color: '#999', fontSize: '11px', margin: '8px 0 0' }}>
        A rough estimate, not tax advice: income is invoice payments received this year; write-offs come from your work
        transactions and category percentages.
      </p>
    </div>
  );
}
