import type { ExpenseCategory, Transaction } from '@/types/globalTypes';
import { netCost } from '../transactionAmounts';

export interface CategoryTotal {
  spent: number;      // purchases minus credits/returns in this category
  writeOff: number;   // spent × the category's write-off %
  count: number;      // transactions counted
}

export interface CategoryTotals {
  byCategory: Map<string, CategoryTotal>;
  // Purchases with no category picked (payments aren't counted as spending)
  uncategorized: { spent: number; count: number };
  // Sum of categories that come out as spending, plus uncategorized purchases.
  // Categories that net negative (e.g. a "Payments" or "Cashback" category) are
  // money coming in, so they're left out rather than subtracted.
  totalSpent: number;
  totalCredits: number; // those negative categories, as a positive number
  totalWriteOff: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function computeCategoryTotals(transactions: Transaction[], categories: ExpenseCategory[]): CategoryTotals {
  const byCategory = new Map<string, CategoryTotal>();
  for (const c of categories) byCategory.set(c.id, { spent: 0, writeOff: 0, count: 0 });
  const uncategorized = { spent: 0, count: 0 };

  for (const t of transactions) {
    const cost = netCost(t); // minus anything reconciled
    const total = t.expense_category_id ? byCategory.get(t.expense_category_id) : undefined;
    if (total) {
      // A credit or return in a category reduces what was spent there
      total.spent += t.purchase ? cost : -cost;
      total.count += 1;
    } else if (t.purchase) {
      // Uncategorized (or pointing at a deleted category): only purchases count;
      // card payments aren't spending
      uncategorized.spent += cost;
      uncategorized.count += 1;
    }
  }

  let totalSpent = uncategorized.spent;
  let totalCredits = 0;
  let totalWriteOff = 0;
  for (const c of categories) {
    const total = byCategory.get(c.id)!;
    total.spent = round(total.spent);
    total.writeOff = round(Math.max(total.spent, 0) * (Number(c.percent_writeoff) / 100));
    if (total.spent >= 0) totalSpent += total.spent;
    else totalCredits += -total.spent;
    totalWriteOff += total.writeOff;
  }
  uncategorized.spent = round(uncategorized.spent);

  return {
    byCategory,
    uncategorized,
    totalSpent: round(totalSpent),
    totalCredits: round(totalCredits),
    totalWriteOff: round(totalWriteOff),
  };
}

// ---- Pie slices ----------------------------------------------------------

// Slices shown before the rest fold into "Other" (more than this gets unreadable)
export const PIE_SLICES = 6;
export const OTHER_COLOR = '#c4c4c4';
export const UNCATEGORIZED_KEY = 'uncategorized';

export interface SpendSlice {
  key: string; // category id, UNCATEGORIZED_KEY, or 'other'
  label: string;
  color: string;
  value: number;
  selectable: boolean;
  detail?: string;
}

// Categories that came out as spending (plus uncategorized), largest first;
// past the top PIE_SLICES the rest fold into one "Other" slice
export function buildSpendSlices(categories: ExpenseCategory[], totals: CategoryTotals): SpendSlice[] {
  const parts: SpendSlice[] = categories
    .map((c) => ({
      key: c.id,
      label: c.title,
      color: c.color ?? '#999999',
      value: totals.byCategory.get(c.id)?.spent ?? 0,
      selectable: true,
    }))
    .filter((p) => p.value > 0);
  if (totals.uncategorized.spent > 0) {
    parts.push({ key: UNCATEGORIZED_KEY, label: 'Uncategorized', color: '#e6e6e6', value: totals.uncategorized.spent, selectable: true });
  }
  parts.sort((a, b) => b.value - a.value);
  if (parts.length <= PIE_SLICES + 1) return parts;
  const rest = parts.slice(PIE_SLICES);
  return [
    ...parts.slice(0, PIE_SLICES),
    {
      key: 'other',
      label: 'Other',
      color: OTHER_COLOR,
      value: round(rest.reduce((sum, p) => sum + p.value, 0)),
      selectable: false,
      detail: `${rest.length} categories`,
    },
  ];
}

// ---- Parent categories ---------------------------------------------------

// Key for categories that haven't been given a parent yet
export const NO_PARENT_KEY = 'no-parent';

export interface ParentTotal {
  spent: number;         // sum of its categories that came out as spending
  credits: number;       // its categories that netted negative, as a positive number
  writeOff: number;
  count: number;         // transactions in its categories
  categoryCount: number;
}

// Rolls each category's totals up into its parent (or NO_PARENT_KEY), using the
// same rule as the page total: negative categories are credits, not subtracted
export function computeParentTotals(categories: ExpenseCategory[], totals: CategoryTotals): Map<string, ParentTotal> {
  const byParent = new Map<string, ParentTotal>();
  for (const c of categories) {
    const key = c.parent_category ?? NO_PARENT_KEY;
    const p = byParent.get(key) ?? { spent: 0, credits: 0, writeOff: 0, count: 0, categoryCount: 0 };
    const t = totals.byCategory.get(c.id);
    if (t) {
      if (t.spent >= 0) p.spent += t.spent;
      else p.credits += -t.spent;
      p.writeOff += t.writeOff;
      p.count += t.count;
    }
    p.categoryCount += 1;
    byParent.set(key, p);
  }
  for (const p of byParent.values()) {
    p.spent = round(p.spent);
    p.credits = round(p.credits);
    p.writeOff = round(p.writeOff);
  }
  return byParent;
}

// One slice per parent (plus "No parent" and Uncategorized), largest first
export function buildParentSlices(
  parents: { key: string; label: string; color: string }[],
  parentTotals: Map<string, ParentTotal>,
  totals: CategoryTotals
): SpendSlice[] {
  const parts: SpendSlice[] = parents
    .map((p) => ({ ...p, value: parentTotals.get(p.key)?.spent ?? 0, selectable: true }))
    .filter((p) => p.value > 0);
  if (totals.uncategorized.spent > 0) {
    parts.push({ key: UNCATEGORIZED_KEY, label: 'Uncategorized', color: '#e6e6e6', value: totals.uncategorized.spent, selectable: true });
  }
  return parts.sort((a, b) => b.value - a.value);
}
