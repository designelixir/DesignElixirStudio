'use client';

import { useState, useEffect } from 'react';
import { Account, Transaction } from '@/types/globalTypes';
import { fetchAccountsAction } from '@/app/actions/accountActions';
import { fetchFilteredTransactionsAction } from '@/app/actions/transactionActions';
import AccountsSummary from './AccountsSummary';
import AddAccount from './AddAccount';
import MiniCreditCard from '../MiniCreditCard';
import BooksHeader from '../BooksHeader';

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  // All transactions, to work out each account's balance
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const loadAccounts = async () => {
    try {
      const [accts, txns] = await Promise.all([fetchAccountsAction(), fetchFilteredTransactionsAction()]);
      setAccounts(accts);
      setTransactions(txns);
      setError('');
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleAccountCreated = () => {
    setShowAddModal(false);
    loadAccounts();
  };

  return (
    <div className='full-width basic-padding'>
      <BooksHeader
        title='Accounts'
        subtitle={<h6>{loading ? 'Loading...' : `${accounts.length} account${accounts.length === 1 ? '' : 's'}`}</h6>}
        actions={<button onClick={() => setShowAddModal(true)}>+ Add Account</button>}
      />

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

      {/* All accounts together */}
      {transactions && <AccountsSummary accounts={accounts} transactions={transactions} />}

      {/* One full-size card per account, with its balance and due date */}
      {accounts.length > 0 && (
        <div className='flex-start-start flex-wrap'>
          {accounts.map((account) => (
            <MiniCreditCard
              key={account.id}
              accountId={account.id}
              account={account}
              mini={false}
              showBalance
              showDueDate
              transactions={transactions}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddAccount
          onAccountCreated={handleAccountCreated}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}