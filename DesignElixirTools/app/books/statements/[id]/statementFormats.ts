import type { Account } from '@/types/globalTypes';
import type { PdfRow } from './pdfText';
import type { ParsedTransaction, StatementPeriod } from './parserUtils';
import { parseDiscoverRows } from './discoverParser';
import { parseChaseRows } from './chaseParser';
import { parseAppleCardRows } from './appleCardParser';

export interface StatementFormat {
  label: string;
  parse: (rows: PdfRow[], fallbackPeriod?: StatementPeriod) => ParsedTransaction[];
  // Account brands this format is for (lowercase), used to pick it automatically
  brands: string[];
}

export const STATEMENT_FORMATS: Record<string, StatementFormat> = {
  discover: { label: 'Discover', parse: parseDiscoverRows, brands: ['discover'] },
  chase: { label: 'Chase', parse: parseChaseRows, brands: ['chase'] },
  apple: { label: 'Apple Card', parse: parseAppleCardRows, brands: ['apple', 'apple card'] },
};

// The parser key to run automatically for an account: the one picked on the
// account, else the one matching its brand, else null
export function formatKeyForAccount(account: Pick<Account, 'statement_parser' | 'brand'> | null | undefined): string | null {
  if (!account) return null;
  if (account.statement_parser && STATEMENT_FORMATS[account.statement_parser]) return account.statement_parser;
  const b = account.brand?.trim().toLowerCase();
  if (!b) return null;
  return Object.keys(STATEMENT_FORMATS).find((key) => STATEMENT_FORMATS[key].brands.includes(b)) ?? null;
}

// The format for an account's brand ("Discover" → discover), or null
export function formatForBrand(brand: string | null | undefined): StatementFormat | null {
  const b = brand?.trim().toLowerCase();
  if (!b) return null;
  return Object.values(STATEMENT_FORMATS).find((f) => f.brands.includes(b)) ?? null;
}
