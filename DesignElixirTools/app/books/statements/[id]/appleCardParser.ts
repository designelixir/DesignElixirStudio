import type { PdfRow } from './pdfText';
import { moneyAfterLabel, parseMoney, type ParsedTransaction, type StatementPeriod, type StatementSummary } from './parserUtils';

const FULL_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;           // 01/28/2026
const MONEY = /^(-)?\$(-)?([\d,]+\.\d{2})$/;                // $57.27, -$439.28
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function money(str: string): number | null {
  const m = str.replace(/\s/g, '').match(MONEY);
  if (!m) return null;
  const value = Number(m[3].replace(/,/g, ''));
  return m[1] || m[2] ? -value : value;
}

type Section = 'none' | 'payments' | 'transactions' | 'installments' | 'interest' | 'fees';

/*
  Apple Card monthly statement (Goldman Sachs):

  Page 2
    Payments
    Date        Description                                   Amount
    01/28/2026  Apple Cash payment                           -$10.72
    Transactions
    Date        Description                  Daily Cash        Amount
    01/01/2026  Adobe Park Avenue San Jose…  1%   $0.57        $57.27

  Page 3
    Apple Card Monthly Installments
    11/28/2025  Apple Online Store Cupertino CA            $1,099.00   ← total financed
                TRANSACTION #f95fe0d1ab26
                This month’s installment: $45.79                       ← what's charged this month
    Interest Charged
    Interest charge                                           $38.64

  Monthly installments and interest have no date of their own this month, so
  they're dated the last day of the period ("Jan 1 — Jan 31, 2026").
  Daily Cash is a reward, not a charge, so it's left out.
*/
export function parseAppleCardRows(rows: PdfRow[], fallbackPeriod?: StatementPeriod): ParsedTransaction[] {
  const period = findPrintedPeriod(rows) ?? fallbackPeriod ?? { start: null, end: null };
  const periodEnd = period.end ?? new Date().toISOString().slice(0, 10);

  const transactions: ParsedTransaction[] = [];
  let section: Section = 'none';
  let current: ParsedTransaction | null = null;
  let descriptionX: number | null = null;
  let lastDate: string | null = null; // for undated lines like "Daily Cash Adjustment"
  // Where the Daily Cash columns start (description text is left of this)
  let dailyCashX: number | null = null;
  // An installment purchase, waiting for its "This month's installment" line
  let installment: { descriptor: string; details: string[]; added: ParsedTransaction | null } | null = null;

  for (const row of rows) {
    const text = row.text.trim();
    const lower = text.toLowerCase();

    // Section headings
    const heading: Section | null =
      lower === 'payments' ? 'payments'
      : lower === 'transactions' ? 'transactions'
      : lower.startsWith('apple card monthly installments') ? 'installments'
      : lower === 'interest charged' ? 'interest'
      : lower === 'fees' || lower === 'fees charged' ? 'fees'
      : lower === 'daily cash' ? 'none'
      : null;
    if (heading) {
      section = heading;
      current = null;
      installment = null;
      continue;
    }
    if (section === 'none') continue;

    // Column header: "Date  Description  Daily Cash  Amount"
    if (lower.startsWith('date') && lower.includes('description')) {
      dailyCashX = row.items.find((i) => i.str.toLowerCase().startsWith('daily cash'))?.x ?? null;
      continue;
    }

    // Totals ("Total payments for this period", "Total financed", ...) aren't transactions.
    // Interest and fees end at their total; the year-to-date and APR lines after
    // it also have dollar amounts but aren't charges.
    if (lower.startsWith('total')) {
      current = null;
      if (section === 'interest' || section === 'fees') section = 'none';
      continue;
    }

    const items = row.items;
    const first = items[0];
    const last = items[items.length - 1];
    const date = first?.str.match(FULL_DATE);
    const amount = last ? money(last.str) : null;

    if (section === 'payments' || section === 'transactions') {
      if (date && amount !== null && items.length >= 3) {
        const middle = items.slice(1, -1);
        const descriptionItems = dailyCashX !== null ? middle.filter((i) => i.x < dailyCashX! - 5) : middle;
        current = {
          date: `${date[3]}-${date[1]}-${date[2]}`,
          postDate: null,
          descriptor: descriptionItems.map((i) => i.str).join(' ').trim(),
          details: null,
          amount,
          category: section === 'payments' ? 'Payments and Credits' : null,
        };
        descriptionX = middle[0]?.x ?? null;
        lastDate = current.date;
        transactions.push(current);
        continue;
      }
      // Undated line with an amount, e.g. "Daily Cash Adjustment  -2%  $2.72" (Apple
      // taking back Daily Cash after a return). It's a real charge; date it like
      // the line above.
      if (
        !date && amount !== null && lastDate && descriptionX !== null && first &&
        Math.abs(first.x - descriptionX) < 10
      ) {
        const descriptionItems = items.slice(0, -1).filter((i) => dailyCashX === null || i.x < dailyCashX - 5);
        current = {
          date: lastDate,
          postDate: null,
          descriptor: descriptionItems.map((i) => i.str).join(' ').trim(),
          details: null,
          amount,
          category: section === 'payments' ? 'Payments and Credits' : null,
        };
        transactions.push(current);
        continue;
      }
      // A description that wrapped onto a second line
      if (current && descriptionX !== null && first && Math.abs(first.x - descriptionX) < 10 && amount === null) {
        current.details = current.details ? `${current.details} ${text}` : text;
        continue;
      }
      current = null;
      continue;
    }

    if (section === 'installments') {
      if (date && amount !== null) {
        // The purchase line; the amount here is the total financed, not this month's charge
        installment = { descriptor: items.slice(1, -1).map((i) => i.str).join(' ').trim(), details: [], added: null };
        continue;
      }
      if (installment) {
        const thisMonth = text.match(/this month.s installment:\s*(-?\$[\d,]+\.\d{2})/i);
        if (thisMonth) {
          const value = money(thisMonth[1]);
          if (value) {
            installment.added = {
              date: periodEnd,
              postDate: null,
              descriptor: `${installment.descriptor} (monthly installment)`,
              details: installment.details.join(' · ') || null,
              amount: value,
              category: 'Installments',
            };
            transactions.push(installment.added);
          }
          continue;
        }
        // e.g. "TRANSACTION #…" (before) or "Final installment: Nov 30, 2027" (after)
        installment.details.push(text);
        if (installment.added) installment.added.details = installment.details.join(' · ');
      }
      continue;
    }

    if (section === 'interest' || section === 'fees') {
      if (amount === null || amount === 0) continue;
      const descriptor = items.slice(date ? 1 : 0, -1).map((i) => i.str).join(' ').trim();
      transactions.push({
        date: date ? `${date[3]}-${date[1]}-${date[2]}` : periodEnd,
        postDate: null,
        descriptor,
        details: null,
        amount,
        category: section === 'interest' ? 'Interest' : 'Fees',
      });
    }
  }

  // "This month's installment" can include an earlier month that went unpaid
  // (e.g. $91.58 = 2 × $45.79), but only this month's share is added to the
  // balance. When the statement prints both balances and there's a single
  // installment, use whatever the other lines leave over.
  const installments = transactions.filter((t) => t.category === 'Installments');
  const summary = readAppleCardSummary(rows);
  if (installments.length === 1 && summary.previousBalance !== null && summary.newBalance !== null) {
    const others = transactions
      .filter((t) => t !== installments[0])
      .reduce((sum, t) => sum + t.amount, 0);
    const leftOver = Math.round((summary.newBalance - summary.previousBalance - others) * 100) / 100;
    const printed = installments[0].amount;
    if (leftOver > 0 && leftOver < printed) {
      installments[0].amount = leftOver;
      installments[0].details = [
        installments[0].details,
        `statement shows $${printed.toFixed(2)} due, including earlier unpaid installments`,
      ]
        .filter(Boolean)
        .join(' · ');
    }
  }

  return transactions;
}

// Finds "Jan 1 — Jan 31, 2026" (or "Dec 1, 2025 — Dec 31, 2025") in the page header
function findPrintedPeriod(rows: PdfRow[]): StatementPeriod | null {
  const pattern = /([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:,\s*(\d{4}))?\s*[—–-]\s*([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})/;
  for (const row of rows) {
    const m = row.text.match(pattern);
    if (!m) continue;
    const startMonth = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    const endMonth = MONTHS.indexOf(m[4].toLowerCase()) + 1;
    if (!startMonth || !endMonth) continue;
    const endYear = Number(m[6]);
    // No start year printed: same year, unless the period crosses New Year
    const startYear = m[3] ? Number(m[3]) : startMonth > endMonth ? endYear - 1 : endYear;
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      start: `${startYear}-${pad(startMonth)}-${pad(Number(m[2]))}`,
      end: `${endYear}-${pad(endMonth)}-${pad(Number(m[5]))}`,
    };
  }
  return null;
}

/*
  Balances on page 1:
    Your January Balance   Minimum Payment Due   Payment Due By
    as of Jan 31, 2026
    $912.51                $93.79                Feb 28, 2026      ← new (monthly) balance
    Previous Monthly Balance                     $1,373.80         ← previous

  The monthly balance (not "Total Balance", which adds every remaining
  installment) is what the imported lines add up to, since each month's
  installment is imported as its own line.
*/
export function readAppleCardSummary(rows: PdfRow[]): StatementSummary {
  let newBalance: number | null = null;
  const headingIndex = rows.findIndex((r) => /^your \w+ balance/i.test(r.text.trim()));
  if (headingIndex !== -1) {
    for (const row of rows.slice(headingIndex + 1, headingIndex + 6)) {
      const value = row.items[0] ? parseMoney(row.items[0].str) : null;
      if (value !== null) {
        newBalance = value;
        break;
      }
    }
  }
  return { previousBalance: moneyAfterLabel(rows, /previous monthly balance/), newBalance };
}
