import type { Account, Statement, Transaction } from '@/types/globalTypes';

// Local YYYY-MM-DD of a stored timestamp
export function localDay(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// The day before a YYYY-MM-DD day
export function dayBefore(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d - 1).toISOString());
}

// Cards and loans track what you owe (purchases raise it, payments lower it);
// checking/savings track what you have (purchases lower it).
export function isOwedBalance(account: Account) {
  return account.credit_card || account.loan || !account.checking_account;
}

const round = (n: number) => Math.round(n * 100) / 100;

// Opening balance + every transaction for this account after the opening date
// (and up to `throughDay`, inclusive, if given)
export function computeBalance(account: Account, transactions: Transaction[], throughDay?: string): number {
  const direction = isOwedBalance(account) ? 1 : -1;
  let balance = Number(account.opening_balance ?? 0);
  for (const t of transactions) {
    if (t.account_id !== account.id) continue;
    const day = localDay(t.date);
    if (account.opening_balance_date && day <= account.opening_balance_date) continue;
    if (throughDay && day > throughDay) continue;
    balance += direction * (t.purchase ? Number(t.cost) : -Number(t.cost));
  }
  return round(balance);
}

export interface AccountTotals {
  spent: number;   // purchases (and fees, interest) since the opening balance date
  paid: number;    // payments, credits and returns over the same time
  balance: number; // opening balance + spent − paid (flipped for checking accounts)
  since: string | null; // the opening balance date, or null if none is set (everything counted)
}

// Spent, paid and current balance, all counted over the same window so
// opening balance + spent − paid = balance
export function computeAccountTotals(account: Account, transactions: Transaction[]): AccountTotals {
  let spent = 0;
  let paid = 0;
  for (const t of transactions) {
    if (t.account_id !== account.id) continue;
    if (account.opening_balance_date && localDay(t.date) <= account.opening_balance_date) continue;
    if (t.purchase) spent += Number(t.cost);
    else paid += Number(t.cost);
  }
  return {
    spent: round(spent),
    paid: round(paid),
    balance: computeBalance(account, transactions),
    since: account.opening_balance_date,
  };
}

// The account's earliest statement that has a printed previous balance, as an
// opening balance suggestion (dated the day before that statement starts)
export function suggestOpeningBalance(account: Account, statements: Statement[]) {
  const first = statements
    .filter((s) => s.account_id === account.id && s.previous_balance !== null && s.period_start)
    .sort((a, b) => (a.period_start! < b.period_start! ? -1 : 1))[0];
  if (!first) return null;
  return {
    balance: Number(first.previous_balance),
    date: dayBefore(first.period_start!),
    source: first.name || first.file_name,
  };
}

// Does the opening balance plus transactions through each statement's end
// match the New Balance printed on it?
export function reconcileStatement(account: Account, statement: Statement, transactions: Transaction[]) {
  if (statement.new_balance === null || !statement.period_end) return null;
  const calculated = computeBalance(account, transactions, statement.period_end);
  const printed = Number(statement.new_balance);
  return { calculated, printed, difference: round(calculated - printed) };
}
