'use client';

import { useMemo, useState, useEffect } from 'react';
import { ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { updateStatementAction } from '@/app/actions/statementActions';
import { fetchCompaniesAction } from '@/app/actions/transactionActions';
import { fetchExpenseCategoriesAction } from '@/app/actions/expenseCategoryActions';
import CategoryForm from '../../categories/CategoryForm';
import { ParsedTransaction } from './parserUtils';
import ParsedTransactionRow from './ParsedTransactionRow';

interface ParsedTransactionsPreviewProps {
  statement: Statement;
  transactions: ParsedTransaction[];
  existingTransactions: Transaction[]; // already saved for this statement
  onImported?: () => void;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Local YYYY-MM-DD of a stored timestamp
function localDay(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Matches on date + amount + direction (not descriptor, since you may edit it
// before adding). Each saved transaction can only match one parsed line, so two
// identical purchases on the same day are handled correctly.
function findAlreadyAdded(parsed: ParsedTransaction[], existing: Transaction[]): boolean[] {
  const remaining = new Map<string, number>();
  for (const t of existing) {
    const key = `${localDay(t.date)}|${Number(t.cost).toFixed(2)}|${t.purchase}`;
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  return parsed.map((p) => {
    const key = `${p.date}|${Math.abs(p.amount).toFixed(2)}|${p.amount > 0}`;
    const count = remaining.get(key) ?? 0;
    if (count === 0) return false;
    remaining.set(key, count - 1);
    return true;
  });
}

// Shared by every parser: each parsed line becomes an editable row with a + button.
export default function ParsedTransactionsPreview({
  statement,
  transactions,
  existingTransactions,
  onImported,
}: ParsedTransactionsPreviewProps) {
  const alreadyAdded = useMemo(
    () => findAlreadyAdded(transactions, existingTransactions),
    [transactions, existingTransactions]
  );
  const addedCount = alreadyAdded.filter(Boolean).length;

  // Company suggestions: every company already saved, plus anything typed in
  // another row here (so "Amazon" typed once is offered on the next Amazon line)
  const [savedCompanies, setSavedCompanies] = useState<string[]>([]);
  const [rowCompanies, setRowCompanies] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchCompaniesAction()
      .then(setSavedCompanies)
      .catch((err) => console.error('Error loading companies:', err));
  }, []);

  const companyOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const name of [...savedCompanies, ...Object.values(rowCompanies)]) {
      const trimmed = name.trim();
      if (trimmed && !byKey.has(trimmed.toLowerCase())) byKey.set(trimmed.toLowerCase(), trimmed);
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b));
  }, [savedCompanies, rowCompanies]);

  const handleCompanyChange = (rowIndex: number, company: string) =>
    setRowCompanies((prev) => ({ ...prev, [rowIndex]: company }));

  // Your expense categories, for the searchable category field.
  // Rows wait for these so they can pre-select a category matching the bank's.
  const [categories, setCategories] = useState<ExpenseCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = useState('');

  useEffect(() => {
    fetchExpenseCategoriesAction()
      .then(setCategories)
      .catch((err) => {
        console.error('Error loading categories:', err);
        setCategoriesError(err instanceof Error ? err.message : 'Could not load categories');
        setCategories([]);
      });
  }, []);

  // Add-category popup. `select` (when opened from a row) picks the new category in that row.
  const [newCategory, setNewCategory] = useState<{
    title: string;
    select?: (categoryId: string) => void;
  } | null>(null);

  const handleCategorySaved = (category: ExpenseCategory) => {
    setCategories((prev) =>
      [...(prev ?? []), category].sort((a, b) => a.title.localeCompare(b.title))
    );
    newCategory?.select?.(category.id);
    setNewCategory(null);
  };
  const purchasesTotal = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const creditsTotal = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);

  const handleAdded = async () => {
    if (statement.status !== 'imported') {
      try {
        await updateStatementAction(statement.id, { status: 'imported' });
      } catch (err) {
        console.error('Error updating statement status:', err);
      }
    }
    onImported?.();
  };

  if (!categories) {
    return <p style={{ color: '#666' }}>Loading categories...</p>;
  }

  if (transactions.length === 0) {
    return <p style={{ color: '#666' }}>No transactions found in this PDF.</p>;
  }

  return (
    <div className='full-width'>
      <div className='flex-center-spacebetween full-width'>
        <p style={{ margin: '10px 0' }}>
          Found <strong>{transactions.length}</strong> transactions · {addedCount} added ·
          purchases {currency.format(purchasesTotal)} · payments/credits {currency.format(creditsTotal)}
        </p>
        <button type='button' onClick={() => setNewCategory({ title: '' })}>+ Add Category</button>
      </div>

      {categoriesError && <div style={{ color: 'red', margin: '10px 0' }}>{categoriesError}</div>}

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Statement Descriptor</th>
            <th>Company</th>
            <th>Description</th>
            <th>Expense Category</th>
            <th>Type</th>
            <th>Work Expense</th>
            <th style={{ textAlign: 'right' }}>Cost</th>
            <th>Add</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <ParsedTransactionRow
              key={i}
              rowIndex={i}
              statement={statement}
              parsed={t}
              alreadyAdded={alreadyAdded[i]}
              companyOptions={companyOptions}
              onCompanyChange={handleCompanyChange}
              categories={categories}
              onAddCategory={(title, select) => setNewCategory({ title, select })}
              onAdded={handleAdded}
            />
          ))}
        </tbody>
      </table>

      {newCategory && (
        <CategoryForm
          initialTitle={newCategory.title}
          onSaved={handleCategorySaved}
          onClose={() => setNewCategory(null)}
        />
      )}
    </div>
  );
}
