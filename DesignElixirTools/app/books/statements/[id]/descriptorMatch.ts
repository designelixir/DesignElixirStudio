import type { DescriptorHistoryRow } from '@/app/actions/transactionActions';

export interface DescriptorSuggestion {
  company: string | null;
  categoryId: string | null;
  workExpense: boolean | null; // null = no opinion
}

// Bank descriptors vary line to line ("SQ *BLUE BOTTLE 0423 OAKLAND CA",
// "BLUE BOTTLE #12 OAKLAND CA APPLE PAY ENDING IN 3602"), so compare a cleaned-up
// version: uppercase, no Apple Pay suffix, no payment-processor prefix, no digits
// or punctuation, no one-letter words.
export function descriptorWords(descriptor: string): string[] {
  return descriptor
    .toUpperCase()
    .replace(/APPLE PAY ENDING IN \d+/g, ' ')
    .replace(/^\s*(SQ|TST|SP|PY|PP|DD|IC|PAYPAL|GOOGLE|GGL)\s*\*\s*/, '')
    .replace(/[^A-Z ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

// Builds a lookup from past transactions (newest first). For a parsed line it
// returns the company and category last used on a line with the same cleaned
// descriptor, or failing that, the same first two words (e.g. "BLUE BOTTLE").
export function buildDescriptorMatcher(history: DescriptorHistoryRow[], validCategoryIds: Set<string>) {
  const exact = new Map<string, DescriptorSuggestion>();
  const prefix = new Map<string, DescriptorSuggestion>();

  // Newest wins: only fill a field the first time it's seen for a key
  const remember = (map: Map<string, DescriptorSuggestion>, key: string, row: DescriptorHistoryRow) => {
    const s = map.get(key) ?? { company: null, categoryId: null, workExpense: null };
    if (!s.company && row.company?.trim()) s.company = row.company.trim();
    // Whether you marked the most recent similar line as a work expense
    if (s.workExpense === null && typeof row.work_expense === 'boolean') s.workExpense = row.work_expense;
    if (!s.categoryId && row.expense_category_id && validCategoryIds.has(row.expense_category_id)) {
      s.categoryId = row.expense_category_id;
    }
    map.set(key, s);
  };

  for (const row of history) {
    const words = descriptorWords(row.statement_descriptor);
    if (words.length === 0) continue;
    remember(exact, words.join(' '), row);
    const p = prefixKey(words);
    if (p) remember(prefix, p, row);
  }

  return (descriptor: string): DescriptorSuggestion | null => {
    const words = descriptorWords(descriptor);
    if (words.length === 0) return null;
    const full = exact.get(words.join(' '));
    const p = prefixKey(words);
    const partial = p ? prefix.get(p) : undefined;
    // An exact match's empty field can still be filled from the looser match
    const company = full?.company ?? partial?.company ?? null;
    const categoryId = full?.categoryId ?? partial?.categoryId ?? null;
    const workExpense = full?.workExpense ?? partial?.workExpense ?? null;
    return company || categoryId || workExpense !== null ? { company, categoryId, workExpense } : null;
  };
}

// First two words, when they're distinctive enough to match on
function prefixKey(words: string[]): string | null {
  if (words.length < 2 || words[0].length < 3) return null;
  return `${words[0]} ${words[1]}`;
}

// Finds the statement company (statement_companies) a descriptor belongs to:
// one of its saved descriptors cleaned the same way, else the same first two words
export function buildCompanyMatcher<C extends { descriptors: string[] }>(companies: C[]) {
  const exact = new Map<string, C>();
  const prefix = new Map<string, C>();
  for (const c of companies) {
    for (const d of c.descriptors) {
      const words = descriptorWords(d);
      if (words.length === 0) continue;
      if (!exact.has(words.join(' '))) exact.set(words.join(' '), c);
      const p = prefixKey(words);
      if (p && !prefix.has(p)) prefix.set(p, c);
    }
  }
  return (descriptor: string): C | null => {
    const words = descriptorWords(descriptor);
    if (words.length === 0) return null;
    const p = prefixKey(words);
    return exact.get(words.join(' ')) ?? (p ? prefix.get(p) : undefined) ?? null;
  };
}

// Phrases compare ignoring case, with any run of spaces counted as one space
const phraseText = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

// Does this statement descriptor contain the phrase?
export function descriptorHasPhrase(descriptor: string, phrase: string): boolean {
  const p = phraseText(phrase);
  return p.length > 0 && phraseText(descriptor).includes(p);
}

interface PhraseLike {
  phrase: string;
  default_category_id: string | null;
  default_work_expense: boolean | null;
}

// Finds the company phrase a descriptor contains. When several match, the
// longest (most specific) phrase wins.
export function buildPhraseMatcher<C extends { phrases?: PhraseLike[] | null }>(companies: C[]) {
  const entries = companies
    .flatMap((company) => (company.phrases ?? []).map((phrase) => ({ company, phrase, text: phraseText(phrase.phrase) })))
    .filter((e) => e.text.length > 0)
    .sort((a, b) => b.text.length - a.text.length);
  return (descriptor: string): { company: C; phrase: PhraseLike } | null => {
    const d = phraseText(descriptor);
    const hit = entries.find((e) => d.includes(e.text));
    return hit ? { company: hit.company, phrase: hit.phrase } : null;
  };
}
