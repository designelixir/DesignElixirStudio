'use client';

import React from 'react';
import { ExpenseCategory, Transaction } from '@/types/globalTypes';
import { netCost } from './transactionAmounts';

export interface TransactionFilterValues {
  query: string;
  from: string; // YYYY-MM-DD, '' = no lower bound
  to: string;   // YYYY-MM-DD, '' = no upper bound
}

export const EMPTY_FILTERS: TransactionFilterValues = { query: '', from: '', to: '' };

// Local YYYY-MM-DD of a stored timestamp
export function localDay(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Everything a transaction can be found by: company, description, descriptor,
// cost (as typed: "12.5", "12.50", "$1,234.00"), date (several formats) and category
function searchText(t: Transaction, categories: ExpenseCategory[]) {
  const cost = Number(t.cost);
  const d = new Date(t.date);
  const category = categories.find((c) => c.id === t.expense_category_id)?.title;
  return [
    t.company,
    t.description,
    t.statement_descriptor,
    category,
    t.expense_category,
    ...(t.tags ?? []),
    String(cost),
    cost.toFixed(2),
    cost.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
    netCost(t).toFixed(2), // what's left after anything reconciled
    localDay(t.date),
    d.toLocaleDateString('en-US'),
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase();
}

export function filterTransactions(
  transactions: Transaction[],
  categories: ExpenseCategory[],
  { query, from, to }: TransactionFilterValues
) {
  // Every word must match somewhere, so "uber 2026" or "food march" narrow down
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return transactions.filter((t) => {
    const day = localDay(t.date);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (!words.length) return true;
    const text = searchText(t, categories);
    return words.every((w) => text.includes(w));
  });
}

interface TransactionFiltersProps {
  value: TransactionFilterValues;
  onChange: (value: TransactionFilterValues) => void;
  children?: React.ReactNode; // extra buttons, shown after Clear
}

// Search box plus a from / to date range for the transactions list
export default function TransactionFilters({ value, onChange, children }: TransactionFiltersProps) {
  const set = (field: keyof TransactionFilterValues, v: string) => onChange({ ...value, [field]: v });
  const active = value.query || value.from || value.to;

  return (
    <div className='flex-center-start flex-wrap' style={{ gap: '10px', marginBottom: '15px' }}>
      <input
        type='search'
        placeholder='Search company, description, cost, date, category, tag…'
        value={value.query}
        onChange={(e) => set('query', e.target.value)}
        style={{ flex: '1 1 280px', minWidth: '200px' }}
        aria-label='Search transactions'
      />
      <label className='flex-center-start no-flex-grow' style={{ gap: '6px' }}>
        From
        <input type='date' value={value.from} max={value.to || undefined} onChange={(e) => set('from', e.target.value)} />
      </label>
      <label className='flex-center-start no-flex-grow' style={{ gap: '6px' }}>
        To
        <input type='date' value={value.to} min={value.from || undefined} onChange={(e) => set('to', e.target.value)} />
      </label>
      {active && (
        <button type='button' onClick={() => onChange(EMPTY_FILTERS)}>
          Clear
        </button>
      )}
      {children}
    </div>
  );
}
