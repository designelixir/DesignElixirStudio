'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { fetchAccountAction } from '@/app/actions/accountActions';
import { fetchStatementsAction } from '@/app/actions/statementActions';
import { fetchFilteredTransactionsAction } from '@/app/actions/transactionActions';
import { fetchExpenseCategoriesAction } from '@/app/actions/expenseCategoryActions';
import { formatDay } from '@/app/books/statements/formatDay';
import MiniCreditCard from '../../MiniCreditCard';
import TransactionsBrowser from '../../TransactionsBrowser';
import AddAccount from '../AddAccount';
import UploadStatement from '../../statements/UploadStatement';
import Tabs from '@/app/components/Tabs';
import LoanSummary from './LoanSummary';
import StatementCoverage from './StatementCoverage';
import { totalsFor } from '../AccountsSummary';
import { computeLoanHistory } from '../loanInterest';
import {
  computeBalance,
  isOwedBalance,
  localDay,
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
  return (
    <div className='full-width basic-padding'>
      <BooksHeader
        crumbs={crumbs}
        title={account.brand ? `${account.brand} ${account.name}` : account.name}
        actions={
          <>
          <div className='flex-center-end'>
            <button type='button' onClick={() => setEditing(true)}>Edit Account</button>
            <UploadStatement accounts={[account]} defaultAccountId={account.id} onUploaded={load} />
            </div>
          </>
        }
      />

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

      {/* Balance */}
      <div className='flex-start-start' style={{ gap: '20px', marginBottom: '25px' }}>
        <div style={{ pointerEvents: 'none' }}>
          <MiniCreditCard accountId={account.id} account={account} />
        </div>
        <div className='card' style={{ background: 'white', maxWidth: '420px' }}>
          <h6 style={{ margin: 0 }}>{owed ? 'Balance owed' : 'Balance'}</h6>
          <h1 style={{ margin: '5px 0' }}>{currency.format(balance)}</h1>
          <div style={{ color: '#666', fontSize: '13px' }}>
            {account.interest_rate != null && <p style={{ margin: 0 }}>{Number(account.interest_rate)}% APR</p>}
            {account.payment_day != null && <p style={{ margin: 0 }}>Payment due day {account.payment_day}</p>}
          </div>
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
        <StatementCoverage statements={statements} />
        
        
      </div>

      {account.loan && <LoanSummary account={account} transactions={transactions} />}

      
      <Tabs
        tabs={[
          {
            name: `Statements (${statements.length})`,
            content:
              statements.length === 0 ? (
                <div style={{backgroundColor: 'white'}}>
                <p style={{ color: '#666' }}>No statements yet. Use Import Statement above to upload one.</p>
                </div>
              ) : (
                <div style={{backgroundColor: 'white'}}>
                  <table>
                  <thead>
                    <tr>
                      <th>Statement</th>
                      <th>Start</th>
                      <th>End</th>
                      <th style={{ textAlign: 'right' }}>Transactions</th>
                      <th style={{ textAlign: 'right' }}>Spend</th>
                      <th style={{ textAlign: 'right' }}>Payments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statements.map((s) => {
                      const lines = transactions.filter((t) => t.statement_id === s.id);
                      const spend = lines.filter((t) => t.purchase).reduce((sum, t) => sum + Number(t.cost), 0);
                      const payments = lines.filter((t) => !t.purchase).reduce((sum, t) => sum + Number(t.cost), 0);
                      const imported = s.status === 'imported';
                      return (
                        <tr key={s.id}>
                          <td>
                            <span className='flex-center-start no-flex-grow' style={{ gap: '8px' }}>
                              {/* Green: transactions imported · orange: only uploaded */}
                              <span
                                title={imported ? 'Imported' : 'Uploaded, not imported yet'}
                                aria-label={imported ? 'Imported' : 'Uploaded, not imported yet'}
                                style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  flex: 'none',
                                  background: imported ? '#3a9d4f' : '#f28e2b',
                                }}
                              />
                              <Link href={`/books/statements/${s.id}`}>{s.name || s.file_name}</Link>
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDay(s.period_start)}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDay(s.period_end)}</td>
                          <td style={{ textAlign: 'right' }}>{lines.length}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{currency.format(spend)}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: payments > 0 ? '#3a9d4f' : undefined }}>
                            {currency.format(payments)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              ),
          },
          {
            name: `Transactions (${transactions.length})`,
            content: (
              <TransactionsBrowser
                transactions={transactions}
                statements={statements}
                categories={categories}
                emptyMessage='No transactions for this account yet.'
                onTransactionUpdated={load}
                exportContext={{ accounts: account ? [account] : [] }}
              />
            ),
          },
        ]}
      />
      

      {editing && (
        <AddAccount
          account={account}
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
