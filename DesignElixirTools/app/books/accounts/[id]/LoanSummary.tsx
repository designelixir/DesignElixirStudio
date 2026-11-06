'use client';

import { Account, Transaction } from '@/types/globalTypes';
import { formatDay } from '@/app/books/statements/formatDay';
import { localDay } from '../accountBalance';
import {
  addPeriods,
  computeLoanHistory,
  paymentToFinishIn,
  periodsBetween,
  projectPayoff,
  scheduledPayoffDate,
  PaymentFrequency,
} from '../loanInterest';

interface LoanSummaryProps {
  account: Account;
  transactions: Transaction[];
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const FREQUENCY_LABELS: Record<PaymentFrequency, string> = { monthly: 'month', biweekly: '2 weeks', weekly: 'week' };

function Stat({ label, value, note, color }: { label: string; value: string; note?: string; color?: string }) {
  return (
    <div>
      <h6 style={{ margin: 0 }}>{label}</h6>
      <h2 style={{ margin: '4px 0 0', color }}>{value}</h2>
      {note && <p style={{ margin: '2px 0 0', color: '#666', fontSize: '12px' }}>{note}</p>}
    </div>
  );
}

// Interest, payoff projection and payment history for a loan account
export default function LoanSummary({ account, transactions }: LoanSummaryProps) {
  const today = localDay(new Date().toISOString());
  const apr = Number(account.interest_rate ?? 0);
  const frequency: PaymentFrequency = account.payment_frequency ?? 'monthly';
  const history = computeLoanHistory(account, transactions, today);

  const missing: string[] = [];
  if (!account.interest_rate) missing.push('an interest rate');
  if (account.opening_balance === null || !account.opening_balance_date) missing.push('an opening balance and date');
  if (!account.minimum_payment) missing.push('a minimum payment');

  // Next payment: one period after the last payment (or after the loan start / opening date)
  const anchor = history.lastPaymentDate ?? account.loan_start_date ?? account.opening_balance_date ?? today;
  let nextDue = addPeriods(anchor, frequency, 1);
  while (nextDue < today) nextDue = addPeriods(nextDue, frequency, 1);

  const minimum = Number(account.minimum_payment ?? 0);
  const projection = minimum > 0 ? projectPayoff(history.owedToday, apr, frequency, minimum, nextDue) : null;

  const scheduledEnd = scheduledPayoffDate(account);
  const periodsLeftOnSchedule = scheduledEnd ? periodsBetween(nextDue, scheduledEnd, frequency) + 1 : null;
  const neededPayment =
    scheduledEnd && periodsLeftOnSchedule && scheduledEnd >= nextDue
      ? paymentToFinishIn(history.owedToday, apr, frequency, periodsLeftOnSchedule)
      : null;

  // Ahead/behind: projected payoff (at the minimum) vs the scheduled end, in payments
  let scheduleNote: { text: string; color: string } | null = null;
  if (scheduledEnd && projection?.payoffDate) {
    if (projection.payoffDate <= scheduledEnd) {
      const early = periodsBetween(projection.payoffDate, scheduledEnd, frequency);
      scheduleNote = {
        text: early > 0 ? `${early} payment${early === 1 ? '' : 's'} ahead of schedule` : 'On schedule',
        color: '#3a9d4f',
      };
    } else {
      const late = periodsBetween(scheduledEnd, projection.payoffDate, frequency);
      scheduleNote = { text: `${late} payment${late === 1 ? '' : 's'} behind schedule`, color: '#b35c00' };
    }
  }

  return (
    <div className='card' style={{ background: 'white', marginBottom: '30px' }}>
      <h2 style={{ marginTop: 0 }}>Loan</h2>

      {missing.length > 0 && (
        <p style={{ color: '#b35c00', fontSize: '13px' }}>
          Add {missing.join(', ')} (Edit Account) for the interest and payoff numbers to be right.
        </p>
      )}

      <div className='flex-start-start flex-wrap' style={{ gap: '40px', marginBottom: '20px' }}>
        <Stat
          label='Owed today'
          value={currency.format(history.owedToday)}
          note={`${currency.format(history.principal)} principal + ${currency.format(history.accruedInterest)} interest since ${history.lastPaymentDate ? 'last payment' : 'opening balance'}`}
        />
        <Stat label='Interest paid' value={currency.format(history.interestPaid)} color='#b35c00' />
        <Stat label='Principal paid' value={currency.format(history.principalPaid)} color='#3a9d4f' />
        <Stat
          label='Next payment'
          value={minimum ? currency.format(minimum) : '—'}
          note={`due around ${formatDay(nextDue)} · every ${FREQUENCY_LABELS[frequency]}`}
        />
      </div>

      <div className='flex-start-start flex-wrap' style={{ gap: '40px', marginBottom: '20px' }}>
        {projection && (
          projection.payments === null ? (
            <p style={{ margin: 0, color: '#b35c00' }}>
              At {currency.format(minimum)} per {FREQUENCY_LABELS[frequency]}, the payment doesn&apos;t cover the
              interest, so the loan never gets paid off.
            </p>
          ) : (
            <Stat
              label='Paid off at the minimum'
              value={formatDay(projection.payoffDate)}
              note={`${projection.payments} more payment${projection.payments === 1 ? '' : 's'} · ${currency.format(projection.totalInterest ?? 0)} more interest`}
            />
          )
        )}
        {scheduledEnd && (
          <Stat
            label='Scheduled payoff'
            value={formatDay(scheduledEnd)}
            note={[
              `${account.term_months}-month term from ${formatDay(account.loan_start_date)}`,
              neededPayment !== null ? `${currency.format(neededPayment)} per payment finishes on time` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        )}
        {scheduleNote && (
          <div style={{ alignSelf: 'center' }}>
            <strong style={{ color: scheduleNote.color }}>{scheduleNote.text}</strong>
          </div>
        )}
      </div>

      {history.payments.length > 0 && (
        <>
          <h3>Payments</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Payment</th>
                <th style={{ textAlign: 'right' }}>To interest</th>
                <th style={{ textAlign: 'right' }}>To principal</th>
                <th style={{ textAlign: 'right' }}>Principal left</th>
              </tr>
            </thead>
            <tbody>
              {[...history.payments].reverse().map((p, i) => (
                <tr key={`${p.date}-${i}`}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDay(p.date)}</td>
                  <td style={{ textAlign: 'right' }}>{currency.format(p.amount)}</td>
                  <td style={{ textAlign: 'right', color: '#b35c00' }}>{currency.format(p.toInterest)}</td>
                  <td style={{ textAlign: 'right', color: '#3a9d4f' }}>{currency.format(p.toPrincipal)}</td>
                  <td style={{ textAlign: 'right' }}>{currency.format(p.principalAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p style={{ color: '#999', fontSize: '11px', margin: '10px 0 0' }}>
        Estimated with daily simple interest ({apr}% ÷ 365 per day on the principal). Your lender&apos;s figures may
        differ by a little because of their exact day-count and posting dates. If your lender&apos;s interest charges are
        imported as transactions too, they&apos;d be counted twice.
      </p>
    </div>
  );
}
