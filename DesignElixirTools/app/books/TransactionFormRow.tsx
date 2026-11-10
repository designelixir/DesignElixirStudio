'use client';

import React, { useState, useRef, FormEvent, ChangeEvent } from 'react';
import Image from 'next/image';
import { Account, ExpenseCategory, Statement, Transaction } from '@/types/globalTypes';
import {
  createTransactionAction,
  updateTransactionAction,
  deleteTransactionAction,
} from '@/app/actions/transactionActions';
import Toggle from '@/app/components/Toggle';
import CategorySelect from './categories/CategorySelect';
import TagInput from './TagInput';
import ReceiptButton from './ReceiptButton';
import { RECEIPT_ACCEPT, receiptFileProblem, uploadReceipt } from './receipts';
import { removeReceiptAction } from '@/app/actions/receiptActions';

type TransactionFormRowProps = {
  columnCount: number;
  leadingCell?: React.ReactNode; // e.g. an empty cell under the table's checkbox column
  categories: ExpenseCategory[];
  companiesListId: string; // <datalist> of company names to search
  tagsListId: string;      // <datalist> of tags already used
  // Opens the add-category popup; `select` picks the new category in this row
  onAddCategory: (typedTitle: string, select: (categoryId: string) => void) => void;
  onSaved: () => void; // after adding, saving or deleting
} & (
  | {
      // Add a new transaction (row at the top of the table)
      mode: 'add';
      accounts: Account[];     // for the Account dropdown
      statements: Statement[]; // for the Statement dropdown (filtered by account)
    }
  | {
      // Edit a saved transaction
      mode: 'edit';
      transaction: Transaction;
      readOnlyCells?: React.ReactNode; // Account / Statement cells, shown as-is
      onCancel: () => void;
    }
);

const inputStyle = { width: '100%', minWidth: '90px' };

// Local YYYY-MM-DD (today, or of a stored timestamp)
function localDay(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const emptyForm = () => ({
  account_id: '',
  statement_id: '',
  date: localDay(),
  statement_descriptor: '',
  company: '',
  description: '',
  expense_category_id: '',
  purchase: true,
  work_expense: false,
  cost: '',
  reconciled: '', // '' = nothing reconciled
  tags: [] as string[],
});

// One editable transaction row, used both to add a new transaction and to
// edit a saved one.
export default function TransactionFormRow(props: TransactionFormRowProps) {
  const { columnCount, categories, companiesListId, tagsListId, onAddCategory, onSaved } = props;
  const t = props.mode === 'edit' ? props.transaction : null;

  const [formData, setFormData] = useState(() =>
    t
      ? {
          ...emptyForm(),
          account_id: t.account_id,
          statement_id: t.statement_id ?? '',
          date: localDay(t.date),
          statement_descriptor: t.statement_descriptor ?? '',
          company: t.company ?? '',
          description: t.description ?? '',
          expense_category_id: t.expense_category_id ?? '',
          purchase: t.purchase,
          work_expense: t.work_expense,
          cost: Number(t.cost).toFixed(2),
          reconciled: Number(t.reconciled ?? 0) > 0 ? Number(t.reconciled).toFixed(2) : '',
          tags: t.tags ?? [],
        }
      : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Receipt: a new file to upload on save, or a request to remove the saved one
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const hasSavedReceipt = !!t?.receipt_path && !removeReceipt;

  const handleReceiptChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    e.target.value = ''; // let the same file be picked again
    if (!chosen) return;
    const problem = receiptFileProblem(chosen);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setReceiptFile(chosen);
    setRemoveReceipt(false);
  };

  // After the transaction itself is saved: upload / remove its receipt.
  // Returns an error message rather than throwing, since the transaction did save.
  const saveReceipt = async (transactionId: string) => {
    try {
      if (receiptFile) await uploadReceipt(transactionId, receiptFile);
      else if (removeReceipt && t?.receipt_path) await removeReceiptAction(transactionId);
      return '';
    } catch (err) {
      console.error('Error saving receipt:', err);
      return `Transaction saved, but the receipt didn't: ${err instanceof Error ? err.message : 'upload failed'}`;
    }
  };

  const set = (field: keyof ReturnType<typeof emptyForm>, value: string | boolean | string[]) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // Fields both modes save
  const fields = () => ({
    // Store at local noon so the day doesn't shift when converted to UTC
    date: new Date(`${formData.date}T12:00:00`).toISOString(),
    statement_descriptor: formData.statement_descriptor.trim() || null,
    company: formData.company.trim() || null,
    description: formData.description.trim() || null,
    expense_category_id: formData.expense_category_id || null,
    purchase: formData.purchase,
    work_expense: formData.work_expense,
    cost: Number(formData.cost),
    reconciled: formData.reconciled === '' || Number(formData.reconciled) === 0 ? null : Number(formData.reconciled),
    tags: formData.tags,
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.reconciled !== '' && Number(formData.reconciled) > Number(formData.cost)) {
      setError('Reconciled can’t be more than the cost.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let receiptError = '';
      if (t) {
        await updateTransactionAction(t.id, fields());
        receiptError = await saveReceipt(t.id);
      } else {
        const created = await createTransactionAction({
          ...fields(),
          account_id: formData.account_id,
          statement_id: formData.statement_id || null,
          expense_category: null,
        });
        receiptError = await saveReceipt(created.id);
        setReceiptFile(null);
        // Keep account, statement and date so several lines from one statement
        // can be entered in a row; clear the rest
        setFormData((prev) => ({
          ...emptyForm(),
          account_id: prev.account_id,
          statement_id: prev.statement_id,
          date: prev.date,
        }));
      }
      if (receiptError) {
        // Stay open (edit mode) so the message can be read; the row still reloads
        setError(receiptError);
        if (!t) onSaved();
        return;
      }
      onSaved();
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!t) return;
    const label = [t.company, t.statement_descriptor].filter(Boolean).join(' – ') || 'this transaction';
    const amount = Number(t.cost).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    if (!window.confirm(`Delete ${label} (${amount})? This can't be undone.`)) return;
    setSaving(true);
    setError('');
    try {
      await deleteTransactionAction(t.id);
      onSaved();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
      setSaving(false);
    }
  };

  // <form> can't sit inside a <tr>, so each input joins it via the `form` attribute.
  // That keeps native `required` checks and lets Enter in any field submit the row.
  const f = t ? `edit-transaction-${t.id}` : 'add-transaction-form';

  return (
    <>
      <tr className={formData.purchase ? 'purchase' : 'payment'}>
        {props.leadingCell}
        <td>
          <form id={f} onSubmit={handleSubmit} />
          <input form={f} type='date' required style={inputStyle}
            value={formData.date} onChange={(e) => set('date', e.target.value)} />
        </td>

        {props.mode === 'edit' ? (
          props.readOnlyCells
        ) : (
          <td>
            <select form={f} required style={inputStyle}
              value={formData.account_id}
              // A statement belongs to one account, so switching account clears it
              onChange={(e) => setFormData((prev) => ({ ...prev, account_id: e.target.value, statement_id: '' }))}>
              <option value='' disabled>{props.accounts.length ? 'Account' : 'No accounts'}</option>
              {props.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.brand ? `${a.brand} ${a.name}` : a.name}</option>
              ))}
            </select>
            <select form={f} style={{ ...inputStyle, marginTop: '5px' }} disabled={!formData.account_id}
              value={formData.statement_id} onChange={(e) => set('statement_id', e.target.value)}>
              <option value=''>No statement</option>
              {props.statements
                .filter((s) => s.account_id === formData.account_id)
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.name || s.file_name}</option>
                ))}
            </select>
          </td>
        )}

        <td>
          <input form={f} type='text' placeholder='Company' style={{ ...inputStyle, minWidth: '200px' }}
            list={companiesListId} autoComplete='off'
            value={formData.company} onChange={(e) => set('company', e.target.value)} />
          <input form={f} type='text' placeholder='Description' style={{ ...inputStyle, marginTop: '5px' }}
            value={formData.description} onChange={(e) => set('description', e.target.value)} />
          <input form={f} type='text' placeholder='Descriptor' style={{ ...inputStyle, marginTop: '5px' }}
            value={formData.statement_descriptor} onChange={(e) => set('statement_descriptor', e.target.value)} />
          
          <input ref={receiptInputRef} type='file' accept={RECEIPT_ACCEPT} style={{ display: 'none' }}
            onChange={handleReceiptChosen} />
          <div className='flex-center-start flex-wrap' style={{ gap: '6px', marginTop: '5px', fontSize: '11px' }}>
            {receiptFile ? (
              <span className='transaction-tag' title='Uploads when you save'>
                📎 {receiptFile.name}
                <button type='button' onClick={() => setReceiptFile(null)} aria-label='Remove chosen receipt'>×</button>
              </span>
            ) : hasSavedReceipt ? (
              <>
                <ReceiptButton path={t!.receipt_path!} fileName={t!.receipt_file_name} />
                <span style={{ color: '#666' }}>{t!.receipt_file_name ?? 'Receipt'}</span>
                <button type='button' className='system-button tiny-button' onClick={() => receiptInputRef.current?.click()}>
                  Replace
                </button>
                <button type='button' className='system-button tiny-button' onClick={() => setRemoveReceipt(true)}>
                  Remove
                </button>
              </>
            ) : (
              <>
                <button type='button' className='system-button tiny-button' onClick={() => receiptInputRef.current?.click()}>
                  + Receipt
                </button>
                {removeReceipt && (
                  <span style={{ color: '#999' }}>
                    Receipt removed on save ·{' '}
                    <button type='button' className='system-button tiny-button' onClick={() => setRemoveReceipt(false)}>
                      Undo
                    </button>
                  </span>
                )}
              </>
            )}
          </div>
        </td>
        <td>
          <div style={{ maxWidth: '160px' }}>
            <CategorySelect
              categories={categories}
              value={formData.expense_category_id}
              onChange={(id) => set('expense_category_id', id)}
              onAddCategory={(title) => onAddCategory(title, (id) => set('expense_category_id', id))}
              placeholder={t?.expense_category ? `Bank: ${t.expense_category}` : 'Search categories'}
            />
            <TagInput form={f} suggestionsListId={tagsListId} style={{ marginTop: '5px' }}
            value={formData.tags} onChange={(tags) => set('tags', tags)} />
          </div>
        </td>
        <td>
          <Toggle form={f} label='Work' offLabel='Personal' ariaLabel='Work expense'
            checked={formData.work_expense} onChange={(v) => set('work_expense', v)} />
          <div style={{ marginTop: '5px' }}>
            <Toggle form={f} label='Purchase' offLabel='Payment' ariaLabel='Purchase'
              checked={formData.purchase} onChange={(v) => set('purchase', v)} />
          </div>
        </td>
        <td>
          <input form={f} type='number' step='0.01' min='0' required placeholder='0.00'
            style={{ ...inputStyle, maxWidth: '50px', textAlign: 'right' }}
            value={formData.cost} onChange={(e) => set('cost', e.target.value)} />
          <input form={f} type='number' step='0.01' min='0' placeholder='Reconciled'
            title='Amount paid back — spending counts the cost minus this'
            aria-label='Reconciled amount'
            style={{ ...inputStyle, maxWidth: '50px', textAlign: 'right', marginTop: '5px' }}
            value={formData.reconciled} onChange={(e) => set('reconciled', e.target.value)} />
        </td>
        <td className='flex-center-center'>
          {props.mode === 'edit' ? (
            <>
              <button form={f} className='icon-button' type='submit' disabled={saving} title='Save' aria-label='Save transaction'>
                <Image src='/save.svg' alt='save icon' width={16} height={16} style={saving ? { opacity: 0.5 } : undefined} />
              </button>
              <button type='button' className='icon-button' title='Delete transaction' aria-label='Delete transaction'
                onClick={handleDelete} disabled={saving}>
                <Image src='/trash.svg' alt='delete icon' width={16} height={16} />
              </button>
              <button className='system-button tiny-button' type='button' onClick={props.onCancel} disabled={saving}
                style={{ marginTop: '-4px', border: 'unset' }} title='Cancel' aria-label='Cancel editing'>
                x
              </button>
            </>
          ) : (
            <button form={f} className='system-button tiny-button' type='submit' disabled={saving}
              title='Add transaction' aria-label='Add transaction' style={{ border: 'unset' }}>
              {saving ? '…' : '+'}
            </button>
          )}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={columnCount} style={{ color: 'red' }}>{error}</td>
        </tr>
      )}
    </>
  );
}
