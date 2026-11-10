'use client';

import { useState, useMemo, useEffect, useRef, KeyboardEvent } from 'react';
import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import TransactionsBrowser from '../TransactionsBrowser';
import { netCost } from '../transactionAmounts';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const round = (n: number) => Math.round(n * 100) / 100;

interface TagTotal {
  tag: string;
  spent: number; // purchases minus credits/returns with this tag
  count: number;
}

// Totals per tag. A transaction with several tags counts toward each of them.
function computeTagTotals(transactions: Transaction[]): TagTotal[] {
  const byTag = new Map<string, TagTotal>();
  for (const t of transactions) {
    const cost = netCost(t); // minus anything reconciled
    for (const tag of new Set(t.tags ?? [])) {
      const total = byTag.get(tag) ?? { tag, spent: 0, count: 0 };
      total.spent += t.purchase ? cost : -cost;
      total.count += 1;
      byTag.set(tag, total);
    }
  }
  return [...byTag.values()]
    .map((t) => ({ ...t, spent: round(t.spent) }))
    .sort((a, b) => b.spent - a.spent || a.tag.localeCompare(b.tag));
}

interface TagsViewProps {
  transactions: Transaction[]; // already filtered by the page's period / account filters
  accounts: Account[];
  statements: Statement[];
  categories: ExpenseCategory[];
  loading: boolean;
  onTransactionUpdated: () => void;
}

// Every tag with its total; click one to see its transactions below
export default function TagsView({ transactions, accounts, statements, categories, loading, onTransactionUpdated }: TagsViewProps) {
  const totals = useMemo(() => computeTagTotals(transactions), [transactions]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const selectedTransactions = useMemo(
    () => (selectedTag ? transactions.filter((t) => t.tags?.includes(selectedTag)) : []),
    [selectedTag, transactions]
  );

  useEffect(() => {
    if (selectedTag) sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedTag]);

  const toggle = (tag: string) => setSelectedTag((current) => (current === tag ? null : tag));

  if (!loading && totals.length === 0) {
    return (
      <p style={{ color: '#666' }}>
        No tagged transactions for these filters. Add tags when editing a transaction.
      </p>
    );
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '20px',
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {totals.map(({ tag, spent, count }) => (
          <div
            key={tag}
            role='button'
            tabIndex={0}
            aria-pressed={selectedTag === tag}
            onClick={() => toggle(tag)}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle(tag);
              }
            }}
            className='card flex-start-start flex-column'
            style={{
              background: 'white',
              cursor: 'pointer',
              outline: selectedTag === tag ? '2px solid var(--navy)' : undefined,
            }}
          >
            <span className='transaction-tag' style={{ fontSize: '13px' }}>{tag}</span>
            {spent < 0 ? (
              <h2 style={{ margin: '10px 0 0', color: '#3a9d4f' }}>+{currency.format(-spent)}</h2>
            ) : (
              <h2 style={{ margin: '10px 0 0' }}>{currency.format(spent)}</h2>
            )}
            <h6 style={{ margin: '2px 0 5px' }}>
              {count} transaction{count === 1 ? '' : 's'}
            </h6>
          </div>
        ))}
      </div>

      {selectedTag && (
        <div ref={sectionRef} style={{ marginTop: '30px', scrollMarginTop: '20px' }}>
          <div className='flex-center-spacebetween' style={{ marginBottom: '10px' }}>
            <div className='flex-center-start' style={{ gap: '10px' }}>
              <h2 style={{ margin: 0 }}>{selectedTag}</h2>
              <h6 style={{ margin: 0 }}>
                {selectedTransactions.length} transaction{selectedTransactions.length === 1 ? '' : 's'}
              </h6>
            </div>
            <button type='button' onClick={() => setSelectedTag(null)}>Close</button>
          </div>
          <TransactionsBrowser
            transactions={selectedTransactions}
            accounts={accounts}
            statements={statements}
            categories={categories}
            loading={loading}
            emptyMessage='No transactions with this tag for these filters.'
            onTransactionUpdated={onTransactionUpdated}
          />
        </div>
      )}
    </>
  );
}
