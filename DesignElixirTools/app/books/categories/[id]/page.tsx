'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { fetchExpenseCategoriesAction } from '@/app/actions/expenseCategoryActions';
import { fetchAccountsAction } from '@/app/actions/accountActions';
import { fetchStatementsAction } from '@/app/actions/statementActions';
import { fetchFilteredTransactionsAction } from '@/app/actions/transactionActions';
import BooksHeader, { BOOKS_CRUMB } from '../../BooksHeader';
import TransactionsBrowser from '../../TransactionsBrowser';
import CategoryForm from '../CategoryForm';
import { computeCategoryTotals } from '../categoryTotals';
import { parentCategoryLabel } from '../parentCategories';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// One expense category: its details and every transaction in it (all time)
export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  // Loads everything; state is set in the promise callbacks so the first load
  // can run straight from the effect
  const loadData = useCallback(
    () =>
      Promise.all([
        fetchExpenseCategoriesAction(),
        fetchAccountsAction(),
        fetchStatementsAction(),
        fetchFilteredTransactionsAction({ categoryId: id }),
      ])
        .then(([cats, accts, stmts, txns]) => {
          setCategories(cats);
          setAccounts(accts);
          setStatements(stmts);
          setTransactions(txns);
          setError('');
        })
        .catch((err) => {
          console.error('Error loading category:', err);
          setError(err instanceof Error ? err.message : 'Failed to load category');
        })
        .finally(() => setLoading(false)),
    [id]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const category = categories.find((c) => c.id === id) ?? null;
  const total = useMemo(
    () => (category ? computeCategoryTotals(transactions, [category]).byCategory.get(category.id) : undefined),
    [transactions, category]
  );
  const parent = parentCategoryLabel(category?.parent_category);

  if (!loading && !error && !category) {
    return (
      <div className='full-width basic-padding'>
        <BooksHeader crumbs={[BOOKS_CRUMB, { label: 'Categories', href: '/books/categories' }]} title='Not found' />
        <p style={{ color: '#666' }}>This category doesn’t exist (it may have been deleted).</p>
      </div>
    );
  }

  return (
    <div className='full-width basic-padding'>
      <BooksHeader
        crumbs={[BOOKS_CRUMB, { label: 'Categories', href: '/books/categories' }]}
        title={
          <>
            {category && (
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: category.color ?? '#ccc',
                  marginRight: '8px',
                  verticalAlign: 'middle',
                }}
              />
            )}
            {category?.title ?? 'Loading...'}
          </>
        }
        subtitle={
          category && (
            <>
              <h6>
                {[
                  parent ?? 'No parent category',
                  `${Number(category.percent_writeoff)}% write-off`,
                  total &&
                    (total.spent < 0
                      ? `+${currency.format(-total.spent)} credits`
                      : `${currency.format(total.spent)} spent · ${currency.format(total.writeOff)} write-off`),
                  `${transactions.length} transaction${transactions.length === 1 ? '' : 's'} (all time)`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </h6>
              {category.description && <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>{category.description}</p>}
            </>
          )
        }
        actions={category && <button type='button' onClick={() => setEditing(true)}>Edit Category</button>}
      />

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

      {!error && (
        <TransactionsBrowser
          transactions={transactions}
          accounts={accounts}
          statements={statements}
          categories={categories}
          loading={loading}
          emptyMessage='No transactions in this category yet.'
          onTransactionUpdated={loadData}
        />
      )}

      {editing && category && (
        <CategoryForm
          category={category}
          onSaved={() => {
            setEditing(false);
            loadData();
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
