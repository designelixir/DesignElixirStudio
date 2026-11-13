'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import { createTransactionAction } from '@/app/actions/transactionActions';
import { ParsedTransaction } from './parserUtils';
import Toggle from '@/app/components/Toggle';
import CategorySelect from '../../categories/CategorySelect';
import CompanySelect from '../../CompanySelect';
import { DescriptorSuggestion } from './descriptorMatch';
import TagInput from '../../TagInput';
import { formatDay } from '../formatDay';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface ParsedTransactionRowProps {
  statement: Statement;
  parsed: ParsedTransaction;
  // Company / category / work expense from fixed rules or a similar past transaction
  suggestion?: DescriptorSuggestion | null;
  rowIndex: number;
  alreadyAdded: Transaction | null; // the saved transaction, if this line is already in the database
  tagsListId: string; // <datalist> of tags already used
  companyOptions: string[]; // company names to search
  categories: ExpenseCategory[];
  // Opens the add-category popup; `select` picks the new category in this row
  onAddCategory: (typedTitle: string, select: (categoryId: string) => void) => void;
  onCompanyChange: (rowIndex: number, company: string) => void;
  onAdded: () => void;
  // For "Add all": the row reports whether it has a company and category, and
  // hands over a function that saves it (resolves true if it saved)
  onReadyChange?: (rowIndex: number, ready: boolean) => void;
  registerSave?: (rowIndex: number, save: (() => Promise<boolean>) | null) => void;
}

const inputStyle = { width: '100%', minWidth: '90px' };

// One parsed line from the PDF. Not yet added: company, description, category,
// tags, type, work and cost are editable (date and descriptor come from the PDF),
// with + to save it. Already added: shown read-only, as saved.
export default function ParsedTransactionRow({
  statement,
  parsed,
  suggestion,
  rowIndex,
  alreadyAdded,
  tagsListId,
  companyOptions,
  onCompanyChange,
  categories,
  onAddCategory,
  onAdded,
  onReadyChange,
  registerSave,
}: ParsedTransactionRowProps) {
  const [formData, setFormData] = useState(() => ({
    date: parsed.date,
    statement_descriptor: parsed.details ? `${parsed.descriptor} ${parsed.details}` : parsed.descriptor,
    // From a past transaction with a similar descriptor, if any
    company: suggestion?.company ?? '',
    description: '',
    // What you picked last time for a similar line; else your category whose
    // title matches the bank's (e.g. "Restaurants")
    expense_category_id:
      suggestion?.categoryId ??
      categories.find((c) => c.title.trim().toLowerCase() === parsed.category?.trim().toLowerCase())?.id ??
      '',
    // Statements print purchases positive and payments/credits negative;
    // the table keeps cost positive and uses `purchase` for the direction.
    purchase: parsed.amount > 0,
    // From a rule (e.g. Adobe is always work) or how you marked a similar line before
    work_expense: suggestion?.workExpense ?? false,
    cost: Math.abs(parsed.amount).toFixed(2),
    tags: [] as string[],
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

  const done = added || !!alreadyAdded;
  const set = (field: keyof typeof formData, value: string | boolean | string[]) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const outsidePeriod =
    (statement.period_start && formData.date < statement.period_start) ||
    (statement.period_end && formData.date > statement.period_end);

  // Saves the row; true if it worked (errors show on the row)
  const save = async (): Promise<boolean> => {
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
        tags: formData.tags,
      });
      setAdded(true);
      return true;
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (await save()) onAdded();
  };

  // "Add all" support: keep the latest save() reachable, and report readiness
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    registerSave?.(rowIndex, () => saveRef.current());
    return () => registerSave?.(rowIndex, null);
  }, [rowIndex, registerSave]);
  const ready =
    !done && !saving && !!formData.company.trim() && !!formData.expense_category_id &&
    formData.cost !== '' && Number(formData.cost) > 0;
  useEffect(() => {
    onReadyChange?.(rowIndex, ready);
    return () => onReadyChange?.(rowIndex, false);
  }, [rowIndex, ready, onReadyChange]);

  // <form> can't sit inside a <tr>, so each input joins it via the `form` attribute
  const f = `parsed-transaction-${rowIndex}`;

  const descriptor = alreadyAdded ? alreadyAdded.statement_descriptor ?? '' : formData.statement_descriptor;
  const dateCell = (
    <td style={{ whiteSpace: 'nowrap', color: outsidePeriod && !done ? '#b35c00' : undefined }}
      title={outsidePeriod && !done ? 'Outside the statement’s date range' : undefined}>
      {formatDay(alreadyAdded ? localDay(alreadyAdded.date) : formData.date)}
    </td>
  );
  const descriptorCell = (
    <td style={{ minWidth: '200px', fontSize: '12px' }}>
      {descriptor || '—'}  
    </td>
  );

  // Already added: read-only, showing what was saved (or what was just submitted)
  if (done) {
    const saved = alreadyAdded
      ? {
          company: alreadyAdded.company ?? '',
          description: alreadyAdded.description ?? '',
          expense_category_id: alreadyAdded.expense_category_id ?? '',
          tags: alreadyAdded.tags ?? [],
          purchase: alreadyAdded.purchase,
          work_expense: alreadyAdded.work_expense,
          cost: Number(alreadyAdded.cost),
        }
      : { ...formData, cost: Number(formData.cost) };
    const category = categories.find((c) => c.id === saved.expense_category_id);
    return (
      <tr style={{ color: '#777' }}>
        {dateCell}
        {descriptorCell}
        <td>{saved.company || '—'}</td>
        <td>{saved.description || '—'}</td>
        <td>
          {category ? (
            <div className='category-tag flex-center-start no-flex-grow' style={{ gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: category.color ?? '#ccc', flex: 'none' }} />
              <p>{category.title}</p>
            </div>
          ) : (
            '—'
          )}
        </td>
        <td>{saved.tags.length > 0 && (
            <div className='flex-center-start flex-wrap' style={{ gap: '4px', marginTop: '4px', maxWidth: '200px' }}>
              {saved.tags.map((tag) => <span key={tag} className='transaction-tag'>{tag}</span>)}
            </div>
          )}</td>
        <td>{saved.purchase ? 'Purchase' : 'Credit'}</td>
        <td>{saved.work_expense ? 'Yes' : 'No'}</td>
        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{currency.format(saved.cost)}</td>
        <td style={{ whiteSpace: 'nowrap', color: 'green' }}>✓ Added</td>
      </tr>
    );
  }

  return (
    <>
      <tr>
        {dateCell}
        {descriptorCell}
        <td>
          <form id={f} onSubmit={handleSubmit} />
          <CompanySelect
            options={companyOptions}
            value={formData.company}
            onChange={(company) => {
              set('company', company);
              onCompanyChange(rowIndex, company);
            }}
          />
        </td>
        <td>
          <input form={f} type='text' placeholder='Description' style={inputStyle}
            value={formData.description} onChange={(e) => set('description', e.target.value)} />
        </td>
        <td>
          <div style={{ maxWidth: '160px' }}>
            <CategorySelect
              categories={categories}
              value={formData.expense_category_id}
              onChange={(id) => set('expense_category_id', id)}
              onAddCategory={(title) => onAddCategory(title, (id) => set('expense_category_id', id))}
              placeholder={parsed.category ? `Bank: ${parsed.category}` : 'Search categories'}
            />
          </div>
        </td>
        <td>
          <TagInput form={f} suggestionsListId={tagsListId} style={{ minWidth: '120px', maxWidth: '200px' }}
            value={formData.tags} onChange={(tags) => set('tags', tags)} />
        </td>
        <td>
          <Toggle form={f} label='Purchase' offLabel='Credit' ariaLabel='Purchase'
            checked={formData.purchase} onChange={(v) => set('purchase', v)} />
        </td>
        <td>
          <Toggle form={f} label='Yes' offLabel='No' ariaLabel='Work expense'
            checked={formData.work_expense} onChange={(v) => set('work_expense', v)} />
        </td>
        <td>
          {editingCost ? (
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
              tabIndex={0}
              title='Click to edit'
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
                cursor: 'pointer',
                padding: '10px 4px',
                borderBottom: '1px dashed #bbb',
              }}
            >
              {currency.format(Number(formData.cost) || 0)}
            </span>
          )}
        </td>
        <td style={{ whiteSpace: 'nowrap' }}>
          <button form={f} type='submit' disabled={saving} aria-label='Add transaction'>
            {saving ? '…' : '+'}
          </button>
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={10} style={{ color: 'red' }}>{error}</td>
        </tr>
      )}
    </>
  );
}

// Local YYYY-MM-DD of a stored timestamp
function localDay(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
