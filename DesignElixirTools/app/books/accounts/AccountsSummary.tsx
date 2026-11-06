'use client';

import { Account, Transaction } from '@/types/globalTypes';
import { computeAccountTotals, isOwedBalance } from './accountBalance';
import { computeLoanTotals } from './loanInterest';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Loans add interest; other accounts are opening balance + spent − paid
export const totalsFor = (account: Account, transactions: Transaction[]) =>
  account.loan ? computeLoanTotals(account, transactions) : { ...computeAccountTotals(account, transactions), interest: 0 };

interface AccountsSummaryProps {
  accounts: Account[];
  transactions: Transaction[]; // all transactions (each account counts from its own opening date)
}

// Total spent / total paid / current balance owed, across all accounts
export default function AccountsSummary({ accounts, transactions }: AccountsSummaryProps) {
  if (accounts.length === 0) return null;
  const all = accounts.map((a) => ({ account: a, totals: totalsFor(a, transactions) }));
  const spent = all.reduce((sum, x) => sum + x.totals.spent, 0);
  const paid = all.reduce((sum, x) => sum + x.totals.paid, 0);
  // Cards and loans add up to what's owed; checking accounts would count against it
  const owed = all.reduce((sum, x) => sum + (isOwedBalance(x.account) ? x.totals.balance : -x.totals.balance), 0);
  const missingOpening = accounts.filter((a) => a.opening_balance === null).length;

  return (
    <div className='flex-start-start flex-wrap' style={{ gap: '40px', marginBottom: '25px' }}>
      <div>
        <h6 style={{ margin: 0 }}>Total spent</h6>
        <h2 style={{ margin: '4px 0 0' }}>{currency.format(spent)}</h2>
      </div>
      <div>
        <h6 style={{ margin: 0 }}>Total paid</h6>
        <h2 style={{ margin: '4px 0 0', color: '#3a9d4f' }}>{currency.format(paid)}</h2>
      </div>
      <div>
        <h6 style={{ margin: 0 }}>Current balance owed</h6>
        <h2 style={{ margin: '4px 0 0' }}>{currency.format(owed)}</h2>
      </div>
      {missingOpening > 0 && (
        <p style={{ margin: 0, alignSelf: 'flex-end', color: '#b35c00', fontSize: '12px' }}>
          * {missingOpening} account{missingOpening === 1 ? ' has' : 's have'} no opening balance, so
          {missingOpening === 1 ? ' its balance only adds' : ' their balances only add'} up imported transactions.
        </p>
      )}
    </div>
  );
}
