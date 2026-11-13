import type { PdfRow } from './pdfText';
import { yearFor, type ParsedTransaction, type StatementPeriod } from './parserUtils';

const SHORT_DATE = /^(\d{2})\/(\d{2})$/;                   // 12/13
// 9.31, -820.00, $37.95, and .21 (Chase drops the leading zero on cents-only amounts)
const AMOUNT = /^(-)?\$?(-)?(\d[\d,]*\.\d{2}|\.\d{2})$/;

// Chase doesn't give a category per purchase, so the section title stands in
const SECTION_CATEGORIES: [string, string | null][] = [
  ['PAYMENTS AND OTHER CREDITS', 'Payments and Credits'],
  ['PURCHASE', null],
  ['CASH ADVANCE', 'Cash Advances'],
  ['BALANCE TRANSFER', 'Balance Transfers'],
  ['FEES CHARGED', 'Fees'],
  ['INTEREST CHARGED', 'Interest'],
];

/*
  Chase credit card statement, "ACCOUNT ACTIVITY" section:

    Date of
    Transaction   Merchant Name or Transaction Description      $ Amount
    PAYMENTS AND OTHER CREDITS
    01/05         Payment Thank You-Mobile                      -820.00
    PURCHASE
    12/13         MCDONALD'S F5234 SILVERTHORNE CO                 9.31
    FEES CHARGED
    01/09         PLAN FEE - US TREAS TAX P                        37.95
                  TOTAL FEES FOR THIS PERIOD                      $37.95   ← skipped
    INTEREST CHARGED
    01/09         PURCHASE INTEREST CHARGE                          7.94

  Dates have no year; it comes from "Opening/Closing Date 12/10/25 - 01/09/26".
  Rows are only read inside ACCOUNT ACTIVITY (which can continue onto later
  pages) so the plan and interest tables further down are ignored.
*/
export function parseChaseRows(rows: PdfRow[], fallbackPeriod?: StatementPeriod): ParsedTransaction[] {
  const period = findPrintedPeriod(rows) ?? fallbackPeriod ?? { start: null, end: null };

  const transactions: ParsedTransaction[] = [];
  let inActivity = false;
  let category: string | null = null;
  let current: ParsedTransaction | null = null;
  let descriptionX: number | null = null;

  for (const row of rows) {
    const upper = row.text.toUpperCase();

    if (upper.includes('ACCOUNT ACTIVITY')) {
      inActivity = true;
      current = null;
      continue;
    }
    // Sections after the activity list
    if (upper.includes('TOTALS YEAR-TO-DATE') || upper.startsWith('INTEREST CHARGES')) {
      inActivity = false;
      current = null;
      continue;
    }
    if (!inActivity) continue;

    // Section heading, e.g. "PURCHASE" or "FEES CHARGED"
    const section = SECTION_CATEGORIES.find(([title]) => upper === title || upper === `${title}S`);
    if (section) {
      category = section[1];
      current = null;
      continue;
    }

    const items = row.items;
    const first = items[0];
    const last = items[items.length - 1];
    const date = first?.str.match(SHORT_DATE);
    const amount = items.length >= 3 ? last.str.replace(/\s/g, '').match(AMOUNT) : null;

    if (date && amount) {
      const value = Number(amount[3].replace(/,/g, ''));
      current = {
        date: `${yearFor(Number(date[1]), period)}-${date[1]}-${date[2]}`,
        postDate: null,
        descriptor: items.slice(1, -1).map((i) => i.str).join(' ').trim(),
        details: null,
        amount: amount[1] || amount[2] ? -value : value,
        category,
      };
      descriptionX = items[1].x;
      transactions.push(current);
      continue;
    }

    // Extra detail line under a transaction (e.g. foreign currency details)
    const isDetailLine =
      current &&
      descriptionX !== null &&
      first &&
      Math.abs(first.x - descriptionX) < 10 &&
      !AMOUNT.test(last.str.replace(/\s/g, ''));
    if (isDetailLine) {
      current!.details = current!.details ? `${current!.details} ${row.text}` : row.text;
      continue;
    }

    // Totals, column headers, etc.
    current = null;
  }

  return transactions;
}

// Finds "Opening/Closing Date 12/10/25 - 01/09/26" (2- or 4-digit years)
function findPrintedPeriod(rows: PdfRow[]): StatementPeriod | null {
  const toIso = (mm: string, dd: string, yy: string) => `${yy.length === 2 ? `20${yy}` : yy}-${mm}-${dd}`;
  for (const row of rows) {
    if (!/opening\s*\/\s*closing/i.test(row.text)) continue;
    const m = row.text.match(/(\d{2})\/(\d{2})\/(\d{2,4})\s*-\s*(\d{2})\/(\d{2})\/(\d{2,4})/);
    if (m) return { start: toIso(m[1], m[2], m[3]), end: toIso(m[4], m[5], m[6]) };
  }
  return null;
}
