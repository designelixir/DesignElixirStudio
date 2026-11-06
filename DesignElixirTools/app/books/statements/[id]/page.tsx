'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { fetchAccountsAction } from '@/app/actions/accountActions';
import { fetchStatementAction, getStatementFileUrlAction } from '@/app/actions/statementActions';
import { fetchTransactionsForStatementAction } from '@/app/actions/transactionActions';
import { fetchExpenseCategoriesAction } from '@/app/actions/expenseCategoryActions';
import { formatDay } from '../formatDay';
import TransactionsTable from '../../TransactionsTable';
import ParseDiscover from './ParseDiscover';
import EditStatement from './EditStatement';
import ParseChase from './ParseChase';
import ParseAppleCard from './ParseAppleCard';
import { StatementParserProps } from './parserTypes';
import BooksHeader, { BOOKS_CRUMB } from '../../BooksHeader';

// Add a new statement format here and it shows up in the dropdown
const PARSERS: Record<string, { label: string; Component: (props: StatementParserProps) => React.ReactNode }> = {
  discover: { label: 'Discover', Component: ParseDiscover },
  chase: { label: 'Chase', Component: ParseChase },
  apple: { label: 'Apple Card', Component: ParseAppleCard },
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function StatementSinglePage() {
  const { id } = useParams<{ id: string }>();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingStatement, setEditingStatement] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [parserKey, setParserKey] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const stmt = await fetchStatementAction(id);
        if (!stmt) {
          setError('Statement not found.');
          return;
        }
        const [accounts, url, txns, cats] = await Promise.all([
          fetchAccountsAction(),
          getStatementFileUrlAction(stmt.file_path),
          fetchTransactionsForStatementAction(stmt.id),
          fetchExpenseCategoriesAction(),
        ]);
        setCategories(cats);
        setStatement(stmt);
        setAccounts(accounts);
        setAccount(accounts.find((a) => a.id === stmt.account_id) ?? null);
        setPdfUrl(url);
        setTransactions(txns);
      } catch (err) {
        console.error('Error loading statement:', err);
        setError(err instanceof Error ? err.message : 'Failed to load statement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const Parser = parserKey ? PARSERS[parserKey].Component : null;

  const handleImported = async () => {
    setStatement((s) => (s ? { ...s, status: 'imported' } : s));
    await reloadTransactions();
  };

  const reloadTransactions = async () => {
    try {
      // Categories too, in case one was just added from the parser
      const [txns, cats] = await Promise.all([
        fetchTransactionsForStatementAction(id),
        fetchExpenseCategoriesAction(),
      ]);
      setTransactions(txns);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reload transactions');
    }
  };

  const purchasesTotal = transactions.filter((t) => t.purchase).reduce((sum, t) => sum + Number(t.cost), 0);
  const creditsTotal = transactions.filter((t) => !t.purchase).reduce((sum, t) => sum + Number(t.cost), 0);

  // Gets a fresh link on each click (links expire after 10 minutes).
  // The tab opens first so the browser doesn't block it as a popup.
  const viewPdf = async () => {
    if (!statement) return;
    const tab = window.open('', '_blank');
    try {
      const url = await getStatementFileUrlAction(statement.file_path);
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (err) {
      tab?.close();
      setError(err instanceof Error ? err.message : 'Could not open the PDF');
    }
  };


  return (
    <div className='full-width basic-padding'>
        <BooksHeader
            crumbs={[BOOKS_CRUMB, { label: 'Statements', href: '/books/statements' }]}
            title={statement ? statement.name || statement.file_name : loading ? 'Loading...' : 'Statement'}
            subtitle={statement && (
                <>
                    <h6> {account?.name ?? '—'} · {formatDay(statement.period_start)} – {formatDay(statement.period_end)} ·{' '} <span style={{ textTransform: 'capitalize' }}>{statement.status}</span> </h6>
                    <h6 style={{ margin: 0 }}>
                        Opening {statement.previous_balance !== null ? currency.format(Number(statement.previous_balance)) : '—'} →
                        closing {statement.new_balance !== null ? currency.format(Number(statement.new_balance)) : '—'}
                    </h6>
                </>
            )}
            actions={
                <>
                    <select value={parserKey} onChange={(e) => setParserKey(e.target.value)}>
                        <option value=''>Select Statement Parser</option>
                        {Object.entries(PARSERS).map(([key, p]) => (
                            <option key={key} value={key}>{p.label}</option>
                        ))}
                    </select>
                    {statement && ( <button type='button' onClick={viewPdf}>View PDF</button> )}
                    {statement && ( <button type='button' onClick={() => setEditingStatement(true)}>Edit</button> )}
                </>
            }
        />
        

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
    
    {transactions.length > 0 && (
        <div className='full-width' style={{ marginBottom: '30px' }}>
            <h2>Transactions</h2>
            <h6>
                {transactions.length} transaction{transactions.length === 1 ? '' : 's'} ·
                purchases {currency.format(purchasesTotal)} · payments/credits {currency.format(creditsTotal)}
            </h6>
            <TransactionsTable transactions={transactions} categories={categories} onTransactionUpdated={reloadTransactions} />
        </div>
    )}

    {statement && Parser && <Parser statement={statement} pdfUrl={pdfUrl} existingTransactions={transactions} onImported={handleImported} />}
      

      {statement && editingStatement && (
        <EditStatement
          statement={statement}
          accounts={accounts}
          onSaved={async () => {
            setEditingStatement(false);
            try {
              const updated = await fetchStatementAction(statement.id);
              if (updated) {
                setStatement(updated);
                setAccount(accounts.find((a) => a.id === updated.account_id) ?? null);
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not reload the statement');
            }
          }}
          onClose={() => setEditingStatement(false)}
        />
      )}

      <hr></hr>
      

    

      
    </div>
  );
}
