'use client';

import { useState, useEffect } from 'react';
import { Account, Transaction } from '@/types/globalTypes';
import { fetchAccountAction } from '@/app/actions/accountActions';
import { fetchFilteredTransactionsAction } from '@/app/actions/transactionActions';
import Link from 'next/link';
import { isOwedBalance } from './accounts/accountBalance';
import { totalsFor } from './accounts/AccountsSummary';

interface MiniCreditCardProps {
  accountId: string;
  // Pass the account if the page already has it, to skip loading it again
  account?: Account | null;
  // true (default): the small 50px card. false: the full card from the accounts page.
  mini?: boolean;
  // Show the balance owed as a plain number (no label)
  showBalance?: boolean;
  // Show the interest rate and payment due day (below the card)
  showDueDate?: boolean;
  // For showBalance: the page's transactions, to skip loading them again
  // (can include other accounts; only this account's are counted)
  transactions?: Transaction[] | null;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function accountTypes(account: Account) {
  const types: string[] = [];
  if (account.checking_account) types.push('Checking');
  if (account.credit_card) types.push('Credit Card');
  if (account.loan) types.push('Loan');
  return types.length ? types.join(', ') : '—';
}

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function MiniCreditCard({
  accountId,
  account: provided,
  mini = true,
  showBalance = false,
  showDueDate = false,
  transactions: providedTransactions,
}: MiniCreditCardProps) {
  const [loaded, setLoaded] = useState<{ id: string; account: Account | null } | null>(null);
  const [loadedTransactions, setLoadedTransactions] = useState<{ id: string; list: Transaction[] } | null>(null);
  const [error, setError] = useState('');

  // The account, unless the page passed it
  useEffect(() => {
    if (provided) return;
    let cancelled = false;
    fetchAccountAction(accountId)
      .then((a) => {
        if (!cancelled) setLoaded({ id: accountId, account: a });
      })
      .catch((err) => {
        console.error('Error loading account:', err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load account');
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, provided]);

  const needsBalance = showBalance;

  // Its transactions, only if a balance is shown and the page didn't pass them
  useEffect(() => {
    if (!needsBalance || providedTransactions) return;
    let cancelled = false;
    fetchFilteredTransactionsAction({ accountId })
      .then((list) => {
        if (!cancelled) setLoadedTransactions({ id: accountId, list });
      })
      .catch((err) => console.error('Error loading transactions:', err));
    return () => {
      cancelled = true;
    };
  }, [accountId, needsBalance, providedTransactions]);

  const account = provided ?? (loaded?.id === accountId ? loaded.account : null);
  const transactions =
    providedTransactions ?? (loadedTransactions?.id === accountId ? loadedTransactions.list : null);

  if (error) return <div style={{ color: 'red', fontSize: '12px' }}>{error}</div>;
  if (!account) {
    return (
      <div
        className={mini ? 'account-card-symbol-mini' : 'account-card-symbol'}
        style={{ borderStyle: loaded ? 'dashed' : 'solid', opacity: 0.4 }}
        title={loaded ? 'Account not found' : 'Loading account...'}
      />
    );
  }

  const href = `/books/accounts/${account.id}`;
  const totals = needsBalance && transactions ? totalsFor(account, transactions) : null;
  const noOpening = account.opening_balance === null && (
    <span style={{ color: '#b35c00' }} title='No opening balance set'> *</span>
  );

  // Balance owed as a plain number
  const plainBalance = (
    <span style={{ margin: 0, padding: 0, fontSize: '12px' }} title={isOwedBalance(account) ? 'Balance owed' : 'Balance'}>
      {totals ? currency.format(totals.balance) : '…'}
      {noOpening}
    </span>
  );

  const balance = showBalance ? plainBalance : null;

  const dueDateLine =
    showDueDate &&
    `${account.interest_rate != null ? `${account.interest_rate}%` : ''} • ${account.payment_day != null ? ordinal(account.payment_day) : '—'}`;

  // ---- Small card ----
  if (mini) {
    const card = (
      <Link
        href={href}
        className='account-card-symbol-mini flex-end-end no-flex-grow box-shadow'
        style={{ backgroundImage: `url(/${account.name}.svg)` }}
      >
        <p className='account-card-symbol-name'>{account.name}</p>
      </Link>
    );
    if (!balance && !showDueDate) return card;
    return (
      <div className='flex-start-start flex-column no-flex-grow' style={{ alignItems: 'center', gap: '4px' }}>
        
        {card}
        {balance}
        {showDueDate && account.payment_day != null && (
          <h6 style={{ fontSize: '10px', marginTop: '-5px' }} className='no-text-spacing'>
            DUE {ordinal(account.payment_day)}
          </h6>
        )}
      </div>
    );
  }

  // ---- Full card (as on the accounts page) ----
  return (
    <Link href={href} className='account-card'>
      {balance && <p className='no-text-spacing centered-text red-text'>+{balance}</p>}
      <div className={`${accountTypes(account)}-wrapper account-card-symbol box-shadow`} style={{ backgroundImage: `url(/${account.name}.svg)` }}>
        <div className='flex-start-start account-card-number'>
          <span></span>
          <span></span>
          <span></span>
          <p style={{fontSize: '12px', lineHeight: '12px', margin: '0', whiteSpace: 'nowrap'}}>{account.name}</p>
        </div>
      </div>
      <h3>{account.brand} {account.name}</h3>
      {dueDateLine && <h6>{dueDateLine}</h6>}
    </Link>
  );
}
