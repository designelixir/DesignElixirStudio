import type { PdfRow, PdfTextItem } from './pdfText';
import { yearFor, moneyAfterLabel, type ParsedTransaction, type StatementPeriod, type StatementSummary } from './parserUtils';

const FULL_DATE = /^(\d{2})\/(\d{2})\/(\d{2,4})$/; // 12/12/24 or 12/12/2024
const SHORT_DATE = /^(\d{2})\/(\d{2})$/;           // 12/26
// "$ 77.20", "$ -673.92", "-$64.00", "$1,234.56"
const AMOUNT = /(-)?\s*\$\s*(-)?\s*([\d,]+\.\d{2})/;

function toIsoDay(mmddyy: string): string | null {
  const m = mmddyy.match(FULL_DATE);
  if (!m) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${m[1]}-${m[2]}`;
}

function parseAmount(match: RegExpMatchArray): number {
  const value = Number(match[3].replace(/,/g, ''));
  return match[1] || match[2] ? -value : value;
}

// Works out which Discover layout the PDF uses and reads it.
// `fallbackPeriod` (the dates you entered for the statement) is only used when
// a monthly statement doesn't print its own period.
export function parseDiscoverRows(rows: PdfRow[], fallbackPeriod?: StatementPeriod): ParsedTransaction[] {
  const isActivityExport = rows.some((r) => r.items.length >= 2 && toIsoDay(r.items[0].str) && toIsoDay(r.items[1].str));
  return isActivityExport ? parseActivityRows(rows) : parseMonthlyStatementRows(rows, fallbackPeriod);
}

/*
  Format 1: Discover "Account Activity" export (one row per transaction):

    Trans. Date | Post Date | Description                     | Amount     | Category
    12/12/24      12/12/24    TST* THE GINGER PIG DENVER CO     $ 77.20      Restaurants
                              APPLE PAY ENDING IN 3602          ← optional extra line(s)

  A transaction row starts with two dates. Rows right after it that start in
  the description column (and have no date or amount) are extra detail lines.
*/
function parseActivityRows(rows: PdfRow[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  let current: ParsedTransaction | null = null;
  let descriptionX: number | null = null;

  for (const row of rows) {
    const [first, second, ...rest] = row.items;
    const transDate = first ? toIsoDay(first.str) : null;
    const postDate = second ? toIsoDay(second.str) : null;

    if (transDate && postDate) {
      // Everything after the two dates: "<description> $ <amount> <category>"
      const tail = rest.map((i) => i.str).join(' ');
      const amountMatch = tail.match(AMOUNT);
      if (!amountMatch || amountMatch.index === undefined) {
        current = null;
        continue;
      }
      current = {
        date: transDate,
        postDate,
        descriptor: tail.slice(0, amountMatch.index).trim(),
        details: null,
        amount: parseAmount(amountMatch),
        category: tail.slice(amountMatch.index + amountMatch[0].length).trim() || null,
      };
      descriptionX = rest[0]?.x ?? null;
      transactions.push(current);
      continue;
    }

    // Extra detail line belonging to the transaction above
    const startsInDescriptionColumn =
      current && descriptionX !== null && first && Math.abs(first.x - descriptionX) < 15;
    if (startsInDescriptionColumn && !AMOUNT.test(row.text)) {
      current!.details = current!.details ? `${current!.details} ${row.text}` : row.text;
      continue;
    }

    // Anything else (headers, footer text, page breaks) ends the current transaction
    current = null;
  }

  return transactions;
}

/*
  Format 2: Discover monthly statement.

    TRANS.
    DATE   PURCHASES                              MERCHANT CATEGORY   AMOUNT  │ Miles Rewards
    12/26  BROOMFIELD ARC THRIFT BROOMFIELD CO    Merchandise         $29.09  │ (sidebar)
    12/28  IKEA CENTENNIAL CENTENNIAL CO          Merchandise          $6.38  │
           APPLE PAY ENDING IN 1600               ← optional extra line(s)
    01/26  INTERNET PAYMENT - THANK YOU                               -$64.00

    FEES FOR THIS PERIOD                                              AMOUNT
    LATE FEE                                                          $41.00
    INTEREST CHARGED FOR THIS PERIOD                                  AMOUNT
    INTEREST CHARGE ON PURCHASES                                      $49.01

  Dates have no year, so it comes from the statement period printed on page 1
  ("12/27/2025 - 01/26/2026"). The rewards sidebar shares lines with the
  transactions, so anything to the right of the AMOUNT column is ignored.
  Fees and interest have no date; they're dated the last day of the period.
*/
function parseMonthlyStatementRows(rows: PdfRow[], fallbackPeriod?: StatementPeriod): ParsedTransaction[] {
  const period = findPrintedPeriod(rows) ?? fallbackPeriod ?? { start: null, end: null };
  const dateForMonthDay = (mm: string, dd: string) => `${yearFor(Number(mm), period)}-${mm}-${dd}`;
  const periodEnd = period.end ?? (period.start ? period.start : new Date().toISOString().slice(0, 10));

  const transactions: ParsedTransaction[] = [];
  let current: ParsedTransaction | null = null;
  let mode: 'none' | 'transactions' | 'fees' | 'interest' = 'none';
  // Column positions, read from the "DATE ... AMOUNT" header row
  let layout: { dateX: number; descriptionX: number; categoryX: number | null; amountX: number } | null = null;
  // Section title from the header, e.g. "PURCHASES" or "PAYMENTS AND CREDITS"
  let section = '';

  for (const row of rows) {
    // Drop the rewards sidebar (anything right of the AMOUNT column)
    const items: PdfTextItem[] = layout ? row.items.filter((i) => i.x <= layout!.amountX + 30) : row.items;
    if (items.length === 0) continue; // a sidebar-only line; doesn't end the current transaction
    const text = items.map((i) => i.str).join(' ');
    const upper = text.toUpperCase();

    // Header row of a transactions section: "DATE  PURCHASES  MERCHANT CATEGORY  AMOUNT"
    const dateHeader = items.find((i) => i.str.toUpperCase() === 'DATE');
    const amountHeader = items.find((i) => i.str.toUpperCase() === 'AMOUNT');
    if (dateHeader && amountHeader) {
      const descriptionHeader = items.find((i) => i.x > dateHeader.x && i !== amountHeader);
      const categoryHeader = items.find((i) => i.str.toUpperCase().includes('CATEGORY'));
      layout = {
        dateX: dateHeader.x,
        descriptionX: descriptionHeader?.x ?? dateHeader.x + 40,
        categoryX: categoryHeader?.x ?? null,
        amountX: amountHeader.x,
      };
      section = descriptionHeader?.str.toUpperCase() ?? '';
      mode = 'transactions';
      current = null;
      continue;
    }

    // Fees and interest sections
    if (upper.startsWith('FEES FOR THIS PERIOD')) {
      mode = 'fees';
      current = null;
      if (!layout && amountHeader) layout = { dateX: 0, descriptionX: 0, categoryX: null, amountX: amountHeader.x };
      continue;
    }
    if (upper.startsWith('INTEREST CHARGED FOR THIS PERIOD')) {
      mode = 'interest';
      current = null;
      continue;
    }
    if (mode === 'fees' || mode === 'interest') {
      if (upper.startsWith('TOTAL INTEREST FOR THIS PERIOD')) {
        mode = 'none';
        continue;
      }
      if (upper.startsWith('TOTAL')) continue;
      const amountMatch = text.match(AMOUNT);
      if (!amountMatch || amountMatch.index === undefined) continue;
      const amount = parseAmount(amountMatch);
      if (amount === 0) continue; // e.g. "INTEREST CHARGE ON CASH ADVANCES $0.00"
      const descriptor = text.slice(0, amountMatch.index).trim();
      const dated = descriptor.match(/^(\d{2})\/(\d{2})\s+(.*)$/); // some fees are dated
      transactions.push({
        date: dated ? dateForMonthDay(dated[1], dated[2]) : periodEnd,
        postDate: null,
        descriptor: dated ? dated[3] : descriptor,
        details: null,
        amount,
        category: mode === 'fees' ? 'Fees' : 'Interest',
      });
      continue;
    }

    if (mode !== 'transactions' || !layout) continue;

    // Transaction row: starts with MM/DD in the date column and has an amount
    const [first, ...rest] = items;
    const shortDate = first.str.match(SHORT_DATE);
    const amountItemIndex = rest.findIndex((i) => AMOUNT.test(i.str));
    if (shortDate && Math.abs(first.x - layout.dateX) < 10 && amountItemIndex !== -1) {
      const amountItem = rest[amountItemIndex];
      const before = rest.slice(0, amountItemIndex);
      const isCategory = (i: PdfTextItem) => layout!.categoryX !== null && i.x >= layout!.categoryX - 5;
      const category = before.filter(isCategory).map((i) => i.str).join(' ').trim();

      current = {
        date: dateForMonthDay(shortDate[1], shortDate[2]),
        postDate: null,
        descriptor: before.filter((i) => !isCategory(i)).map((i) => i.str).join(' ').trim(),
        details: null,
        amount: parseAmount(amountItem.str.match(AMOUNT)!),
        // Payments have no merchant category; label them like the Activity export does
        category: category || (section.includes('PAYMENTS') ? 'Payments and Credits' : null),
      };
      transactions.push(current);
      continue;
    }

    // Extra detail line belonging to the transaction above
    if (current && Math.abs(first.x - layout.descriptionX) < 10 && !AMOUNT.test(text) && !SHORT_DATE.test(first.str)) {
      current.details = current.details ? `${current.details} ${text}` : text;
      continue;
    }

    current = null;
  }

  return transactions;
}

// Finds "MM/DD/YYYY - MM/DD/YYYY" anywhere in the PDF
function findPrintedPeriod(rows: PdfRow[]): StatementPeriod | null {
  for (const row of rows) {
    const m = row.text.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return { start: `${m[3]}-${m[1]}-${m[2]}`, end: `${m[6]}-${m[4]}-${m[5]}` };
  }
  return null;
}

// "Previous Balance $1,965.46" / "New Balance: $2,286.67" (monthly statements;
// Account Activity exports don't print balances)
export function readDiscoverSummary(rows: PdfRow[]): StatementSummary {
  return {
    previousBalance: moneyAfterLabel(rows, /previous balance/),
    newBalance: moneyAfterLabel(rows, /new balance/),
  };
}
