import type { Account, Transaction } from '@/types/globalTypes';
import { localDay } from './accountBalance';

/*
  Loans use daily simple interest (how most car, personal and student loans work):
    - between payments, interest builds up each day: what you owe × rate ÷ 365
    - a payment first covers that built-up interest; the rest lowers what you owe
  Starts from the account's opening balance on its opening balance date.
*/

export interface LoanPaymentRow {
  date: string;        // YYYY-MM-DD
  amount: number;      // the payment
  toInterest: number;
  toPrincipal: number;
  principalAfter: number;
}

export interface LoanHistory {
  principal: number;       // still owed, not counting interest that's built up
  accruedInterest: number; // interest built up since the last payment, not yet paid
  owedToday: number;       // principal + accruedInterest
  interestPaid: number;
  principalPaid: number;
  totalPaid: number;
  added: number;           // charges added to the loan (purchases on the account)
  payments: LoanPaymentRow[];
  lastPaymentDate: string | null;
}

export const PERIODS_PER_YEAR = { monthly: 12, biweekly: 26, weekly: 52 } as const;
export type PaymentFrequency = keyof typeof PERIODS_PER_YEAR;

const round = (n: number) => Math.round(n * 100) / 100;

// Whole days between two YYYY-MM-DD days (UTC, so daylight saving can't shift it)
export function daysBetween(from: string, to: string) {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

// YYYY-MM-DD plus n payment periods
export function addPeriods(day: string, frequency: PaymentFrequency, n: number) {
  const [y, m, d] = day.split('-').map(Number);
  const date =
    frequency === 'monthly'
      ? new Date(Date.UTC(y, m - 1 + n, d))
      : new Date(Date.UTC(y, m - 1, d + n * (frequency === 'biweekly' ? 14 : 7)));
  return date.toISOString().slice(0, 10);
}

export function computeLoanHistory(account: Account, transactions: Transaction[], asOf: string): LoanHistory {
  const dailyRate = Number(account.interest_rate ?? 0) / 100 / 365;
  const events = transactions
    .filter((t) => t.account_id === account.id)
    .map((t) => ({ t, day: localDay(t.date) }))
    .filter(({ day }) => !account.opening_balance_date || day > account.opening_balance_date)
    // Same day: charges before payments
    .sort((a, b) => (a.day === b.day ? Number(a.t.purchase ? 0 : 1) - Number(b.t.purchase ? 0 : 1) : a.day < b.day ? -1 : 1));

  let principal = Number(account.opening_balance ?? 0);
  let accrued = 0;
  let lastDay = account.opening_balance_date ?? events[0]?.day ?? asOf;
  let interestPaid = 0;
  let principalPaid = 0;
  let added = 0;
  const payments: LoanPaymentRow[] = [];

  const accrueTo = (day: string) => {
    const days = daysBetween(lastDay, day);
    if (days > 0 && principal > 0) accrued += principal * dailyRate * days;
    if (days > 0) lastDay = day;
  };

  for (const { t, day } of events) {
    accrueTo(day);
    const amount = Number(t.cost);
    if (t.purchase) {
      principal += amount;
      added += amount;
      continue;
    }
    const toInterest = Math.min(amount, accrued);
    accrued -= toInterest;
    const toPrincipal = amount - toInterest;
    principal -= toPrincipal;
    interestPaid += toInterest;
    principalPaid += toPrincipal;
    payments.push({
      date: day,
      amount: round(amount),
      toInterest: round(toInterest),
      toPrincipal: round(toPrincipal),
      principalAfter: round(principal),
    });
  }
  if (asOf > lastDay) accrueTo(asOf);

  return {
    principal: round(principal),
    accruedInterest: round(accrued),
    owedToday: round(principal + accrued),
    interestPaid: round(interestPaid),
    principalPaid: round(principalPaid),
    totalPaid: round(interestPaid + principalPaid),
    added: round(added),
    payments,
    lastPaymentDate: payments.length ? payments[payments.length - 1].date : null,
  };
}

export interface PayoffProjection {
  payments: number | null;      // payments left at this amount (null = never pays off)
  payoffDate: string | null;
  totalInterest: number | null; // interest still to pay
}

// Paying `payment` every period starting the next due date: how many payments
// and how much interest until it's paid off. Uses the periodic rate (APR ÷
// periods per year), which is close to daily interest when paid on time.
export function projectPayoff(
  balance: number,
  aprPercent: number,
  frequency: PaymentFrequency,
  payment: number,
  firstPaymentDate: string
): PayoffProjection {
  if (balance <= 0) return { payments: 0, payoffDate: firstPaymentDate, totalInterest: 0 };
  const r = aprPercent / 100 / PERIODS_PER_YEAR[frequency];
  if (payment <= 0 || payment <= balance * r) return { payments: null, payoffDate: null, totalInterest: null };
  let remaining = balance;
  let interest = 0;
  let n = 0;
  while (remaining > 0.005 && n < 2000) {
    const i = remaining * r;
    interest += i;
    remaining = remaining + i - payment;
    n++;
  }
  return {
    payments: n,
    payoffDate: addPeriods(firstPaymentDate, frequency, n - 1),
    totalInterest: round(interest),
  };
}

// The payment needed each period to pay `balance` off in `periods` payments
export function paymentToFinishIn(balance: number, aprPercent: number, frequency: PaymentFrequency, periods: number) {
  if (periods <= 0) return balance;
  const r = aprPercent / 100 / PERIODS_PER_YEAR[frequency];
  if (r === 0) return round(balance / periods);
  return round((balance * r) / (1 - Math.pow(1 + r, -periods)));
}

// Scheduled end of the loan (start + term), or null if either is missing
export function scheduledPayoffDate(account: Account) {
  if (!account.loan_start_date || !account.term_months) return null;
  return addPeriods(account.loan_start_date, 'monthly', account.term_months);
}

// How many payment periods fall between two days (rounded down)
export function periodsBetween(from: string, to: string, frequency: PaymentFrequency) {
  if (to <= from) return 0;
  let n = 0;
  while (addPeriods(from, frequency, n + 1) <= to && n < 5000) n++;
  return n;
}

// Spent / paid / balance for a loan, like computeAccountTotals but with interest:
// opening + added + interest − paid = owed today
export function computeLoanTotals(account: Account, transactions: Transaction[]) {
  const today = localDay(new Date().toISOString());
  const h = computeLoanHistory(account, transactions, today);
  return {
    spent: h.added,
    paid: h.totalPaid,
    interest: round(h.interestPaid + h.accruedInterest),
    balance: h.owedToday,
    since: account.opening_balance_date,
  };
}
