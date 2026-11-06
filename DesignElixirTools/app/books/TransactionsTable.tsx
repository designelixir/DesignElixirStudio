'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { fetchCompaniesAction } from '@/app/actions/transactionActions';
import TransactionFormRow from './TransactionFormRow';
import CategoryForm from './categories/CategoryForm';
import MiniCreditCard from './MiniCreditCard';

interface TransactionsTableProps {
  transactions: Transaction[];
  accounts?: Account[];
  statements?: Statement[];
  categories?: ExpenseCategory[];
  loading?: boolean;
  emptyMessage?: string;
  topRow?: React.ReactNode;
  // Pass to show an Edit (pencil) button on each row; called after a row is saved or deleted
  onTransactionUpdated?: () => void;
  // Pass to show a row for adding a transaction at the top (needs `accounts`;
  // `statements` fill its Statement dropdown). Called after one is added.
  onTransactionCreated?: () => void;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const COMPANIES_LIST_ID = 'transaction-companies';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TransactionsTable({
  transactions,
  accounts,
  statements,
  categories,
  loading = false,
  emptyMessage = 'No transactions yet.',
  topRow,
  onTransactionUpdated,
  onTransactionCreated,
}: TransactionsTableProps) {
  const editable = !!onTransactionUpdated;
  const canAdd = !!onTransactionCreated && !!accounts;
  const showAccount = !!accounts;
  const showStatement = !!statements;
  const hasButtonColumn = !!topRow || editable || canAdd;
  const showAccountColumn = showAccount || showStatement;
  const columnCount = 5 + (showAccountColumn ? 1 : 0) + (hasButtonColumn ? 1 : 0);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Categories added from an edit row, until the page reloads its own list
  const [addedCategories, setAddedCategories] = useState<ExpenseCategory[]>([]);
  const allCategories = useMemo(() => {
    const byId = new Map<string, ExpenseCategory>();
    for (const c of [...(categories ?? []), ...addedCategories]) byId.set(c.id, c);
    return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [categories, addedCategories]);

  const [newCategory, setNewCategory] = useState<{
    title: string;
    select: (categoryId: string) => void;
  } | null>(null);

  // Company suggestions for the add / edit rows (reloaded after a save, to pick up new names)
  const [companies, setCompanies] = useState<string[]>([]);
  const [companiesVersion, setCompaniesVersion] = useState(0);
  useEffect(() => {
    if (!editable && !canAdd) return;
    fetchCompaniesAction()
      .then(setCompanies)
      .catch((err) => console.error('Error loading companies:', err));
  }, [editable, canAdd, companiesVersion]);

  const accountById = (id: string) => accounts?.find((a) => a.id === id) ?? null;
  const statement = (id: string | null) => (id ? statements?.find((s) => s.id === id) : undefined);

  // Account column: the account's mini card, plus an icon linking to the statement
  const accountAndStatementCells = (t: Transaction) => {
    if (!showAccountColumn) return null;
    const s = statement(t.statement_id);
    return (
      <td>
        <div className='flex-center-start' style={{ gap: '8px', flexWrap: 'nowrap' }}>
          {showAccount && (
            <div style={{ marginBottom: '-10px' }}>
              <MiniCreditCard accountId={t.account_id} account={accountById(t.account_id)} />
            </div>
          )}
          {s && (
            <Link
              href={`/books/statements/${s.id}`}
              title={`Statement: ${s.name || s.file_name}`}
              aria-label={`Open statement ${s.name || s.file_name}`}
              style={{ flex: 'none', lineHeight: 0 }}
            >
              <Image src='/invoice.svg' alt='statement icon' width={20} height={20} />
            </Link>
          )}
        </div>
      </td>
    );
  };

  const categoryCell = (t: Transaction) => {
    const c = t.expense_category_id ? allCategories.find((x) => x.id === t.expense_category_id) : undefined;
    if (c) {
      return (
        <div className='category-tag flex-center-start no-flex-grow' style={{ gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color ?? '#ccc', flex: 'none' }} />
          <p>{c.title}</p>
        </div>
      );
    }
    // Not linked to one of your categories: show the bank's category, greyed out
    return t.expense_category ? <span style={{ color: '#999' }}>{t.expense_category}</span> : '—';
  };

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            {showAccountColumn && <th>Account</th>}
            <th>Transaction</th>
            <th>Expense Category</th>
            <th>Work</th>
            <th style={{ textAlign: 'right' }}>Cost</th>
            {hasButtonColumn && <th></th>}
          </tr>
        </thead>
        <tbody>
          {topRow}
          {canAdd && (
            <TransactionFormRow
              mode='add'
              accounts={accounts!}
              statements={statements ?? []}
              columnCount={columnCount}
              categories={allCategories}
              companiesListId={COMPANIES_LIST_ID}
              onAddCategory={(title, select) => setNewCategory({ title, select })}
              onSaved={() => {
                setCompaniesVersion((v) => v + 1);
                onTransactionCreated?.();
              }}
            />
          )}
          {loading && (
            <tr><td colSpan={columnCount} style={{ color: '#666' }}>Loading...</td></tr>
          )}
          {!loading && transactions.length === 0 && (
            <tr><td colSpan={columnCount} style={{ color: '#666' }}>{emptyMessage}</td></tr>
          )}
          {transactions.map((t) =>
            editable && editingId === t.id ? (
              <TransactionFormRow
                key={t.id}
                mode='edit'
                transaction={t}
                readOnlyCells={accountAndStatementCells(t)}
                columnCount={columnCount}
                categories={allCategories}
                companiesListId={COMPANIES_LIST_ID}
                onAddCategory={(title, select) => setNewCategory({ title, select })}
                onSaved={() => {
                  setEditingId(null);
                  setCompaniesVersion((v) => v + 1);
                  onTransactionUpdated?.();
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <tr key={t.id} className={t.purchase ? 'purchase' : 'payment'}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(t.date)}</td>
                {accountAndStatementCells(t)}
                <td>
                  {/* Company, then your description, then the bank's descriptor */}
                  <strong>{t.company || '—'}</strong>
                  {t.description && (
                    <>
                      <br />
                      <span>{t.description}</span>
                    </>
                  )}
                  {t.statement_descriptor && (
                    <>
                      <br />
                      <span style={{ color: '#888', fontSize: '11px' }}>{t.statement_descriptor}</span>
                    </>
                  )}
                </td>
                <td className='flex-center-start no-flex-grow'>{categoryCell(t)}</td>
                <td>{t.work_expense ? '✓' : ''}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{t.purchase ? "-" : "+"}{currency.format(Number(t.cost))}</td>
                {hasButtonColumn && (
                  <td>
                    {editable && (
                      <button
                        type='button'
                        className='icon-button'
                        title='Edit transaction'
                        aria-label='Edit transaction'
                        onClick={() => setEditingId(t.id)}
                      >
                        <Image src='/pencil.svg' alt='edit icon' width={18} height={18} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )
          )}
        </tbody>
      </table>

      {(editable || canAdd) && (
        <datalist id={COMPANIES_LIST_ID}>
          {companies.map((name) => <option key={name} value={name} />)}
        </datalist>
      )}

      {newCategory && (
        <CategoryForm
          initialTitle={newCategory.title}
          onSaved={(category) => {
            setAddedCategories((prev) => [...prev, category]);
            newCategory.select(category.id);
            setNewCategory(null);
          }}
          onClose={() => setNewCategory(null)}
        />
      )}
    </>
  );
}
