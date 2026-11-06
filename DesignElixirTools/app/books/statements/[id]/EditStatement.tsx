'use client';

import { useState, FormEvent } from 'react';
import { Account, Statement } from '@/types/globalTypes';
import { updateStatementAction } from '@/app/actions/statementActions';

interface EditStatementProps {
  statement: Statement;
  accounts: Account[];
  onSaved: () => void;
  onClose: () => void;
}

const toInput = (n: number | null) => (n === null ? '' : Number(n).toFixed(2));
const fromInput = (s: string) => (s.trim() === '' ? null : Number(s));

// Popup for editing a statement's details and balances. The opening balance
// (previous balance) of an account's first statement can be used as the
// account's opening balance.
export default function EditStatement({ statement, accounts, onSaved, onClose }: EditStatementProps) {
  const [formData, setFormData] = useState(() => ({
    name: statement.name ?? '',
    account_id: statement.account_id,
    period_start: statement.period_start ?? '',
    period_end: statement.period_end ?? '',
    previous_balance: toInput(statement.previous_balance),
    new_balance: toInput(statement.new_balance),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.period_start && formData.period_end && formData.period_start > formData.period_end) {
      setError('Start date must be on or before the end date.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateStatementAction(statement.id, {
        name: formData.name.trim() || null,
        account_id: formData.account_id,
        period_start: formData.period_start || null,
        period_end: formData.period_end || null,
        previous_balance: fromInput(formData.previous_balance),
        new_balance: fromInput(formData.new_balance),
      });
      onSaved();
    } catch (err) {
      console.error('Error saving statement:', err);
      setError(err instanceof Error ? err.message : 'Failed to save statement');
      setSaving(false);
    }
  };

  return (
    <div className='module-popup-container flex-center-center' onClick={onClose}>
      <div className='module-popup basic-padding br' onClick={(e) => e.stopPropagation()}>
        <div className='flex-center-spacebetween module-popup-header'>
          <h2>Edit Statement</h2>
          <button type='button' onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className='flex-start-start'>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Statement Name</label>
              <input
                type='text'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={statement.file_name}
              />
            </div>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Account *</label>
              <select
                required
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.brand ? `${a.brand} ${a.name}` : a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='flex-start-start'>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Start Date</label>
              <input
                type='date'
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
              />
            </div>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>End Date</label>
              <input
                type='date'
                min={formData.period_start || undefined}
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
              />
            </div>
          </div>

          <div className='flex-start-start'>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Opening balance ($)</label>
              <input
                type='number'
                step='0.01'
                value={formData.previous_balance}
                onChange={(e) => setFormData({ ...formData, previous_balance: e.target.value })}
                placeholder='Balance at the start'
              />
            </div>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Closing balance ($)</label>
              <input
                type='number'
                step='0.01'
                value={formData.new_balance}
                onChange={(e) => setFormData({ ...formData, new_balance: e.target.value })}
                placeholder='Balance at the end'
              />
            </div>
          </div>
          <p style={{ margin: '0 10px', color: '#666', fontSize: '12px', maxWidth: '460px' }}>
            For cards, what you owed. Statements that print these (“Previous Balance” / “New Balance”) fill them in
            when parsed; Account Activity exports don&apos;t, so enter them here. The first statement&apos;s opening
            balance can become the account&apos;s opening balance (Edit Account on the account page).
          </p>

          {error && <div style={{ color: 'red', margin: '10px' }}>{error}</div>}

          <button type='submit' disabled={saving} style={{ margin: '10px' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
