'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { fetchAccountAction } from '@/app/actions/accountActions';
import {
  fetchStatementsAction,
  getStatementFileUrlAction,
  updateStatementAction,
} from '@/app/actions/statementActions';
import { fetchFilteredTransactionsAction } from '@/app/actions/transactionActions';
import { fetchExpenseCategoriesAction } from '@/app/actions/expenseCategoryActions';
import { extractPdfRows } from '@/app/books/statements/[id]/pdfText';
import { formatForBrand } from '@/app/books/statements/[id]/statementFormats';
import { formatDay } from '@/app/books/statements/formatDay';
import MiniCreditCard from '../../MiniCreditCard';
import TransactionsTable from '../../TransactionsTable';
import AddAccount from '../AddAccount';
import LoanSummary from './LoanSummary';
import { totalsFor } from '../AccountsSummary';
import { computeLoanHistory } from '../loanInterest';
import {
  computeBalance,
  isOwedBalance,
  localDay,
  reconcileStatement,
  suggestOpeningBalance,
} from '../accountBalance';
import BooksHeader, { BOOKS_CRUMB } from '../../BooksHeader';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  // Progress while reading balances out of statement PDFs
  const [readingBalances, setReadingBalances] = useState<{ done: number; total: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const [acct, stmts, txns, cats] = await Promise.all([
        fetchAccountAction(id),
        fetchStatementsAction(),
        fetchFilteredTransactionsAction({ accountId: id }),
        fetchExpenseCategoriesAction(),
      ]);
      if (!acct) {
        setNotFound(true);
        return;
      }
      setAccount(acct);
      setStatements(
        stmts
          .filter((s) => s.account_id === id)
          .sort((a, b) => ((a.period_start ?? '') < (b.period_start ?? '') ? 1 : -1))
      );
      setTransactions(txns);
      setCategories(cats);
      setError('');
    } catch (err) {
      console.error('Error loading account:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const crumbs = [BOOKS_CRUMB, { label: 'Accounts', href: '/books/accounts' }];

  if (loading) {
    return (
      <div className='full-width basic-padding'>
        <BooksHeader crumbs={crumbs} title='Loading...' />
      </div>
    );
  }
  if (notFound) {
    return (
      <div className='full-width basic-padding'>
        <BooksHeader crumbs={crumbs} title='Not found' />
        <p>Account not found.</p>
        <Link href='/books/accounts'>Back to accounts</Link>
      </div>
    );
  }
  if (!account) return <div className='basic-padding' style={{ color: 'red' }}>{error || 'Could not load account.'}</div>;

  const owed = isOwedBalance(account);
  // Loans include interest built up since the last payment; other accounts don't accrue it here
  const balance = account.loan
    ? computeLoanHistory(account, transactions, localDay(new Date().toISOString())).owedToday
    : computeBalance(account, transactions);
  const hasOpening = account.opening_balance !== null && account.opening_balance_date !== null;
  // Spent / paid / interest over the same stretch as the balance
  const totals = totalsFor(account, transactions);
  const countedSince = transactions.filter(
    (t) => !account.opening_balance_date || localDay(t.date) > account.opening_balance_date
  ).length;
  const suggestion = suggestOpeningBalance(account, statements);
  const format = formatForBrand(account.brand);
  const missingBalances = statements.filter((s) => s.previous_balance === null || s.new_balance === null);

  // Reads Previous / New Balance out of each statement PDF that doesn't have them yet
  const readBalancesFromPdfs = async () => {
    if (!format) return;
    setReadingBalances({ done: 0, total: missingBalances.length });
    setError('');
    try {
      for (const [i, s] of missingBalances.entries()) {
        const url = await getStatementFileUrlAction(s.file_path);
        const summary = format.summarize(await extractPdfRows(url));
        if (summary.previousBalance !== null || summary.newBalance !== null) {
          await updateStatementAction(s.id, {
            previous_balance: summary.previousBalance,
            new_balance: summary.newBalance,
          });
        }
        setReadingBalances({ done: i + 1, total: missingBalances.length });
      }
      await load();
    } catch (err) {
      console.error('Error reading statement balances:', err);
      setError(err instanceof Error ? err.message : 'Could not read statement balances');
    } finally {
      setReadingBalances(null);
    }
  };

  return (
    <div className='full-width basic-padding'>
      <BooksHeader
        crumbs={crumbs}
        title={account.brand ? `${account.brand} ${account.name}` : account.name}
        actions={<button type='button' onClick={() => setEditing(true)}>Edit Account</button>}
      />

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

      {/* Balance */}
      <div className='flex-start-start flex-wrap' style={{ gap: '20px', marginBottom: '25px' }}>
        <div style={{ pointerEvents: 'none' }}>
          <MiniCreditCard accountId={account.id} account={account} />
        </div>
        <div className='card' style={{ background: 'white', maxWidth: '420px' }}>
          <h6 style={{ margin: 0 }}>{owed ? 'Balance owed' : 'Balance'}</h6>
          <h1 style={{ margin: '5px 0' }}>{currency.format(balance)}</h1>
          {hasOpening ? (
            <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>
              {currency.format(Number(account.opening_balance))} on {formatDay(account.opening_balance_date)} +{' '}
              {countedSince} transaction{countedSince === 1 ? '' : 's'} since
            </p>
          ) : (
            <div>
              <p style={{ margin: '0 0 8px', color: '#b35c00', fontSize: '13px' }}>
                No opening balance yet, so this only adds up the {transactions.length} imported transactions.
              </p>
              <button type='button' onClick={() => setEditing(true)}>Set opening balance</button>
            </div>
          )}
        </div>
        <div className='card flex-start-start' style={{ background: 'white', gap: '30px', flex: 'none' }}>
          <div>
            <h6 style={{ margin: 0 }}>Spent</h6>
            <h2 style={{ margin: '5px 0 0' }}>{currency.format(totals.spent)}</h2>
          </div>
          <div>
            <h6 style={{ margin: 0 }}>Paid</h6>
            <h2 style={{ margin: '5px 0 0', color: '#3a9d4f' }}>{currency.format(totals.paid)}</h2>
          </div>
          {account.loan && (
            <div>
              <h6 style={{ margin: 0 }}>Interest</h6>
              <h2 style={{ margin: '5px 0 0', color: '#b35c00' }}>{currency.format(totals.interest)}</h2>
            </div>
          )}
        </div>
        <div style={{ color: '#666', fontSize: '13px' }}>
          {account.interest_rate != null && <p style={{ margin: 0 }}>{Number(account.interest_rate)}% APR</p>}
          {account.payment_day != null && <p style={{ margin: 0 }}>Payment due day {account.payment_day}</p>}
        </div>
      </div>

      {account.loan && <LoanSummary account={account} transactions={transactions} />}

      {/* Statements, with a check that transactions add up to each printed balance */}
      {statements.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <div className='flex-center-spacebetween'>
            <h2 style={{ margin: 0 }}>Statements</h2>
            {missingBalances.length > 0 && format && (
              <button type='button' onClick={readBalancesFromPdfs} disabled={!!readingBalances}>
                {readingBalances
                  ? `Reading ${readingBalances.done} / ${readingBalances.total}...`
                  : `Read balances from ${missingBalances.length} PDF${missingBalances.length === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
          {missingBalances.length > 0 && !format && (
            <p style={{ color: '#666', fontSize: '12px' }}>
              No statement format matches the brand “{account.brand ?? ''}”, so balances can&apos;t be read from these PDFs.
            </p>
          )}
          <table style={{ marginTop: '10px' }}>
            <thead>
              <tr>
                <th>Statement</th>
                <th>Period</th>
                <th style={{ textAlign: 'right' }}>Previous balance</th>
                <th style={{ textAlign: 'right' }}>New balance (statement)</th>
                <th style={{ textAlign: 'right' }}>Calculated</th>
                <th>Check</th>
              </tr>
            </thead>
            <tbody>
              {statements.map((s) => {
                const check = hasOpening ? reconcileStatement(account, s, transactions) : null;
                const beforeOpening =
                  account.opening_balance_date && s.period_end && s.period_end <= account.opening_balance_date;
                return (
                  <tr key={s.id}>
                    <td><Link href={`/books/statements/${s.id}`}>{s.name || s.file_name}</Link></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDay(s.period_start)} – {formatDay(s.period_end)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {s.previous_balance !== null ? currency.format(Number(s.previous_balance)) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {s.new_balance !== null ? currency.format(Number(s.new_balance)) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{check && !beforeOpening ? currency.format(check.calculated) : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {!hasOpening ? (
                        <span style={{ color: '#999' }}>Needs opening balance</span>
                      ) : beforeOpening ? (
                        <span style={{ color: '#999' }}>Before opening balance</span>
                      ) : !check ? (
                        <span style={{ color: '#999' }}>No printed balance</span>
                      ) : check.difference === 0 ? (
                        <span style={{ color: '#3a9d4f' }}>✓ Matches</span>
                      ) : (
                        <span style={{ color: '#b35c00' }} title='Calculated minus statement'>
                          Off by {currency.format(check.difference)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Transactions */}
      <h2>Transactions</h2>
      <TransactionsTable
        transactions={transactions}
        statements={statements}
        categories={categories}
        emptyMessage='No transactions for this account yet.'
        onTransactionUpdated={load}
      />

      {editing && (
        <AddAccount
          account={account}
          suggestedOpening={suggestion}
          onAccountCreated={() => {
            setEditing(false);
            load();
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
