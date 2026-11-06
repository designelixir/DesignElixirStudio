'use client';

import { useState, useEffect, useMemo, useRef, KeyboardEvent } from 'react';
import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { fetchExpenseCategoriesAction } from '@/app/actions/expenseCategoryActions';
import { fetchAccountsAction } from '@/app/actions/accountActions';
import { fetchStatementsAction } from '@/app/actions/statementActions';
import {
  fetchFilteredTransactionsAction,
  fetchEarliestTransactionDateAction,
} from '@/app/actions/transactionActions';
import CategoryForm from './CategoryForm';
import CategoryFilters, {
  CategoryFilterState,
  defaultCategoryFilters,
  toTransactionFilters,
} from './CategoryFilters';
import { computeCategoryTotals, buildSpendSlices, UNCATEGORIZED_KEY } from './categoryTotals';
import SpendPieChart from './SpendPieChart';

import TransactionsTable from '../TransactionsTable';
import BooksHeader from '../BooksHeader';

const UNCATEGORIZED = UNCATEGORIZED_KEY;

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function ExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [years, setYears] = useState<number[]>([new Date().getFullYear()]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // null = closed, 'new' = adding, a category = editing it
  const [formFor, setFormFor] = useState<ExpenseCategory | 'new' | null>(null);

  // Transactions for the current filters (this year by default)
  const [filters, setFilters] = useState<CategoryFilterState>(defaultCategoryFilters);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTotals, setLoadingTotals] = useState(true);
  const latestRequest = useRef(0);
  // Bumped after a transaction is edited, to reload with the same filters
  const [reloadKey, setReloadKey] = useState(0);

  // Card clicked to show its transactions below the grid: a category id, UNCATEGORIZED, or null
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedSectionRef = useRef<HTMLDivElement>(null);

  const loadCategories = async () => {
    try {
      setCategories(await fetchExpenseCategoriesAction());
      setError('');
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  // Categories, accounts and the range of years to offer — once
  useEffect(() => {
    loadCategories();
    fetchAccountsAction()
      .then(setAccounts)
      .catch((err) => console.error('Error loading accounts:', err));
    fetchStatementsAction()
      .then(setStatements)
      .catch((err) => console.error('Error loading statements:', err));
    fetchEarliestTransactionDateAction()
      .then((earliest) => {
        const thisYear = new Date().getFullYear();
        const firstYear = earliest ? Math.min(new Date(earliest).getFullYear(), thisYear) : thisYear;
        const list: number[] = [];
        for (let y = thisYear; y >= firstYear; y--) list.push(y);
        setYears(list);
      })
      .catch((err) => console.error('Error loading years:', err));
  }, []);

  // Transactions — again whenever the filters change
  useEffect(() => {
    // Wait for both dates before loading a custom range
    if (filters.period === 'custom' && (!filters.customStart || !filters.customEnd)) return;
    const request = ++latestRequest.current;
    fetchFilteredTransactionsAction(toTransactionFilters(filters))
      .then((txns) => {
        // Ignore answers to older filter choices that arrive late
        if (request === latestRequest.current) setTransactions(txns);
      })
      .catch((err) => {
        console.error('Error loading transactions:', err);
        if (request === latestRequest.current) {
          setError(err instanceof Error ? err.message : 'Failed to load transactions');
        }
      })
      .finally(() => {
        if (request === latestRequest.current) setLoadingTotals(false);
      });
  }, [filters, reloadKey]);

  const handleFiltersChange = (next: CategoryFilterState) => {
    setLoadingTotals(true);
    setFilters(next);
  };

  const totals = useMemo(() => computeCategoryTotals(transactions, categories), [transactions, categories]);

  const pieSlices = useMemo(() => buildSpendSlices(categories, totals), [categories, totals]);

  // Transactions for the clicked card (same rules as the totals)
  const selectedCategory = categories.find((c) => c.id === selectedKey) ?? null;
  const selectedTransactions = useMemo(() => {
    if (!selectedKey) return [];
    if (selectedKey === UNCATEGORIZED) {
      const ids = new Set(categories.map((c) => c.id));
      return transactions.filter((t) => t.purchase && (!t.expense_category_id || !ids.has(t.expense_category_id)));
    }
    return transactions.filter((t) => t.expense_category_id === selectedKey);
  }, [selectedKey, transactions, categories]);

  const toggleSelected = (key: string) => setSelectedKey((current) => (current === key ? null : key));

  // Bring the table into view when a card is picked
  useEffect(() => {
    if (selectedKey) selectedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedKey]);

  // Props that make a card clickable (and keyboard-accessible)
  const selectableCard = (key: string) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-pressed': selectedKey === key,
    onClick: () => toggleSelected(key),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target !== e.currentTarget) return; // e.g. Enter on the Edit button
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSelected(key);
      }
    },
  });

  const handleSaved = () => {
    setFormFor(null);
    loadCategories();
  };

  const waitingForDates = filters.period === 'custom' && (!filters.customStart || !filters.customEnd);

  return (
    <div className='full-width basic-padding'>
      <BooksHeader
        title='Expense Categories'
        subtitle={
          <h6>
            {loading
              ? 'Loading...'
              : loadingTotals || waitingForDates
                ? `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`
                : `${currency.format(totals.totalSpent)} spent · ${currency.format(totals.totalWriteOff)} write-off` +
                  (totals.totalCredits > 0 ? ` · ${currency.format(totals.totalCredits)} credits` : '') +
                  ` · ${transactions.length} transaction${transactions.length === 1 ? '' : 's'}`}
          </h6>
        }
        actions={<button onClick={() => setFormFor('new')}>+ Add Category</button>}
      />

      <CategoryFilters value={filters} onChange={handleFiltersChange} accounts={accounts} years={years} />

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
      {waitingForDates && <p style={{ color: '#666' }}>Pick a start and end date to see totals.</p>}

      {!loading && !error && categories.length === 0 && (
        <p style={{ color: '#666' }}>No categories yet. Click “+ Add Category” to create one.</p>
      )}

      {categories.length > 0 && !waitingForDates && (
        <div
          className='card'
          style={{ background: 'white', marginBottom: '25px', opacity: loadingTotals ? 0.5 : 1, transition: 'opacity 0.2s' }}
        >
          <h3 style={{ margin: '0 0 10px' }}>Spending by category</h3>
          <SpendPieChart
            slices={pieSlices}
            total={totals.totalSpent}
            selectedKey={selectedKey}
            onSelect={toggleSelected}
          />
        </div>
      )}

      {categories.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '20px',
            opacity: loadingTotals ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {categories.map((category) => {
            const total = totals.byCategory.get(category.id);
            return (
              <div
                key={category.id}
                {...selectableCard(category.id)}
                className='card flex-start-start flex-column'
                style={{
                  background: 'white',
                  cursor: 'pointer',
                  borderTop: `6px solid ${category.color ?? '#ccc'}`,
                  outline: selectedKey === category.id ? '2px solid var(--navy)' : undefined,
                }}
              >
                <div className='flex-center-spacebetween full-width'>
                  <h3 style={{ margin: 0 }}>{category.title}</h3>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation(); // edit, don't select the card
                      setFormFor(category);
                    }}
                  >
                    Edit
                  </button>
                </div>
                {!waitingForDates && total && (
                  <>
                    {total.spent < 0 ? (
                      // Nets negative: money in (payments, cashback, refunds), not spending
                      <>
                        <h2 style={{ margin: '10px 0 0', color: '#3a9d4f' }}>+{currency.format(-total.spent)}</h2>
                        <h6 style={{ margin: '2px 0 5px' }}>
                          {total.count} transaction{total.count === 1 ? '' : 's'} · credits, not counted as spending
                        </h6>
                      </>
                    ) : (
                      <>
                        <h2 style={{ margin: '10px 0 0' }}>{currency.format(total.spent)}</h2>
                        <h6 style={{ margin: '2px 0 5px' }}>
                          {total.count} transaction{total.count === 1 ? '' : 's'} ·{' '}
                          {currency.format(total.writeOff)} write-off ({Number(category.percent_writeoff)}%)
                        </h6>
                      </>
                    )}
                  </>
                )}
                {(waitingForDates || !total) && (
                  <h6 style={{ margin: '5px 0' }}>{Number(category.percent_writeoff)}% write-off</h6>
                )}
                {category.description && (
                  <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>{category.description}</p>
                )}
              </div>
            );
          })}

          {!waitingForDates && totals.uncategorized.count > 0 && (
            <div
              {...selectableCard(UNCATEGORIZED)}
              className='card flex-start-start flex-column'
              style={{
                background: 'white',
                cursor: 'pointer',
                borderTop: '6px dashed #ccc',
                outline: selectedKey === UNCATEGORIZED ? '2px solid var(--navy)' : undefined,
              }}
            >
              <h3 style={{ margin: 0, color: '#666' }}>Uncategorized</h3>
              <h2 style={{ margin: '10px 0 0' }}>{currency.format(totals.uncategorized.spent)}</h2>
              <h6 style={{ margin: '2px 0 5px' }}>
                {totals.uncategorized.count} purchase{totals.uncategorized.count === 1 ? '' : 's'} with no category
              </h6>
            </div>
          )}
        </div>
      )}

      {selectedKey && !waitingForDates && (selectedCategory || selectedKey === UNCATEGORIZED) && (
        <div ref={selectedSectionRef} style={{ marginTop: '30px', scrollMarginTop: '20px' }}>
          <div className='flex-center-spacebetween' style={{ marginBottom: '10px' }}>
            <div className='flex-center-start' style={{ gap: '10px' }}>
              <span
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: selectedCategory?.color ?? '#ccc',
                  flex: 'none',
                }}
              />
              <h2 style={{ margin: 0 }}>{selectedCategory?.title ?? 'Uncategorized'}</h2>
              <h6 style={{ margin: 0 }}>
                {selectedTransactions.length} transaction{selectedTransactions.length === 1 ? '' : 's'}
              </h6>
            </div>
            <button type='button' onClick={() => setSelectedKey(null)}>Close</button>
          </div>
          <TransactionsTable
            transactions={selectedTransactions}
            accounts={accounts}
            statements={statements}
            categories={categories}
            loading={loadingTotals}
            emptyMessage='No transactions in this category for these filters.'
            onTransactionUpdated={() => {
              setLoadingTotals(true);
              setReloadKey((k) => k + 1);
            }}
          />
        </div>
      )}

      {formFor && (
        <CategoryForm
          category={formFor === 'new' ? undefined : formFor}
          onSaved={handleSaved}
          onClose={() => setFormFor(null)}
        />
      )}
    </div>
  );
}
