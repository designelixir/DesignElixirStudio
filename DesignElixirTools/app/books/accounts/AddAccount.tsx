'use client';

import { useState, FormEvent } from 'react';
import { Account } from '@/types/globalTypes';
import { createAccountAction, updateAccountAction } from '@/app/actions/accountActions';
import { STATEMENT_FORMATS, formatForBrand } from '../statements/[id]/statementFormats';

interface AddAccountProps {
  account?: Account; // pass to edit; leave out to add a new account
  onAccountCreated: () => void; // called after saving (add or edit)
  onClose: () => void;
}

// Popup for adding or editing an account
export default function AddAccount({ account, onAccountCreated, onClose }: AddAccountProps) {
  const isEditing = !!account;
  const [formData, setFormData] = useState(() => ({
    name: account?.name ?? '',
    brand: account?.brand ?? '',
    checking_account: account?.checking_account ?? false,
    credit_card: account?.credit_card ?? false,
    loan: account?.loan ?? false,
    interest_rate: account?.interest_rate != null ? String(account.interest_rate) : '',
    payment_day: account?.payment_day != null ? String(account.payment_day) : '',
    opening_balance: account?.opening_balance != null ? Number(account.opening_balance).toFixed(2) : '',
    opening_balance_date: account?.opening_balance_date ?? '',
    minimum_payment: account?.minimum_payment != null ? Number(account.minimum_payment).toFixed(2) : '',
    payment_frequency: account?.payment_frequency ?? 'monthly',
    term_months: account?.term_months != null ? String(account.term_months) : '',
    loan_start_date: account?.loan_start_date ?? '',
    statement_parser: account?.statement_parser ?? '', // '' = pick from the brand
  }));
  const brandFormat = formatForBrand(formData.brand);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isCardOrLoan = formData.credit_card || formData.loan;

  // Today as YYYY-MM-DD (local), the latest allowed opening balance / loan start date
  const today = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((formData.opening_balance === '') !== (formData.opening_balance_date === '')) {
      setError('Enter both an opening balance and the date it was true, or leave both empty.');
      return;
    }
    // A typo'd year (e.g. 2925) would leave every transaction before the
    // opening date, so none would be counted
    if (formData.opening_balance_date && formData.opening_balance_date > today) {
      setError('The opening balance date is in the future. Check the year.');
      return;
    }
    if (formData.loan && formData.loan_start_date && formData.loan_start_date > today) {
      setError('The loan start date is in the future. Check the year.');
      return;
    }
    setSaving(true);
    setError('');

    const input = {
      name: formData.name.trim(),
      brand: formData.brand.trim() || null,
      checking_account: formData.checking_account,
      credit_card: formData.credit_card,
      loan: formData.loan,
      interest_rate: formData.interest_rate === '' ? null : Number(formData.interest_rate),
      payment_day: formData.payment_day === '' ? null : Number(formData.payment_day),
      opening_balance: formData.opening_balance === '' ? null : Number(formData.opening_balance),
      opening_balance_date: formData.opening_balance_date || null,
      // Loan details are only kept for loans
      minimum_payment: formData.loan && formData.minimum_payment !== '' ? Number(formData.minimum_payment) : null,
      payment_frequency: formData.loan ? (formData.payment_frequency as 'monthly' | 'biweekly' | 'weekly') : null,
      term_months: formData.loan && formData.term_months !== '' ? Number(formData.term_months) : null,
      loan_start_date: formData.loan ? formData.loan_start_date || null : null,
      statement_parser: formData.statement_parser || null,
    };

    try {
      if (account) await updateAccountAction(account.id, input);
      else await createAccountAction(input);
      onAccountCreated();
    } catch (err) {
      console.error('Error saving account:', err);
      setError(err instanceof Error ? err.message : 'Failed to save account');
      setSaving(false);
    }
  };

  return (
    <div className='module-popup-container flex-center-center' onClick={onClose}>
      <div className='module-popup basic-padding br' onClick={(e) => e.stopPropagation()}>
        <div className='flex-center-spacebetween module-popup-header'>
          <h2>{isEditing ? 'Edit Account' : 'Add Account'}</h2>
          <button type='button' onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className='flex-start-start'>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Name *</label>
              <input
                type='text'
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='e.g., Business Checking'
              />
            </div>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Brand</label>
              <input
                type='text'
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder='e.g., Chase'
              />
            </div>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Statement parser</label>
              <select
                value={formData.statement_parser}
                onChange={(e) => setFormData({ ...formData, statement_parser: e.target.value })}
                title='Runs automatically when you open one of this account’s statements'
              >
                <option value=''>{brandFormat ? `Auto (${brandFormat.label}, from brand)` : 'None'}</option>
                {Object.entries(STATEMENT_FORMATS).map(([key, f]) => (
                  <option key={key} value={key}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className='flex-start-start form-input-wrapper' style={{ gap: '20px' }}>
            <label className='checkbox-wrapper'>
              <input
                type='checkbox'
                checked={formData.checking_account}
                onChange={(e) => setFormData({ ...formData, checking_account: e.target.checked })}
              />
              Checking Account
            </label>
            <label className='checkbox-wrapper'>
              <input
                type='checkbox'
                checked={formData.credit_card}
                onChange={(e) => setFormData({ ...formData, credit_card: e.target.checked })}
              />
              Credit Card
            </label>
            <label className='checkbox-wrapper'>
              <input
                type='checkbox'
                checked={formData.loan}
                onChange={(e) => setFormData({ ...formData, loan: e.target.checked })}
              />
              Loan
            </label>
          </div>

          <div className='flex-start-start'>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Interest Rate (%)</label>
              <input
                type='number'
                step='0.001'
                min='0'
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                placeholder='e.g., 24.99'
              />
            </div>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Payment Day (of month)</label>
              <input
                type='number'
                min='1'
                max='31'
                value={formData.payment_day}
                onChange={(e) => setFormData({ ...formData, payment_day: e.target.value })}
                placeholder='1–31'
              />
            </div>
          </div>

          {formData.loan && (
            <>
              <div className='form-input-wrapper' style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <label><strong>Loan</strong></label>
                <p style={{ margin: '4px 0 0', color: '#666', fontSize: '12px' }}>
                  Interest is worked out daily from the interest rate above, using your payments and their dates.
                </p>
              </div>
              <div className='flex-start-start'>
                <div className='flex-start-start flex-column form-input-wrapper'>
                  <label>Minimum payment ($)</label>
                  <input
                    type='number'
                    step='0.01'
                    min='0'
                    value={formData.minimum_payment}
                    onChange={(e) => setFormData({ ...formData, minimum_payment: e.target.value })}
                    placeholder='e.g., 350.00'
                  />
                </div>
                <div className='flex-start-start flex-column form-input-wrapper'>
                  <label>Payments due</label>
                  <select
                    value={formData.payment_frequency}
                    onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value as 'monthly' | 'biweekly' | 'weekly' })}
                  >
                    <option value='monthly'>Monthly</option>
                    <option value='biweekly'>Every 2 weeks</option>
                    <option value='weekly'>Weekly</option>
                  </select>
                </div>
              </div>
              <div className='flex-start-start'>
                <div className='flex-start-start flex-column form-input-wrapper'>
                  <label>Term (months)</label>
                  <input
                    type='number'
                    min='1'
                    step='1'
                    value={formData.term_months}
                    onChange={(e) => setFormData({ ...formData, term_months: e.target.value })}
                    placeholder='e.g., 60'
                  />
                </div>
                <div className='flex-start-start flex-column form-input-wrapper'>
                  <label>Loan start date</label>
                  <input
                    type='date'
                    max={today}
                    value={formData.loan_start_date}
                    onChange={(e) => setFormData({ ...formData, loan_start_date: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          <div className='form-input-wrapper' style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
            <label><strong>Opening balance</strong></label>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '12px' }}>
              {isCardOrLoan ? 'What you owed' : 'What was in the account'} at the end of this day. Transactions
              after it are added on top to get the current balance.
            </p>
          </div>
          <div className='flex-start-start'>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>{isCardOrLoan ? 'Balance owed ($)' : 'Balance ($)'}</label>
              <input
                type='number'
                step='0.01'
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                placeholder='e.g., 1965.46'
              />
            </div>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>As of</label>
              <input
                type='date'
                max={today}
                value={formData.opening_balance_date}
                onChange={(e) => setFormData({ ...formData, opening_balance_date: e.target.value })}
              />
            </div>
          </div>

          {error && <div style={{ color: 'red', margin: '10px' }}>{error}</div>}

          <button type='submit' disabled={saving} style={{ margin: '10px' }}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
