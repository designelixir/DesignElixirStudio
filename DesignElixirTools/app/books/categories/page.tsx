'use client';

import { useState, useEffect, useMemo, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Account, ExpenseCategory, ParentCategory, Statement, Transaction } from '@/types/globalTypes';
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
import {
  computeCategoryTotals,
  computeParentTotals,
  buildParentSlices,
  UNCATEGORIZED_KEY,
  NO_PARENT_KEY,
} from './categoryTotals';
import { PARENT_CATEGORIES } from './parentCategories';
import SpendPieChart from './SpendPieChart';
import TagsView from './TagsView';
import Tabs from '@/app/components/Tabs';

import TransactionsBrowser from '../TransactionsBrowser';
import BooksHeader from '../BooksHeader';

const UNCATEGORIZED = UNCATEGORIZED_KEY;

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function ExpenseCategories() {
  const router = useRouter();
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

  // Parent picked in the pie chart, to show only its categories: a ParentCategory, NO_PARENT_KEY, or null
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  // Parent to pre-pick when adding a category
  const [newCategoryParent, setNewCategoryParent] = useState<ParentCategory | null>(null);

  // Uncategorized card clicked to show its transactions below the grid (categories open their own page)
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
  const parentTotals = useMemo(() => computeParentTotals(categories, totals), [categories, totals]);

  // The eight parents, plus "No parent" while some categories haven't been given one
  const parents = useMemo(() => {
    const list: { key: string; label: string; color: string }[] = PARENT_CATEGORIES.map((p) => ({
      key: p.value,
      label: p.label,
      color: p.color,
    }));
    if (categories.some((c) => !c.parent_category)) list.push({ key: NO_PARENT_KEY, label: 'No parent', color: '#bbbbbb' });
    return list;
  }, [categories]);
  const selectedParentInfo = parents.find((p) => p.key === selectedParent) ?? null;

  // Category cards shown: all, or just the parent picked in the pie
  const visibleCategories = useMemo(
    () => (selectedParent ? categories.filter((c) => (c.parent_category ?? NO_PARENT_KEY) === selectedParent) : categories),
    [selectedParent, categories]
  );

  // Pie: spending by parent category
  const pieSlices = useMemo(() => buildParentSlices(parents, parentTotals, totals), [parents, parentTotals, totals]);

  // Uncategorized purchases, for its table (same rule as the totals)
  const selectedTransactions = useMemo(() => {
    if (selectedKey !== UNCATEGORIZED) return [];
    const ids = new Set(categories.map((c) => c.id));
    return transactions.filter((t) => t.purchase && (!t.expense_category_id || !ids.has(t.expense_category_id)));
  }, [selectedKey, transactions, categories]);

  const toggleSelected = (key: string) => setSelectedKey((current) => (current === key ? null : key));

  // Picking a parent (or Uncategorized) closes the Uncategorized table
  const toggleParent = (key: string) => {
    setSelectedKey(null);
    setSelectedParent((current) => (current === key ? null : key));
  };
  const toggleUncategorized = () => {
    setSelectedParent(null);
    toggleSelected(UNCATEGORIZED);
  };

  // Bring the table into view when Uncategorized is picked
  useEffect(() => {
    if (selectedKey) selectedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedKey]);

  // Props that make a card clickable (and keyboard-accessible)
  const selectableCard = (selected: boolean, onSelect: () => void) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-pressed': selected,
    onClick: onSelect,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target !== e.currentTarget) return; // e.g. Enter on the Edit button
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();
      }
    },
  });

  // Props that make a category card open its page (and keyboard-accessible)
  const openCategory = (id: string) => router.push(`/books/categories/${id}`);
  const linkCard = (id: string) => ({
    role: 'link' as const,
    tabIndex: 0,
    onClick: () => openCategory(id),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target !== e.currentTarget) return; // e.g. Enter on the Edit button
      if (e.key === 'Enter') {
        e.preventDefault();
        openCategory(id);
      }
    },
  });

  const handleSaved = () => {
    setFormFor(null);
    loadCategories();
  };

  const openNewCategory = (parent: ParentCategory | null) => {
    setNewCategoryParent(parent);
    setFormFor('new');
  };

  const waitingForDates = filters.period === 'custom' && (!filters.customStart || !filters.customEnd);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '20px',
    opacity: loadingTotals ? 0.5 : 1,
    transition: 'opacity 0.2s',
  } as const;

  const categoriesTab = (
    <>
      {!loading && !error && categories.length === 0 && (
        <p style={{ color: '#666' }}>No categories yet. Click “+ Add Category” to create one.</p>
      )}

      {categories.length > 0 && !waitingForDates && (
        <div
          className='card'
          style={{ background: 'white', marginBottom: '25px', opacity: loadingTotals ? 0.5 : 1, transition: 'opacity 0.2s' }}
        >
          <h3 style={{ margin: '0 0 10px' }}>Spending by parent category</h3>
          {pieSlices.length > 0 ? (
            <SpendPieChart
              slices={pieSlices}
              total={totals.totalSpent}
              selectedKey={selectedParent ?? (selectedKey === UNCATEGORIZED ? UNCATEGORIZED : null)}
              onSelect={(key) => (key === UNCATEGORIZED ? toggleUncategorized() : toggleParent(key))}
            />
          ) : (
            <p style={{ color: '#666', margin: 0 }}>No spending for these filters.</p>
          )}
        </div>
      )}

      {selectedParentInfo && (
        <div className='flex-center-start' style={{ gap: '10px', marginBottom: '15px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: selectedParentInfo.color, flex: 'none' }} />
          <strong>
            Showing {selectedParentInfo.label} ({plural(visibleCategories.length, 'category', 'categories')})
          </strong>
          <button type='button' onClick={() => setSelectedParent(null)}>Show all</button>
        </div>
      )}

      {categories.length > 0 && (
        <div style={grid}>
          {visibleCategories.map((category) => {
            const total = totals.byCategory.get(category.id);
            const parent = parents.find((p) => p.key === (category.parent_category ?? NO_PARENT_KEY));
            return (
              <div
                key={category.id}
                {...linkCard(category.id)}
                title={`Open ${category.title}`}
                className='card flex-start-start flex-column'
                style={{
                  background: 'white',
                  cursor: 'pointer',
                  borderTop: `6px solid ${category.color ?? '#ccc'}`,
                }}
              >
                <div className='flex-center-spacebetween full-width'>
                  <h3 style={{ margin: 0 }}>{category.title}</h3>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation(); // edit, don't open the page
                      setFormFor(category);
                    }}
                  >
                    Edit
                  </button>
                </div>
                {category.parent_category && parent && (
                  <span className='flex-center-start no-flex-grow' style={{ gap: '5px', fontSize: '11px', color: '#666', marginTop: '3px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: parent.color, flex: 'none' }} />
                    {parent.label}
                  </span>
                )}
                {!waitingForDates && total && (
                  <>
                    {total.spent < 0 ? (
                      // Nets negative: money in (payments, cashback, refunds), not spending
                      <>
                        <h2 style={{ margin: '10px 0 0', color: '#3a9d4f' }}>+{currency.format(-total.spent)}</h2>
                        <h6 style={{ margin: '2px 0 5px' }}>
                          {plural(total.count, 'transaction', 'transactions')} · credits, not counted as spending
                        </h6>
                      </>
                    ) : (
                      <>
                        <h2 style={{ margin: '10px 0 0' }}>{currency.format(total.spent)}</h2>
                        <h6 style={{ margin: '2px 0 5px' }}>
                          {plural(total.count, 'transaction', 'transactions')} ·{' '}
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

          {!selectedParent && !waitingForDates && totals.uncategorized.count > 0 && (
            <div
              {...selectableCard(selectedKey === UNCATEGORIZED, toggleUncategorized)}
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
                {plural(totals.uncategorized.count, 'purchase', 'purchases')} with no category
              </h6>
            </div>
          )}
        </div>
      )}

      {selectedKey === UNCATEGORIZED && !waitingForDates && (
        <div ref={selectedSectionRef} style={{ marginTop: '30px', scrollMarginTop: '20px' }}>
          <div className='flex-center-spacebetween' style={{ marginBottom: '10px' }}>
            <div className='flex-center-start' style={{ gap: '10px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#ccc', flex: 'none' }} />
              <h2 style={{ margin: 0 }}>Uncategorized</h2>
              <h6 style={{ margin: 0 }}>{plural(selectedTransactions.length, 'transaction', 'transactions')}</h6>
            </div>
            <button type='button' onClick={() => setSelectedKey(null)}>Close</button>
          </div>
          <TransactionsBrowser
            transactions={selectedTransactions}
            accounts={accounts}
            statements={statements}
            categories={categories}
            loading={loadingTotals}
            emptyMessage='No uncategorized transactions for these filters.'
            onTransactionUpdated={() => {
              setLoadingTotals(true);
              setReloadKey((k) => k + 1);
            }}
          />
        </div>
      )}
    </>
  );

  return (
    <div className='full-width basic-padding'>
      <BooksHeader
        title='Categories & Tags'
        subtitle={
          <h6>
            {loading
              ? 'Loading...'
              : loadingTotals || waitingForDates
                ? plural(categories.length, 'category', 'categories')
                : `${currency.format(totals.totalSpent)} spent · ${currency.format(totals.totalWriteOff)} write-off` +
                  (totals.totalCredits > 0 ? ` · ${currency.format(totals.totalCredits)} credits` : '') +
                  ` · ${plural(transactions.length, 'transaction', 'transactions')}`}
          </h6>
        }
        actions={
          <button
            onClick={() =>
              openNewCategory(selectedParent && selectedParent !== NO_PARENT_KEY ? (selectedParent as ParentCategory) : null)
            }
          >
            + Add Category
          </button>
        }
      />

      <CategoryFilters value={filters} onChange={handleFiltersChange} accounts={accounts} years={years} />

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
      {waitingForDates && <p style={{ color: '#666' }}>Pick a start and end date to see totals.</p>}

      <Tabs
        tabs={[
          { name: 'Categories', content: categoriesTab },
          {
            name: 'Tags',
            content: waitingForDates ? null : (
              <TagsView
                transactions={transactions}
                accounts={accounts}
                statements={statements}
                categories={categories}
                loading={loadingTotals}
                onTransactionUpdated={() => {
                  setLoadingTotals(true);
                  setReloadKey((k) => k + 1);
                }}
              />
            ),
          },
        ]}
      />

      {formFor && (
        <CategoryForm
          category={formFor === 'new' ? undefined : formFor}
          initialParent={formFor === 'new' ? newCategoryParent : undefined}
          onSaved={handleSaved}
          onClose={() => setFormFor(null)}
        />
      )}
    </div>
  );
}
