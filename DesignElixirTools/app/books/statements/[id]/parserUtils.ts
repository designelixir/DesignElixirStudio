// Shared by every statement parser (Discover, Chase, ...)

// One transaction read from a statement, before it's saved
export interface ParsedTransaction {
  date: string;                 // YYYY-MM-DD (transaction date)
  postDate: string | null;      // YYYY-MM-DD, when the statement shows one
  descriptor: string;           // main description line
  details: string | null;       // extra line(s) under it, e.g. "APPLE PAY ENDING IN 3602"
  amount: number;               // as printed: purchases positive, payments/credits negative
  category: string | null;      // the bank's category, e.g. "Restaurants"
}

// Statement dates (YYYY-MM-DD), used to fill in years the PDF leaves out
export interface StatementPeriod {
  start: string | null;
  end: string | null;
}

// A statement can cross New Year (Dec 10 – Jan 9): December dates get the
// start year, January dates the end year.
export function yearFor(month: number, period: StatementPeriod): number {
  const start = period.start ? { y: Number(period.start.slice(0, 4)), m: Number(period.start.slice(5, 7)) } : null;
  const end = period.end ? { y: Number(period.end.slice(0, 4)), m: Number(period.end.slice(5, 7)) } : null;
  if (start && end && start.y !== end.y) return month >= start.m ? start.y : end.y;
  return start?.y ?? end?.y ?? new Date().getFullYear();
}

// Balances printed on a statement (null when the PDF doesn't show one)
export interface StatementSummary {
  previousBalance: number | null;
  newBalance: number | null;
}

// "$1,234.56", "-$12.00", "$-12.00" → number
export function parseMoney(str: string): number | null {
  const m = str.replace(/\s/g, '').match(/^(-)?\$(-)?([\d,]+\.\d{2})$/);
  if (!m) return null;
  const value = Number(m[3].replace(/,/g, ''));
  return m[1] || m[2] ? -value : value;
}

// Finds the first row whose text starts with `label` (case-insensitive) and
// returns the dollar amount right after it, e.g. "Previous Balance $1,965.46"
export function moneyAfterLabel(rows: { text: string }[], label: RegExp): number | null {
  for (const row of rows) {
    const m = row.text.match(new RegExp(`^\\s*${label.source}\\s*:?\\s*(-?\\$\\s*-?[\\d,]+\\.\\d{2})`, 'i'));
    if (m) return parseMoney(m[1]);
  }
  return null;
}
