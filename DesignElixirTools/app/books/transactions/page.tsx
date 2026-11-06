'use client';

import { useState, useEffect } from 'react';
import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { fetchTransactionsAction } from '@/app/actions/transactionActions';
import { fetchAccountsAction } from '@/app/actions/accountActions';
import { fetchStatementsAction } from '@/app/actions/statementActions';
import { fetchExpenseCategoriesAction } from '@/app/actions/expenseCategoryActions';
import TransactionsTable from '../TransactionsTable';
import UploadStatement from '../statements/UploadStatement';
import BooksHeader from '../BooksHeader';

export default function Transactions(){
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleTransactionCreated = () => {
    loadData();
  };


  return (

    <div className='full-width basic-padding'>
        <BooksHeader
            title='Transactions'
            actions={<UploadStatement accounts={accounts} onUploaded={loadData} />}
        />
        {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
        <div>
        {!error && (
            <TransactionsTable
                transactions={transactions}
                accounts={accounts}
                statements={statements}
                categories={categories}
                onTransactionUpdated={loadData}
                loading={loading}
                emptyMessage='No transactions yet. Fill in the row above and click + to add one.'
                onTransactionCreated={handleTransactionCreated}
            />
        )}
        </div>
    </div>


  );
}
