'use client';

import { Account } from '@/types/globalTypes';
import { TransactionFilters } from '@/app/actions/transactionActions';

// What the filter controls hold; turned into TransactionFilters with toTransactionFilters()
export interface CategoryFilterState {
  period: string;      // a year like "2026", "all", or "custom"
  customStart: string; // YYYY-MM-DD, when period is "custom"
  customEnd: string;   // YYYY-MM-DD, inclusive
  accountId: string;   // '' = all accounts
  work: 'all' | 'work' | 'personal';
}

export function defaultCategoryFilters(): CategoryFilterState {
  return {
    period: String(new Date().getFullYear()),
    customStart: '',
    customEnd: '',
    accountId: '',
    work: 'all',
  };
}

// Local midnight of a YYYY-MM-DD day, as an ISO timestamp
function localMidnight(day: string, addDays = 0) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d + addDays).toISOString();
}

export function toTransactionFilters(state: CategoryFilterState): TransactionFilters {
  const filters: TransactionFilters = {};
  if (/^\d{4}$/.test(state.period)) {
    const year = Number(state.period);
    filters.from = new Date(year, 0, 1).toISOString();
    filters.to = new Date(year + 1, 0, 1).toISOString();
  } else if (state.period === 'custom') {
    if (state.customStart) filters.from = localMidnight(state.customStart);
    if (state.customEnd) filters.to = localMidnight(state.customEnd, 1); // include the end day
  }
  if (state.accountId) filters.accountId = state.accountId;
  if (state.work !== 'all') filters.workExpense = state.work === 'work';
  return filters;
}

interface CategoryFiltersProps {
  value: CategoryFilterState;
  onChange: (value: CategoryFilterState) => void;
  accounts: Account[];
  years: number[]; // newest first
  hideWork?: boolean; // hide the work/personal choice (e.g. a work-only page)
}

export default function CategoryFilters({ value, onChange, accounts, years, hideWork }: CategoryFiltersProps) {
  const set = <K extends keyof CategoryFilterState>(field: K, v: CategoryFilterState[K]) =>
    onChange({ ...value, [field]: v });
  const thisYear = new Date().getFullYear();
  // When the work choice is hidden, the page sets it, so it doesn't count as a change
  const isDefault =
    JSON.stringify({ ...value, work: hideWork ? 'all' : value.work }) === JSON.stringify(defaultCategoryFilters());

  return (
    <div className='flex-end-start flex-wrap' style={{ gap: '10px', marginBottom: '20px' }}>
      <div className='flex-start-start flex-column no-flex-grow'>
        <label>Period</label>
        <select value={value.period} onChange={(e) => set('period', e.target.value)}>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y === thisYear ? `This year (${y})` : y}</option>
          ))}
          <option value='all'>All time</option>
          <option value='custom'>Custom range</option>
        </select>
      </div>

      {value.period === 'custom' && (
        <>
          <div className='flex-start-start flex-column no-flex-grow'>
            <label>From</label>
            <input type='date' value={value.customStart} max={value.customEnd || undefined}
              onChange={(e) => set('customStart', e.target.value)} />
          </div>
          <div className='flex-start-start flex-column no-flex-grow'>
            <label>To</label>
            <input type='date' value={value.customEnd} min={value.customStart || undefined}
              onChange={(e) => set('customEnd', e.target.value)} />
          </div>
        </>
      )}

      <div className='flex-start-start flex-column no-flex-grow'>
        <label>Account</label>
        <select value={value.accountId} onChange={(e) => set('accountId', e.target.value)}>
          <option value=''>All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.brand ? `${a.brand} ${a.name}` : a.name}</option>
          ))}
        </select>
      </div>

      {!hideWork && (
      <div className='flex-start-start flex-column no-flex-grow'>
        <label>Expenses</label>
        <select value={value.work} onChange={(e) => set('work', e.target.value as CategoryFilterState['work'])}>
          <option value='all'>Work and personal</option>
          <option value='work'>Work only</option>
          <option value='personal'>Personal only</option>
        </select>
      </div>
      )}

      {!isDefault && (
        <button type='button' onClick={() => onChange(defaultCategoryFilters())}>Reset</button>
      )}
    </div>
  );
}
