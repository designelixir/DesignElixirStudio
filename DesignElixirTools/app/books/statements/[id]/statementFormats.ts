import type { PdfRow } from './pdfText';
import type { ParsedTransaction, StatementPeriod, StatementSummary } from './parserUtils';
import { parseDiscoverRows, readDiscoverSummary } from './discoverParser';
import { parseChaseRows, readChaseSummary } from './chaseParser';
import { parseAppleCardRows, readAppleCardSummary } from './appleCardParser';

export interface StatementFormat {
  label: string;
  parse: (rows: PdfRow[], fallbackPeriod?: StatementPeriod) => ParsedTransaction[];
  summarize: (rows: PdfRow[]) => StatementSummary;
  // Account brands this format is for (lowercase), used to pick it automatically
  brands: string[];
}

export const STATEMENT_FORMATS: Record<string, StatementFormat> = {
  discover: { label: 'Discover', parse: parseDiscoverRows, summarize: readDiscoverSummary, brands: ['discover'] },
  chase: { label: 'Chase', parse: parseChaseRows, summarize: readChaseSummary, brands: ['chase'] },
  apple: { label: 'Apple Card', parse: parseAppleCardRows, summarize: readAppleCardSummary, brands: ['apple', 'apple card'] },
};

// The format for an account's brand ("Discover" → discover), or null
export function formatForBrand(brand: string | null | undefined): StatementFormat | null {
  const b = brand?.trim().toLowerCase();
  if (!b) return null;
  return Object.values(STATEMENT_FORMATS).find((f) => f.brands.includes(b)) ?? null;
}
