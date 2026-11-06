'use client';

import { useState, FormEvent } from 'react';
import { ExpenseCategory, Statement } from '@/types/globalTypes';
import { createTransactionAction } from '@/app/actions/transactionActions';
import { ParsedTransaction } from './parserUtils';
import Toggle from '@/app/components/Toggle';
import CategorySelect from '../../categories/CategorySelect';
import CompanySelect from '../../CompanySelect';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface ParsedTransactionRowProps {
  statement: Statement;
  parsed: ParsedTransaction;
  rowIndex: number;
  alreadyAdded: boolean; // already in the database for this statement
  companyOptions: string[]; // company names to search
  categories: ExpenseCategory[];
  // Opens the add-category popup; `select` picks the new category in this row
  onAddCategory: (typedTitle: string, select: (categoryId: string) => void) => void;
  onCompanyChange: (rowIndex: number, company: string) => void;
  onAdded: () => void;
}

const inputStyle = { width: '100%', minWidth: '90px' };

// One parsed line from the PDF as editable fields, with + to save it.
export default function ParsedTransactionRow({
  statement,
  parsed,
  rowIndex,
  alreadyAdded,
  companyOptions,
  onCompanyChange,
  categories,
  onAddCategory,
  onAdded,
}: ParsedTransactionRowProps) {
  const [formData, setFormData] = useState(() => ({
    date: parsed.date,
    statement_descriptor: parsed.details ? `${parsed.descriptor} ${parsed.details}` : parsed.descriptor,
    company: '',
    description: '',
    // Pre-select your category if its title matches the bank's (e.g. "Restaurants")
    expense_category_id:
      categories.find((c) => c.title.trim().toLowerCase() === parsed.category?.trim().toLowerCase())?.id ?? '',
    // Statements print purchases positive and payments/credits negative;
    // the table keeps cost positive and uses `purchase` for the direction.
    purchase: parsed.amount > 0,
    work_expense: false,
    cost: Math.abs(parsed.amount).toFixed(2),
  }));
  const [saving, setSaving] = useState(false);
  // Cost shows as text until clicked
  const [editingCost, setEditingCost] = useState(false);
  const [lastGoodCost, setLastGoodCost] = useState('');
  const startEditingCost = () => {
    if (alreadyAdded || added) return;
    setLastGoodCost(formData.cost);
    setEditingCost(true);
  };
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  const done = added || alreadyAdded;
  const set = (field: keyof typeof formData, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const outsidePeriod =
    (statement.period_start && formData.date < statement.period_start) ||
    (statement.period_end && formData.date > statement.period_end);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createTransactionAction({
        account_id: statement.account_id,
        statement_id: statement.id,
        // Store at local noon so the day doesn't shift when converted to UTC
        date: new Date(`${formData.date}T12:00:00`).toISOString(),
        statement_descriptor: formData.statement_descriptor.trim() || null,
        company: formData.company.trim() || null,
        description: formData.description.trim() || null,
        expense_category: parsed.category, // the bank's category, kept for reference
        expense_category_id: formData.expense_category_id || null,
        purchase: formData.purchase,
        work_expense: formData.work_expense,
        cost: Number(formData.cost),
      });
      setAdded(true);
      onAdded();
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
    } finally {
      setSaving(false);
    }
  };

  // <form> can't sit inside a <tr>, so each input joins it via the `form` attribute
  const f = `parsed-transaction-${rowIndex}`;

  return (
    <>
      <tr style={{ opacity: done ? 0.45 : 1 }}>
        <td>
          <form id={f} onSubmit={handleSubmit} />
          <input form={f} type='date' required disabled={done}
            style={{ ...inputStyle, color: outsidePeriod ? '#b35c00' : undefined }}
            title={outsidePeriod ? 'Outside the statement’s date range' : undefined}
            value={formData.date} onChange={(e) => set('date', e.target.value)} />
        </td>
        <td>
          <input form={f} type='text' disabled={done} style={{ ...inputStyle, minWidth: '200px' }}
            value={formData.statement_descriptor} onChange={(e) => set('statement_descriptor', e.target.value)} />
        </td>
        <td>
          <CompanySelect
            options={companyOptions}
            disabled={done}
            value={formData.company}
            onChange={(company) => {
              set('company', company);
              onCompanyChange(rowIndex, company);
            }}
          />
        </td>
        <td>
          <input form={f} type='text' placeholder='Description' disabled={done} style={inputStyle}
            value={formData.description} onChange={(e) => set('description', e.target.value)} />
        </td>
        <td>
          <CategorySelect
            categories={categories}
            disabled={done}
            value={formData.expense_category_id}
            onChange={(id) => set('expense_category_id', id)}
            onAddCategory={(title) => onAddCategory(title, (id) => set('expense_category_id', id))}
            placeholder={parsed.category ? `Bank: ${parsed.category}` : 'Search categories'}
          />
        </td>
        <td>
          <Toggle form={f} disabled={done} label='Purchase' offLabel='Credit' ariaLabel='Purchase'
            checked={formData.purchase} onChange={(v) => set('purchase', v)} />
        </td>
        <td>
          <Toggle form={f} disabled={done} label='Yes' offLabel='No' ariaLabel='Work expense'
            checked={formData.work_expense} onChange={(v) => set('work_expense', v)} />
        </td>
        <td>
          {editingCost && !done ? (
            <input form={f} type='number' step='0.01' min='0' required autoFocus
              style={{ ...inputStyle, textAlign: 'right' }}
              value={formData.cost}
              onChange={(e) => set('cost', e.target.value)}
              onBlur={() => {
                // Empty or invalid? Put the last good amount back
                if (formData.cost === '' || Number.isNaN(Number(formData.cost))) set('cost', lastGoodCost);
                else set('cost', Number(formData.cost).toFixed(2));
                setEditingCost(false);
              }} />
          ) : (
            <span
              role='button'
              tabIndex={done ? -1 : 0}
              title={done ? undefined : 'Click to edit'}
              onClick={() => startEditingCost()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  startEditingCost();
                }
              }}
              style={{
                display: 'block',
                textAlign: 'right',
                whiteSpace: 'nowrap',
                cursor: done ? 'default' : 'pointer',
                padding: '10px 4px',
                borderBottom: done ? undefined : '1px dashed #bbb',
              }}
            >
              {currency.format(Number(formData.cost) || 0)}
            </span>
          )}
        </td>
        <td style={{ whiteSpace: 'nowrap' }}>
          {done ? (
            <span style={{ color: 'green' }}>✓ Added</span>
          ) : (
            <button form={f} type='submit' disabled={saving} aria-label='Add transaction'>
              {saving ? '…' : '+'}
            </button>
          )}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={9} style={{ color: 'red' }}>{error}</td>
        </tr>
      )}
    </>
  );
}
