'use client';

import { useState, useEffect } from 'react';
import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { fetchTransactionsAction } from '@/app/actions/transactionActions';
import { fetchAccountsAction } from '@/app/actions/accountActions';
import { fetchStatementsAction } from '@/app/actions/statementActions';
import { fetchExpenseCategoriesAction } from '@/app/actions/expenseCategoryActions';
import TransactionsBrowser from '../TransactionsBrowser';
import UploadStatement from '../statements/UploadStatement';
import BooksHeader from '../BooksHeader';

export default function Transactions(){
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const loadData = async () => {
    try {
      const [txns, accts, stmts, cats] = await Promise.all([
        fetchTransactionsAction(),
        fetchAccountsAction(),
        fetchStatementsAction(),
        fetchExpenseCategoriesAction(),
      ]);
      setCategories(cats);
      setTransactions(txns);
      setAccounts(accts);
      setStatements(stmts);
      setError('');
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className='full-width basic-padding'>
        <BooksHeader title='Transactions' actions={<UploadStatement accounts={accounts} onUploaded={loadData} />} />
        {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
        {!error && (
            <TransactionsBrowser
                transactions={transactions}
                accounts={accounts}
                statements={statements}
                categories={categories}
                loading={loading}
                emptyMessage='No transactions yet. Click "+ Add transaction" to add one.'
                onTransactionUpdated={loadData}
                onTransactionCreated={adding ? loadData : undefined}
                toolbar={
                    <button type='button' onClick={() => setAdding((a) => !a)}>
                        {adding ? 'Done adding' : '+ Add transaction'}
                    </button>
                }
            />
        )}
    </div>
  );
}
