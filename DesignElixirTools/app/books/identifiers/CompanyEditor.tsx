'use client';

import { useState, useMemo, KeyboardEvent } from 'react';
import { ExpenseCategory, StatementCompany, StatementCompanyPhrase } from '@/types/globalTypes';
import {
  createStatementCompanyAction,
  updateStatementCompanyAction,
  deleteStatementCompanyAction,
  type DescriptorCount,
} from '@/app/actions/statementCompanyActions';
import { descriptorHasPhrase } from '@/app/books/statements/[id]/descriptorMatch';
import CategorySelect from '../categories/CategorySelect';

interface CompanyEditorProps {
  company: StatementCompany | null; // null = adding a new one
  categories: ExpenseCategory[];
  allDescriptors: DescriptorCount[] | null; // every statement descriptor on your transactions (null while loading)
  columnCount: number;
  onSaved: (company: StatementCompany) => void;
  onDeleted: (id: string) => void;
  onCancel: () => void;
}

// '' = no default, 'work', 'personal'
type WorkChoice = '' | 'work' | 'personal';
const toChoice = (v: boolean | null): WorkChoice => (v === null ? '' : v ? 'work' : 'personal');
const fromChoice = (c: WorkChoice): boolean | null => (c === '' ? null : c === 'work');

// Expanded table row for editing one company: name, defaults, and its descriptors
export default function CompanyEditor({
  company,
  categories,
  allDescriptors,
  columnCount,
  onSaved,
  onDeleted,
  onCancel,
}: CompanyEditorProps) {
  const [name, setName] = useState(company?.name ?? '');
  const [categoryId, setCategoryId] = useState(company?.default_category_id ?? '');
  const [work, setWork] = useState<WorkChoice>(toChoice(company?.default_work_expense ?? null));
  const [descriptors, setDescriptors] = useState<string[]>(company?.descriptors ?? []);
  const [draft, setDraft] = useState('');
  const [phrases, setPhrases] = useState<StatementCompanyPhrase[]>(company?.phrases ?? []);

  const addPhrase = () =>
    setPhrases([...phrases, { phrase: '', default_category_id: null, default_work_expense: null }]);
  const updatePhrase = (index: number, patch: Partial<StatementCompanyPhrase>) =>
    setPhrases(phrases.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  const removePhrase = (index: number) => setPhrases(phrases.filter((_, i) => i !== index));

  // Linked descriptors no phrase covers. The ones a phrase matches are listed
  // under that phrase instead (they're still saved on the company).
  const unphrased = descriptors.filter((d) => !phrases.some((p) => descriptorHasPhrase(d, p.phrase)));
  const coveredCount = descriptors.length - unphrased.length;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addDescriptor = () => {
    const d = draft.trim().replace(/\s+/g, ' ');
    if (!d) return;
    if (!descriptors.some((x) => x.toLowerCase() === d.toLowerCase())) setDescriptors([...descriptors, d]);
    setDraft('');
  };

  const handleDraftKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDescriptor();
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const input = {
      name,
      descriptors: draft.trim() ? [...descriptors, draft] : descriptors, // keep a typed-but-not-added one
      default_category_id: categoryId || null,
      default_work_expense: fromChoice(work),
      phrases: phrases.filter((p) => p.phrase.trim()),
    };
    try {
      const saved = company
        ? await updateStatementCompanyAction(company.id, input)
        : await createStatementCompanyAction(input);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!company) return;
    if (!window.confirm(`Delete “${company.name}” and its ${company.descriptors.length} linked descriptors? Transactions aren't changed.`)) return;
    setSaving(true);
    try {
      await deleteStatementCompanyAction(company.id);
      onDeleted(company.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setSaving(false);
    }
  };

  return (
    <tr>
      <td colSpan={columnCount} style={{ background: 'var(--white-1, #fafafa)', padding: '15px' }}>
        <div className='flex-start-start flex-wrap' style={{ gap: '15px', marginBottom: '15px' }}>
          <div className='flex-start-start flex-column' style={{ gap: '4px' }}>
            <label style={{ fontSize: '12px' }}>Company name *</label>
            <input type='text' value={name} onChange={(e) => setName(e.target.value)} autoFocus={!company} />
          </div>
          <div className='flex-start-start flex-column' style={{ gap: '4px', width: '220px' }}>
            <label style={{ fontSize: '12px' }}>Default category</label>
            <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} placeholder='None' />
            {categoryId && (
              <button type='button' className='system-button tiny-button' onClick={() => setCategoryId('')}>
                Clear
              </button>
            )}
          </div>
          <div className='flex-start-start flex-column' style={{ gap: '4px' }}>
            <label style={{ fontSize: '12px' }}>Default type</label>
            <select value={work} onChange={(e) => setWork(e.target.value as WorkChoice)}>
              <option value=''>No default</option>
              <option value='work'>Work</option>
              <option value='personal'>Personal</option>
            </select>
          </div>
        </div>

        <label style={{ fontSize: '12px' }}>
          Statement descriptors ({unphrased.length}) — statement lines like these are filled in as this company
          {coveredCount > 0 && ` · ${coveredCount} more covered by phrases below`}
        </label>
        <div className='flex-center-start flex-wrap' style={{ gap: '6px', margin: '6px 0 8px' }}>
          {unphrased.length === 0 && (
            <span style={{ color: '#999', fontSize: '12px' }}>{coveredCount > 0 ? 'All covered by phrases' : 'None yet'}</span>
          )}
          {unphrased.map((d) => (
            <span key={d} className='transaction-tag' style={{ fontSize: '12px' }}>
              {d}
              <button type='button' onClick={() => setDescriptors(descriptors.filter((x) => x !== d))} aria-label={`Remove ${d}`}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className='flex-center-start' style={{ gap: '6px', maxWidth: '520px' }}>
          <input
            type='text'
            placeholder='Add a descriptor, e.g. ADOBE *CREATIVE CLOUD SAN JOSE CA'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleDraftKey}
            style={{ flex: 1 }}
          />
          <button type='button' onClick={addDescriptor} disabled={!draft.trim()}>Add</button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={{ fontSize: '12px' }}>
            Descriptor phrases ({phrases.length}) — any statement line containing a phrase (ignoring caps) is filled in
            as this company with that phrase&rsquo;s defaults. Only affects lines parsed from now on.
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '8px 0' }}>
            {phrases.map((p, i) => (
              <PhraseEditor
                key={i}
                phrase={p}
                categories={categories}
                allDescriptors={allDescriptors}
                onChange={(patch) => updatePhrase(i, patch)}
                onRemove={() => removePhrase(i)}
              />
            ))}
          </div>
          <button type='button' onClick={addPhrase}>+ Add phrase</button>
        </div>

        {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}

        <div className='flex-center-start' style={{ gap: '10px', marginTop: '15px' }}>
          <button type='button' onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : company ? 'Save changes' : 'Add company'}
          </button>
          <button type='button' onClick={onCancel} disabled={saving}>Cancel</button>
          {company && (
            <button type='button' onClick={remove} disabled={saving} style={{ marginLeft: 'auto', color: '#c0392b' }}>
              Delete company
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

const MATCHES_SHOWN = 8;

// One phrase: the text to look for, its defaults, and the statement descriptors
// it currently matches
function PhraseEditor({
  phrase,
  categories,
  allDescriptors,
  onChange,
  onRemove,
}: {
  phrase: StatementCompanyPhrase;
  categories: ExpenseCategory[];
  allDescriptors: DescriptorCount[] | null;
  onChange: (patch: Partial<StatementCompanyPhrase>) => void;
  onRemove: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const matches = useMemo(
    () => (allDescriptors ?? []).filter((d) => descriptorHasPhrase(d.descriptor, phrase.phrase)),
    [allDescriptors, phrase.phrase]
  );
  const lineCount = matches.reduce((sum, d) => sum + d.count, 0);
  const shown = showAll ? matches : matches.slice(0, MATCHES_SHOWN);

  return (
    <div className='card' style={{ background: 'white', padding: '10px', margin: 0 }}>
      <div className='flex-end-start flex-wrap' style={{ gap: '10px' }}>
        <div className='flex-start-start flex-column' style={{ gap: '4px', flex: '1 1 240px' }}>
          <label style={{ fontSize: '12px' }}>Phrase</label>
          <input
            type='text'
            placeholder='e.g. creative cloud'
            value={phrase.phrase}
            onChange={(e) => onChange({ phrase: e.target.value })}
            autoFocus={!phrase.phrase}
            style={{ width: '100%' }}
          />
        </div>
        <div className='flex-start-start flex-column' style={{ gap: '4px', width: '220px' }}>
          <label style={{ fontSize: '12px' }}>Category</label>
          <CategorySelect
            categories={categories}
            value={phrase.default_category_id ?? ''}
            onChange={(id) => onChange({ default_category_id: id || null })}
            placeholder='Company default'
          />
        </div>
        <div className='flex-start-start flex-column' style={{ gap: '4px' }}>
          <label style={{ fontSize: '12px' }}>Type</label>
          <select
            value={toChoice(phrase.default_work_expense)}
            onChange={(e) => onChange({ default_work_expense: fromChoice(e.target.value as WorkChoice) })}
          >
            <option value=''>Company default</option>
            <option value='work'>Work</option>
            <option value='personal'>Personal</option>
          </select>
        </div>
        <button type='button' onClick={onRemove} aria-label='Remove phrase' style={{ color: '#c0392b' }}>
          Remove
        </button>
      </div>

      {phrase.phrase.trim() && (
        <div style={{ marginTop: '8px', fontSize: '12px' }}>
          {allDescriptors === null ? (
            <span style={{ color: '#999' }}>Loading descriptors…</span>
          ) : matches.length === 0 ? (
            <span style={{ color: '#999' }}>No statement descriptors contain “{phrase.phrase.trim()}” yet.</span>
          ) : (
            <>
              <span style={{ color: '#666' }}>
                Matches {matches.length} descriptor{matches.length === 1 ? '' : 's'} ({lineCount} line
                {lineCount === 1 ? '' : 's'}):
              </span>
              <ul style={{ margin: '4px 0 0', paddingLeft: '18px', color: '#444' }}>
                {shown.map((d) => (
                  <li key={d.descriptor}>
                    <Highlighted text={d.descriptor} phrase={phrase.phrase} />
                    {d.count > 1 && <span style={{ color: '#999' }}> ×{d.count}</span>}
                  </li>
                ))}
              </ul>
              {matches.length > MATCHES_SHOWN && (
                <button type='button' className='system-button tiny-button' onClick={() => setShowAll(!showAll)}>
                  {showAll ? 'Show fewer' : `Show all ${matches.length}`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// The descriptor with the matched phrase in bold
function Highlighted({ text, phrase }: { text: string; phrase: string }) {
  const p = phrase.replace(/\s+/g, ' ').trim().toLowerCase();
  const at = p ? text.toLowerCase().indexOf(p) : -1;
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong>{text.slice(at, at + p.length)}</strong>
      {text.slice(at + p.length)}
    </>
  );
}
