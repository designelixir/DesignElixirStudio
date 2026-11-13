'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { updateStatementAction } from '@/app/actions/statementActions';
import {
  fetchCompaniesAction,
  fetchDescriptorHistoryAction,
  fetchTagsAction,
  DescriptorHistoryRow,
} from '@/app/actions/transactionActions';
import { fetchExpenseCategoriesAction } from '@/app/actions/expenseCategoryActions';
import CategoryForm from '../../categories/CategoryForm';
import { ParsedTransaction } from './parserUtils';
import ParsedTransactionRow from './ParsedTransactionRow';
import { buildDescriptorMatcher, buildCompanyMatcher, buildPhraseMatcher } from './descriptorMatch';
import { fetchStatementCompaniesAction } from '@/app/actions/statementCompanyActions';
import { StatementCompany } from '@/types/globalTypes';
import { applyPredictionRules } from './predictionRules';

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
// identical purchases on the same day are handled correctly. Returns the saved
// transaction for each line that's already been added, else null.
function findAlreadyAdded(parsed: ParsedTransaction[], existing: Transaction[]): (Transaction | null)[] {
  const remaining = new Map<string, Transaction[]>();
  for (const t of existing) {
    const key = `${localDay(t.date)}|${Number(t.cost).toFixed(2)}|${t.purchase}`;
    remaining.set(key, [...(remaining.get(key) ?? []), t]);
  }
  return parsed.map((p) => {
    const key = `${p.date}|${Math.abs(p.amount).toFixed(2)}|${p.amount > 0}`;
    return remaining.get(key)?.shift() ?? null;
  });
}

const TAGS_LIST_ID = 'parsed-transaction-tags';

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

  // Tag suggestions: every tag already used
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  useEffect(() => {
    fetchTagsAction()
      .then(setTagOptions)
      .catch((err) => console.error('Error loading tags:', err));
  }, []);

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

  // Past transactions, to fill company / category on lines that look like ones
  // you've logged before. Rows wait for this (an error just means no suggestions).
  const [history, setHistory] = useState<DescriptorHistoryRow[] | null>(null);
  useEffect(() => {
    fetchDescriptorHistoryAction()
      .then(setHistory)
      .catch((err) => {
        console.error('Error loading past transactions:', err);
        setHistory([]);
      });
  }, []);

  // Your companies and the descriptors linked to them (/books/identifiers)
  const [companies, setCompanies] = useState<StatementCompany[] | null>(null);
  useEffect(() => {
    fetchStatementCompaniesAction()
      .then(setCompanies)
      .catch((err) => {
        console.error('Error loading companies:', err);
        setCompanies([]);
      });
  }, []);

  const suggestions = useMemo(() => {
    if (!history || !categories || !companies) return null;
    const findCompany = buildCompanyMatcher(companies);
    const findPhrase = buildPhraseMatcher(companies);
    const validCategory = (id: string | null) => (id && categories.some((c) => c.id === id) ? id : null);
    const match = buildDescriptorMatcher(history, new Set(categories.map((c) => c.id)));
    const categoryByTitle = (title: string) =>
      categories.find((c) => c.title.trim().toLowerCase() === title.trim().toLowerCase())?.id ?? null;
    return transactions.map((t) => {
      const descriptor = t.details ? `${t.descriptor} ${t.details}` : t.descriptor;
      // Fixed rules win, then a company phrase the descriptor contains (and that
      // phrase's defaults), then the company this descriptor is linked to (and its
      // defaults), then whatever was used on a similar past transaction
      const phraseHit = findPhrase(descriptor);
      const phrase = phraseHit?.phrase ?? null;
      const linked = phraseHit?.company ?? findCompany(descriptor);
      const past = match(descriptor);
      // Payments-section lines (not refunds, which are listed with purchases)
      const isPayment = t.amount < 0 && t.category === 'Payments and Credits';
      const rules = applyPredictionRules(descriptor, linked?.name ?? past?.company ?? null, isPayment);
      const company = linked?.name ?? past?.company ?? rules.company ?? null;
      const categoryId =
        (rules.categoryTitle && categoryByTitle(rules.categoryTitle)) ||
        validCategory(phrase?.default_category_id ?? null) ||
        validCategory(linked?.default_category_id ?? null) ||
        past?.categoryId ||
        null;
      const workExpense =
        rules.workExpense ?? phrase?.default_work_expense ?? linked?.default_work_expense ?? past?.workExpense ?? null;
      return company || categoryId || workExpense !== null ? { company, categoryId, workExpense } : null;
    });
  }, [history, categories, companies, transactions]);

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

  // "Add all": rows that have a company and category, and each row's save()
  const [readyRows, setReadyRows] = useState<Set<number>>(new Set());
  const rowSaves = useRef(new Map<number, () => Promise<boolean>>());
  const [addingAll, setAddingAll] = useState<{ done: number; total: number } | null>(null);
  const [addAllMessage, setAddAllMessage] = useState('');

  const handleReadyChange = useCallback((rowIndex: number, ready: boolean) => {
    setReadyRows((prev) => {
      if (prev.has(rowIndex) === ready) return prev;
      const next = new Set(prev);
      if (ready) next.add(rowIndex);
      else next.delete(rowIndex);
      return next;
    });
  }, []);
  const registerSave = useCallback((rowIndex: number, save: (() => Promise<boolean>) | null) => {
    if (save) rowSaves.current.set(rowIndex, save);
    else rowSaves.current.delete(rowIndex);
  }, []);

  // Saves ready rows one at a time (in statement order), then reloads once
  const handleAddAll = async () => {
    const rows = [...readyRows].sort((a, b) => a - b);
    if (rows.length === 0) return;
    setAddAllMessage('');
    setAddingAll({ done: 0, total: rows.length });
    let saved = 0;
    for (const i of rows) {
      const save = rowSaves.current.get(i);
      if (save && (await save())) saved += 1;
      setAddingAll({ done: rows.indexOf(i) + 1, total: rows.length });
    }
    setAddingAll(null);
    setAddAllMessage(
      saved === rows.length
        ? `Added ${saved} transaction${saved === 1 ? '' : 's'}.`
        : `Added ${saved} of ${rows.length}; the rest show an error on their row.`
    );
    if (saved > 0) await handleAdded();
  };

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

  if (!categories || !suggestions) {
    return <p style={{ color: '#666' }}>Loading categories and past transactions...</p>;
  }
  const matchedCount = suggestions.filter((s, i) => s && !alreadyAdded[i]).length;

  if (transactions.length === 0) {
    return <p style={{ color: '#666' }}>No transactions found in this PDF.</p>;
  }

  return (
    <div className='full-width'>
      <div className='flex-center-spacebetween full-width'>
        <p style={{ margin: '10px 0' }}>
          Found <strong>{transactions.length}</strong> transactions · {addedCount} already saved ·{' '}
          <strong>{transactions.length - addedCount}</strong> to add ·
          purchases {currency.format(purchasesTotal)} · payments/credits {currency.format(creditsTotal)}
          {matchedCount > 0 && <> · {matchedCount} filled in automatically</>}
        </p>
        <button type='button' onClick={() => setNewCategory({ title: '' })}>+ Add Category</button>
      </div>

      {categoriesError && <div style={{ color: 'red', margin: '10px 0' }}>{categoriesError}</div>}

      {addedCount === transactions.length && (
        <p style={{ color: 'green' }}>✓ Every transaction in this PDF has been added.</p>
      )}

      {addedCount < transactions.length && <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Statement Descriptor</th>
            <th>Company</th>
            <th>Description</th>
            <th>Expense Category</th>
            <th>Tags</th>
            <th>Type</th>
            <th>Work Expense</th>
            <th style={{ textAlign: 'right' }}>Cost</th>
            <th>Add</th>
          </tr>
        </thead>
        <tbody>
          {/* Only lines not saved yet; saved ones are in the Transactions table above */}
          {transactions.map((t, i) => alreadyAdded[i] ? null : (
            <ParsedTransactionRow
              key={i}
              rowIndex={i}
              statement={statement}
              parsed={t}
              suggestion={suggestions[i]}
              alreadyAdded={alreadyAdded[i]}
              tagsListId={TAGS_LIST_ID}
              companyOptions={companyOptions}
              onCompanyChange={handleCompanyChange}
              categories={categories}
              onAddCategory={(title, select) => setNewCategory({ title, select })}
              onAdded={handleAdded}
              onReadyChange={handleReadyChange}
              registerSave={registerSave}
            />
          ))}
        </tbody>
      </table>}
      {addedCount < transactions.length && (
        <div className='flex-center-start flex-wrap' style={{ gap: '10px', margin: '15px 0' }}>
          <button type='button' onClick={handleAddAll} disabled={!!addingAll || readyRows.size === 0}>
            {addingAll ? `Adding ${addingAll.done} of ${addingAll.total}…` : `Add all (${readyRows.size})`}
          </button>
          <span style={{ color: '#666', fontSize: '12px' }}>
            Adds every line above that has a company and an expense category
            {transactions.length - addedCount - readyRows.size > 0 &&
              ` · ${transactions.length - addedCount - readyRows.size} still need one or both`}
          </span>
          {addAllMessage && <span style={{ color: '#3a9d4f', fontSize: '13px' }}>{addAllMessage}</span>}
        </div>
      )}
      <datalist id={TAGS_LIST_ID}>
        {tagOptions.map((name) => <option key={name} value={name} />)}
      </datalist>

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
