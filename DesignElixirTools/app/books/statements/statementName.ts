import type { Account } from '@/types/globalTypes';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// [Brand][Name]-[start month]-[end month]-[end year], e.g. "Chase8223-Oct-Nov-2026".
// Spaces are dropped from the brand and name. Null until there's an account and both dates.
export function statementName(
  account: Pick<Account, 'brand' | 'name'> | null | undefined,
  periodStart: string,
  periodEnd: string
): string | null {
  if (!account || !periodStart || !periodEnd) return null;
  const month = (day: string) => MONTHS[Number(day.slice(5, 7)) - 1];
  const prefix = `${account.brand ?? ''}${account.name}`.replace(/\s+/g, '');
  return `${prefix}-${month(periodStart)}-${month(periodEnd)}-${periodEnd.slice(0, 4)}`;
}
