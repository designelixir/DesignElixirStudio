'use client';

import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { Account } from '@/types/globalTypes';
import { createClient } from '@/app/utils/supabase/client';
import {
  createStatementUploadUrlAction,
  createStatementAction,
} from '@/app/actions/statementActions';

interface UploadStatementProps {
  accounts: Account[];
  onUploaded: () => void;
}

const emptyForm = { name: '', account_id: '', period_start: '', period_end: '' };

export default function UploadStatement({ accounts, onUploaded }: UploadStatementProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFileChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    e.target.value = ''; // let the same file be picked again later
    if (!chosen) return;
    if (chosen.type !== 'application/pdf' && !chosen.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file.');
      return;
    }
    setFile(chosen);
    setError('');
    setFormData({ ...emptyForm, name: chosen.name.replace(/\.pdf$/i, '') });
  };

  const cancelUpload = () => {
    setFile(null);
    setFormData(emptyForm);
    setError('');
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;
    if (formData.period_start && formData.period_end && formData.period_start > formData.period_end) {
      setError('Start date must be on or before the end date.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      // 1. Upload the PDF straight to Supabase Storage using a one-time URL
      const { path, token } = await createStatementUploadUrlAction(file.name);
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('statements')
        .uploadToSignedUrl(path, token, file, { contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      // 2. Save the statement's details
      await createStatementAction({
        name: formData.name.trim() || file.name,
        account_id: formData.account_id,
        file_path: path,
        file_name: file.name,
        file_type: 'pdf',
        period_start: formData.period_start || null,
        period_end: formData.period_end || null,
      });

      cancelUpload();
      onUploaded();
    } catch (err) {
      console.error('Error uploading statement:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload statement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='full-width'>
      <div className='flex-end-end'>
        <input
          ref={fileInputRef}
          type='file'
          accept='application/pdf,.pdf'
          style={{ display: 'none' }}
          onChange={handleFileChosen}
        />
        <button type='button' onClick={() => fileInputRef.current?.click()} disabled={saving}>
          Import Statement
        </button>
      </div>

      {!file && error && <div style={{ color: 'red', margin: '10px 0' }}>{error}</div>}

      {file && (
        <form onSubmit={handleSave} className='card' style={{ margin: '10px 0 20px' }}>
          <div className='flex-center-spacebetween'>
            <p style={{ margin: '10px' }}>📄 <strong>{file.name}</strong></p>
            <button type='button' onClick={cancelUpload} disabled={saving}>✕</button>
          </div>

          <div className='flex-start-start'>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Statement Name *</label>
              <input
                type='text'
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='e.g., Chase Sapphire – Oct 2026'
              />
            </div>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Account *</label>
              <select
                required
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              >
                <option value='' disabled>{accounts.length ? 'Select an account' : 'No accounts yet'}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.brand ? ` (${a.brand})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Start Date *</label>
              <input
                type='date'
                required
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
              />
            </div>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>End Date *</label>
              <input
                type='date'
                required
                min={formData.period_start || undefined}
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
              />
            </div>
          </div>

          {error && <div style={{ color: 'red', margin: '10px' }}>{error}</div>}

          <button type='submit' disabled={saving} style={{ margin: '10px' }}>
            {saving ? 'Uploading...' : 'Save Statement'}
          </button>
        </form>
      )}
    </div>
  );
}
