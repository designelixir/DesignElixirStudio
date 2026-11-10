'use client';

import React, { useState, useMemo, useEffect, useId, FormEvent } from 'react';
import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { addTagToTransactionsAction, fetchTagsAction } from '@/app/actions/transactionActions';
import TransactionsTable from './TransactionsTable';
import TransactionFilters, { EMPTY_FILTERS, filterTransactions, TransactionFilterValues } from './TransactionFilters';
import { exportTransactionsCsv } from './exportTransactionsCsv';
import { netCost } from './transactionAmounts';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface TransactionsBrowserProps {
  transactions: Transaction[];
  accounts?: Account[];
  statements?: Statement[];
  categories?: ExpenseCategory[];
  loading?: boolean;
  // Shown when there are no transactions at all (not when the search hides them)
  emptyMessage?: string;
  // Called after rows are edited, deleted or bulk-tagged, to reload `transactions`
  onTransactionUpdated?: () => void;
  // Pass to show the add-transaction row at the top of the table
  onTransactionCreated?: () => void;
  // Extra buttons in the search bar, after Clear (e.g. "+ Add transaction")
  toolbar?: React.ReactNode;
  // Accounts / statements for the CSV's columns when they aren't passed above
  // (leaving out `accounts` / `statements` hides those table columns)
  exportContext?: { accounts?: Account[]; statements?: Statement[] };
}

// The standard transactions list: search + date range, a selectable table, and
// actions for the selected rows (add a tag, export CSV)
export default function TransactionsBrowser({
  transactions,
  accounts,
  statements,
  categories,
  loading = false,
  emptyMessage = 'No transactions yet.',
  onTransactionUpdated,
  onTransactionCreated,
  toolbar,
  exportContext,
}: TransactionsBrowserProps) {
  const tagsListId = useId(); // unique, since a page can show several of these
  const [filters, setFilters] = useState<TransactionFilterValues>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () => filterTransactions(transactions, categories ?? [], filters),
    [transactions, categories, filters]
  );

  // Only count selections that still exist (e.g. not deleted since)
  const selected = useMemo(() => transactions.filter((t) => selectedIds.has(t.id)), [transactions, selectedIds]);
  const hiddenSelected = useMemo(() => {
    const shown = new Set(visible.map((t) => t.id));
    return selected.filter((t) => !shown.has(t.id)).length;
  }, [selected, visible]);

  // Totals of the selected rows: purchases add, payments/credits subtract
  const selectedTotals = useMemo(() => {
    let cost = 0;
    let reconciled = 0;
    let net = 0;
    for (const t of selected) {
      const sign = t.purchase ? 1 : -1;
      cost += sign * Number(t.cost);
      reconciled += Math.max(Number(t.reconciled ?? 0), 0);
      net += sign * netCost(t);
    }
    return { cost, reconciled, net };
  }, [selected]);

  // Bulk tag
  const [tagDraft, setTagDraft] = useState('');
  const [tagging, setTagging] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [tagsVersion, setTagsVersion] = useState(0);
  useEffect(() => {
    fetchTagsAction()
      .then(setTagSuggestions)
      .catch((err) => console.error('Error loading tags:', err));
  }, [tagsVersion]);

  const handleAddTag = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tagDraft.trim() || selected.length === 0) return;
    setTagging(true);
    setBulkMessage(null);
    try {
      const changed = await addTagToTransactionsAction(selected.map((t) => t.id), tagDraft);
      const tag = tagDraft.trim().toLowerCase();
      setBulkMessage({
        text:
          changed === selected.length
            ? `Tagged ${changed} transaction${changed === 1 ? '' : 's'} “${tag}”.`
            : `Tagged ${changed} of ${selected.length}; the rest already had “${tag}”.`,
      });
      setTagDraft('');
      setTagsVersion((v) => v + 1);
      onTransactionUpdated?.();
    } catch (err) {
      console.error('Error tagging transactions:', err);
      setBulkMessage({ text: err instanceof Error ? err.message : 'Failed to add tag', error: true });
    } finally {
      setTagging(false);
    }
  };

  const handleExport = () =>
    exportTransactionsCsv(selected, {
      accounts: accounts ?? exportContext?.accounts ?? [],
      statements: statements ?? exportContext?.statements ?? [],
      categories: categories ?? [],
    });

  return (
    <>
      <TransactionFilters value={filters} onChange={setFilters}>
        {toolbar}
      </TransactionFilters>

      {selected.length > 0 && (
        <div className='card flex-center-start flex-wrap' style={{ gap: '10px', marginBottom: '15px', background: 'white' }}>
          <strong>
            {selected.length} selected
            {hiddenSelected > 0 && <span style={{ fontWeight: 'normal', color: '#666' }}> ({hiddenSelected} hidden by search)</span>}
          </strong>
          <span style={{ fontSize: '13px' }} title='Purchases minus payments/credits'>
            Total <strong>{currency.format(selectedTotals.cost)}</strong>
            {selectedTotals.reconciled > 0 && (
              <>
                {' · '}Reconciled <strong>{currency.format(selectedTotals.reconciled)}</strong>
                {' · '}Net <strong>{currency.format(selectedTotals.net)}</strong>
              </>
            )}
          </span>
          <form onSubmit={handleAddTag} className='flex-center-start no-flex-grow' style={{ gap: '6px' }}>
            <input
              type='text'
              placeholder='Tag'
              list={tagsListId}
              autoComplete='off'
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              aria-label='Tag to add to selected transactions'
              style={{ width: '160px' }}
            />
            <button type='submit' disabled={tagging || !tagDraft.trim()}>
              {tagging ? 'Tagging…' : 'Add tag'}
            </button>
          </form>
          <button type='button' onClick={handleExport}>Export CSV</button>
          <button type='button' onClick={() => setSelectedIds(new Set())}>Clear selection</button>
          {bulkMessage && (
            <span style={{ color: bulkMessage.error ? 'red' : '#3a9d4f', fontSize: '13px' }}>{bulkMessage.text}</span>
          )}
          <datalist id={tagsListId}>
            {tagSuggestions.map((name) => <option key={name} value={name} />)}
          </datalist>
        </div>
      )}

      <TransactionsTable
        transactions={visible}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => {
          setSelectedIds(ids);
          setBulkMessage(null);
        }}
        accounts={accounts}
        statements={statements}
        categories={categories}
        loading={loading}
        emptyMessage={transactions.length > 0 ? 'No transactions match your search or date range.' : emptyMessage}
        onTransactionUpdated={onTransactionUpdated}
        onTransactionCreated={onTransactionCreated}
      />
    </>
  );
}
