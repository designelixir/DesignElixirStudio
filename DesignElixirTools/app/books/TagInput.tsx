'use client';

import { useState, KeyboardEvent, CSSProperties } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestionsListId?: string; // <datalist> of tags already used
  form?: string;              // the row's form, so Enter in an empty box still submits it
  style?: CSSProperties;
}

// Normalised tag: trimmed, single spaces, lowercase ("Client  Acme " → "client acme")
export function normalizeTag(tag: string) {
  return tag.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Tags as removable chips plus a box to type more. Enter, comma or Tab adds
// what's typed; Backspace in an empty box removes the last tag.
export default function TagInput({ value, onChange, suggestionsListId, form, style }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const tags = raw.split(',').map(normalizeTag).filter(Boolean);
    const next = [...value];
    for (const t of tags) if (!next.includes(t)) next.push(t);
    if (next.length !== value.length) onChange(next);
    setDraft('');
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === 'Tab') && draft.trim()) {
      if (e.key !== 'Tab') e.preventDefault(); // don't submit the row / type the comma
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div style={style}>
      {value.length > 0 && (
        <div className='flex-center-start flex-wrap' style={{ gap: '4px', marginBottom: '4px' }}>
          {value.map((tag) => (
            <span key={tag} className='transaction-tag'>
              {tag}
              <button type='button' onClick={() => remove(tag)} aria-label={`Remove tag ${tag}`}>×</button>
            </span>
          ))}
        </div>
      )}
      <input
        form={form}
        type='text'
        placeholder='Add tags'
        list={suggestionsListId}
        autoComplete='off'
        style={{ width: '100%' }}
        value={draft}
        onChange={(e) => {
          // Picking a suggestion from the list fills the box with the whole tag: add it
          const v = e.target.value;
          const native = e.nativeEvent as InputEvent;
          if (!native.inputType || native.inputType === 'insertReplacementText') add(v);
          else setDraft(v);
        }}
        onKeyDown={handleKeyDown}
        // Typed but not confirmed: keep it rather than losing it
        onBlur={() => draft.trim() && add(draft)}
        aria-label='Add tags'
      />
    </div>
  );
}
