import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { localDay } from './TransactionFilters';
import { netCost } from './transactionAmounts';

function csvCell(value: string | number | null | undefined) {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Downloads the given transactions (oldest first) as a CSV file
export function exportTransactionsCsv(
  transactions: Transaction[],
  { accounts, statements, categories }: { accounts: Account[]; statements: Statement[]; categories: ExpenseCategory[] }
) {
  const header = [
    'Date', 'Account', 'Statement', 'Company', 'Description', 'Statement Descriptor',
    'Expense Category', 'Bank Category', 'Tags', 'Type', 'Work Expense', 'Amount', 'Reconciled', 'Net Amount',
  ];
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => {
      const s = statements.find((x) => x.id === t.statement_id);
      const cost = Number(t.cost);
      return [
        localDay(t.date),
        accounts.find((a) => a.id === t.account_id)?.name,
        s ? s.name || s.file_name : '',
        t.company,
        t.description,
        t.statement_descriptor,
        categories.find((c) => c.id === t.expense_category_id)?.title,
        t.expense_category,
        (t.tags ?? []).join('; '),
        t.purchase ? 'Purchase' : 'Payment',
        t.work_expense ? 'Yes' : 'No',
        (t.purchase ? -cost : cost).toFixed(2),
        Number(t.reconciled ?? 0) > 0 ? Number(t.reconciled).toFixed(2) : '',
        (t.purchase ? -netCost(t) : netCost(t)).toFixed(2),
      ];
    });

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${localDay(new Date().toISOString())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
