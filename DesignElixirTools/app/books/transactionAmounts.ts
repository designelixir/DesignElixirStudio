import type { Transaction } from '@/types/globalTypes';

// What a transaction counts as toward spending: its cost minus whatever was
// reconciled (paid back), never below zero. Account balances use the full cost.
export function netCost(t: Pick<Transaction, 'cost' | 'reconciled'>): number {
  const reconciled = Number(t.reconciled ?? 0);
  return Math.max(Number(t.cost) - (reconciled > 0 ? reconciled : 0), 0);
}

export function hasReconciled(t: Pick<Transaction, 'reconciled'>): boolean {
  return Number(t.reconciled ?? 0) > 0;
}
