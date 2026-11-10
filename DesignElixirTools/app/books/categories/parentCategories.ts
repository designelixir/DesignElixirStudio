import type { ParentCategory } from '@/types/globalTypes';

// The fixed parent groups an expense category can sit under, in display order.
// Keep in sync with the check constraint in the expense_categories_parent migration.
// `color` is used for the parent's card and pie slice.
export const PARENT_CATEGORIES: { value: ParentCategory; label: string; color: string }[] = [
  { value: 'automotive', label: 'Automotive', color: '#4e79a7' },
  { value: 'home_improvement', label: 'Home Improvement', color: '#f28e2b' },
  { value: 'medical', label: 'Medical', color: '#e15759' },
  { value: 'stuff', label: 'Stuff', color: '#76b7b2' },
  { value: 'food', label: 'Food', color: '#59a14f' },
  { value: 'services', label: 'Services', color: '#edc948' },
  { value: 'entertainment', label: 'Entertainment', color: '#b07aa1' },
  { value: 'payments', label: 'Payments', color: '#3a9d4f' },
  { value: 'misc', label: 'Misc', color: '#9c755f' },
];

export function parentCategoryLabel(value: ParentCategory | null | undefined) {
  return PARENT_CATEGORIES.find((p) => p.value === value)?.label ?? null;
}
