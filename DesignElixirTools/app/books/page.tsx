'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Account, ExpenseCategory, Transaction } from '@/types/globalTypes';
import { fetchAccountsAction } from '@/app/actions/accountActions';
import { fetchFilteredTransactionsAction } from '@/app/actions/transactionActions';
import { fetchExpenseCategoriesAction } from '@/app/actions/expenseCategoryActions';
import AccountsSummary from './accounts/AccountsSummary';
import MiniCreditCard from './MiniCreditCard';
import SpendPieChart from './categories/SpendPieChart';
import { buildSpendSlices, computeCategoryTotals } from './categories/categoryTotals';
import BooksHeader from './BooksHeader';
import TaxEstimate from './expenses/TaxEstimate';
import MonthlySpendingChart from './transactions/MonthlySpendingChart';


export default function Books(){
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchAccountsAction(), fetchFilteredTransactionsAction(), fetchExpenseCategoriesAction()])
      .then(([accts, txns, cats]) => {
        setAccounts(accts);
        setTransactions(txns);
        setCategories(cats);
      })
      .catch((err) => {
        console.error('Error loading books summary:', err);
        setError(err instanceof Error ? err.message : 'Failed to load the summaries');
      });
  }, []);

  // Spending by category for this year (the categories page's default filter)
  const thisYear = new Date().getFullYear();
  const spending = useMemo(() => {
    if (!transactions) return null;
    const from = new Date(thisYear, 0, 1).getTime();
    const to = new Date(thisYear + 1, 0, 1).getTime();
    const yearTransactions = transactions.filter((t) => {
      const time = new Date(t.date).getTime();
      return time >= from && time < to;
    });
    const totals = computeCategoryTotals(yearTransactions, categories);
    return { totals, slices: buildSpendSlices(categories, totals) };
  }, [transactions, categories, thisYear]);

  return (

    <div className='full-width basic-padding'>
        <BooksHeader crumbs={[]} title='Book Keeping' subtitle={
  <p>Ask yourself, do you really fucking need that??? The only way out of this is to STOP SPENDING MONEY BITCH</p>
        } />
        {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
        <div className='flex-start-start flex-wrap'>
            <div className="books-section basic-padding br">
                <h2><Link href="/books/accounts">Accounts</Link></h2>
                {transactions
                  ? <AccountsSummary accounts={accounts} transactions={transactions} />
                  : !error && <p style={{ color: '#666' }}>Loading...</p>}
                {/* Each account's mini card (links to its page) with what's owed on it */}
                {accounts.length > 0 && (
                  <div className='flex-start-start flex-wrap' style={{ gap: '15px' }}>
                    {accounts.map((account) => (
                      <MiniCreditCard
                        key={account.id}
                        accountId={account.id}
                        account={account}
                        showBalance
                        showDueDate
                        transactions={transactions}
                      />
                    ))}
                  </div>
                )}
            </div>
            <div className="books-section basic-padding br">
                <h2><Link href="/books/expenses">Expenses</Link></h2>
                {transactions
                  ? <TaxEstimate transactions={transactions} categories={categories} year={thisYear} />
                  : !error && <p style={{ color: '#666' }}>Loading...</p>}
            </div>
            <div className="books-section basic-padding br">
                <h2><Link href="/books/transactions">Transactions</Link></h2>
                {transactions
                  ? <MonthlySpendingChart transactions={transactions} categories={categories} year={thisYear} />
                  : !error && <p style={{ color: '#666' }}>Loading...</p>}
            </div>
            <div className="books-section basic-padding br">
                <h2><Link href="/books/statements">Statements</Link></h2>
            </div>
            <div className="books-section basic-padding br">
                <h2><Link href="/books/categories">Expense Categories</Link></h2>
                {spending ? (
                  <>
                    <h6 style={{ margin: '0 0 10px' }}>Spending by category · this year ({thisYear})</h6>
                    <SpendPieChart slices={spending.slices} total={spending.totals.totalSpent} />
                  </>
                ) : (
                  !error && <p style={{ color: '#666' }}>Loading...</p>
                )}
            </div>
        </div>
    </div>


  );
}
