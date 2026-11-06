'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { fetchAccountsAction } from '@/app/actions/accountActions';
import { fetchStatementsAction } from '@/app/actions/statementActions';
import { fetchExpenseCategoriesAction } from '@/app/actions/expenseCategoryActions';
import {
  fetchFilteredTransactionsAction,
  fetchEarliestTransactionDateAction,
} from '@/app/actions/transactionActions';
import CategoryFilters, {
  CategoryFilterState,
  defaultCategoryFilters,
  toTransactionFilters,
} from '../categories/CategoryFilters';
import { computeCategoryTotals, UNCATEGORIZED_KEY } from '../categories/categoryTotals';
import TransactionsTable from '../TransactionsTable';
import BooksHeader from '../BooksHeader';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const TAX_RATE_KEY = 'books-tax-rate'; // remembered in this browser

// This page is always work expenses only
const workOnly = (f: CategoryFilterState): CategoryFilterState => ({ ...f, work: 'work' });

interface Group {
  key: string;
  title: string;
  color: string;
  percent: number;   // write-off %
  spent: number;     // purchases minus credits
  writeOff: number;  // spent × percent
  transactions: Transaction[];
}

export default function Expenses() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [years, setYears] = useState<number[]>([new Date().getFullYear()]);
  const [filters, setFilters] = useState<CategoryFilterState>(() => workOnly(defaultCategoryFilters()));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const latestRequest = useRef(0);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [taxRate, setTaxRate] = useState('');

  // Categories, accounts, statements, the year list, and your saved tax rate — once
  useEffect(() => {
    Promise.all([fetchExpenseCategoriesAction(), fetchAccountsAction(), fetchStatementsAction()])
      .then(([cats, accts, stmts]) => {
        setCategories(cats);
        setAccounts(accts);
        setStatements(stmts);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
    fetchEarliestTransactionDateAction()
      .then((earliest) => {
        const thisYear = new Date().getFullYear();
        const firstYear = earliest ? Math.min(new Date(earliest).getFullYear(), thisYear) : thisYear;
        const list: number[] = [];
        for (let y = thisYear; y >= firstYear; y--) list.push(y);
        setYears(list);
      })
      .catch((err) => console.error('Error loading years:', err));
    setTaxRate(window.localStorage.getItem(TAX_RATE_KEY) ?? '');
  }, []);

  // Work transactions for the filters
  useEffect(() => {
    if (filters.period === 'custom' && (!filters.customStart || !filters.customEnd)) return;
    const request = ++latestRequest.current;
    fetchFilteredTransactionsAction(toTransactionFilters(filters))
      .then((txns) => {
        if (request === latestRequest.current) setTransactions(txns);
      })
      .catch((err) => {
        if (request === latestRequest.current) setError(err instanceof Error ? err.message : 'Failed to load transactions');
      })
      .finally(() => {
        if (request === latestRequest.current) setLoading(false);
      });
  }, [filters, reloadKey]);

  const handleFiltersChange = (next: CategoryFilterState) => {
    setLoading(true);
    setFilters(workOnly(next));
  };

  // Group by category (same rules as the categories page totals)
  const { groups, totalSpent, totalWriteOff } = useMemo(() => {
    const totals = computeCategoryTotals(transactions, categories);
    const ids = new Set(categories.map((c) => c.id));
    const list: Group[] = categories
      .map((c) => {
        const t = totals.byCategory.get(c.id)!;
        return {
          key: c.id,
          title: c.title,
          color: c.color ?? '#ccc',
          percent: Number(c.percent_writeoff),
          spent: t.spent,
          writeOff: t.writeOff,
          transactions: transactions.filter((x) => x.expense_category_id === c.id),
        };
      })
      .filter((g) => g.transactions.length > 0);
    const uncategorized = transactions.filter(
      (x) => x.purchase && (!x.expense_category_id || !ids.has(x.expense_category_id))
    );
    if (uncategorized.length > 0) {
      list.push({
        key: UNCATEGORIZED_KEY,
        title: 'Uncategorized',
        color: '#e6e6e6',
        percent: 0,
        spent: totals.uncategorized.spent,
        writeOff: 0,
        transactions: uncategorized,
      });
    }
    list.sort((a, b) => b.writeOff - a.writeOff || b.spent - a.spent);
    const spent = list.reduce((sum, g) => sum + Math.max(g.spent, 0), 0);
    const writeOff = list.reduce((sum, g) => sum + g.writeOff, 0);
    return { groups: list, totalSpent: Math.round(spent * 100) / 100, totalWriteOff: Math.round(writeOff * 100) / 100 };
  }, [transactions, categories]);

  const rate = Number(taxRate);
  const taxSavings = taxRate !== '' && rate > 0 ? Math.round(totalWriteOff * rate) / 100 : null;
  const uncategorizedGroup = groups.find((g) => g.key === UNCATEGORIZED_KEY);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const periodLabel =
    /^\d{4}$/.test(filters.period) ? filters.period : filters.period === 'all' ? 'all time' : 'this range';
  const waitingForDates = filters.period === 'custom' && (!filters.customStart || !filters.customEnd);

  return (
    <div className='full-width basic-padding'>
      <BooksHeader title='Expenses' subtitle={<h6>Work expenses only, grouped by category</h6>} />

      <CategoryFilters value={filters} onChange={handleFiltersChange} accounts={accounts} years={years} hideWork />

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
      {waitingForDates && <p style={{ color: '#666' }}>Pick a start and end date to see expenses.</p>}

      {!waitingForDates && (
        <>
          {/* Estimated write-off summary */}
          <div className='card flex-start-start flex-wrap' style={{ background: 'white', gap: '40px', marginBottom: '25px', opacity: loading ? 0.5 : 1 }}>
            <div>
              <h6 style={{ margin: 0 }}>Work spending ({periodLabel})</h6>
              <h2 style={{ margin: '4px 0 0' }}>{currency.format(totalSpent)}</h2>
              <p style={{ margin: '2px 0 0', color: '#666', fontSize: '12px' }}>
                {transactions.length} transaction{transactions.length === 1 ? '' : 's'}
              </p>
            </div>
            <div>
              <h6 style={{ margin: 0 }}>Estimated write-off</h6>
              <h2 style={{ margin: '4px 0 0', color: '#3a9d4f' }}>{currency.format(totalWriteOff)}</h2>
              <p style={{ margin: '2px 0 0', color: '#666', fontSize: '12px' }}>each category × its write-off %</p>
            </div>
            <div>
              <h6 style={{ margin: 0 }}>Your tax rate (%)</h6>
              <input
                type='number'
                min='0'
                max='100'
                step='0.1'
                value={taxRate}
                placeholder='e.g., 25'
                style={{ width: '100px', marginTop: '4px' }}
                onChange={(e) => {
                  setTaxRate(e.target.value);
                  window.localStorage.setItem(TAX_RATE_KEY, e.target.value);
                }}
              />
            </div>
            <div>
              <h6 style={{ margin: 0 }}>Estimated tax savings</h6>
              <h2 style={{ margin: '4px 0 0' }}>{taxSavings !== null ? currency.format(taxSavings) : '—'}</h2>
              <p style={{ margin: '2px 0 0', color: '#666', fontSize: '12px' }}>
                {taxSavings !== null ? `write-off × ${rate}%` : 'enter your tax rate'}
              </p>
            </div>
          </div>

          {uncategorizedGroup && (
            <p style={{ color: '#b35c00', fontSize: '13px' }}>
              {uncategorizedGroup.transactions.length} work purchase{uncategorizedGroup.transactions.length === 1 ? ' has' : 's have'} no
              category ({currency.format(uncategorizedGroup.spent)}), so {uncategorizedGroup.transactions.length === 1 ? "it isn't" : "they aren't"} counted
              in the write-off yet.
            </p>
          )}

          {!loading && groups.length === 0 && (
            <p style={{ color: '#666' }}>No work expenses for these filters. Mark transactions as work with the Work toggle.</p>
          )}

          {/* One row per category; click to see its transactions */}
          {groups.length > 0 && (
            <table style={{ opacity: loading ? 0.5 : 1 }}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Transactions</th>
                  <th style={{ textAlign: 'right' }}>Spent</th>
                  <th style={{ textAlign: 'right' }}>Write-off %</th>
                  <th style={{ textAlign: 'right' }}>Write-off</th>
                  {taxSavings !== null && <th style={{ textAlign: 'right' }}>Tax savings</th>}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const open = openGroups.has(g.key);
                  const columns = taxSavings !== null ? 6 : 5;
                  return (
                    <React.Fragment key={g.key}>
                      <tr
                        role='button'
                        tabIndex={0}
                        aria-expanded={open}
                        onClick={() => toggleGroup(g.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleGroup(g.key);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span className='flex-center-start' style={{ gap: '8px' }}>
                            <span style={{ color: '#999', width: '10px' }}>{open ? '▾' : '▸'}</span>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: g.color, flex: 'none' }} />
                            <strong>{g.title}</strong>
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{g.transactions.length}</td>
                        <td style={{ textAlign: 'right' }}>{currency.format(g.spent)}</td>
                        <td style={{ textAlign: 'right', color: g.percent === 0 ? '#999' : undefined }}>{g.percent}%</td>
                        <td style={{ textAlign: 'right', color: g.writeOff > 0 ? '#3a9d4f' : '#999' }}>
                          {currency.format(g.writeOff)}
                        </td>
                        {taxSavings !== null && (
                          <td style={{ textAlign: 'right' }}>{currency.format(Math.round(g.writeOff * rate) / 100)}</td>
                        )}
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={columns} style={{ background: '#fafafa', padding: '10px 10px 20px 30px' }}>
                            <TransactionsTable
                              transactions={g.transactions}
                              accounts={accounts}
                              statements={statements}
                              categories={categories}
                              onTransactionUpdated={() => {
                                setLoading(true);
                                setReloadKey((k) => k + 1);
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                <tr>
                  <td><strong>Total</strong></td>
                  <td style={{ textAlign: 'right' }}><strong>{transactions.length}</strong></td>
                  <td style={{ textAlign: 'right' }}><strong>{currency.format(totalSpent)}</strong></td>
                  <td></td>
                  <td style={{ textAlign: 'right', color: '#3a9d4f' }}><strong>{currency.format(totalWriteOff)}</strong></td>
                  {taxSavings !== null && (
                    <td style={{ textAlign: 'right' }}><strong>{currency.format(taxSavings)}</strong></td>
                  )}
                </tr>
              </tbody>
            </table>
          )}

          <p style={{ color: '#999', fontSize: '11px', marginTop: '15px' }}>
            An estimate from your categories&apos; write-off percentages, not tax advice. Check what&apos;s deductible
            with your accountant.
          </p>
        </>
      )}
    </div>
  );
}
