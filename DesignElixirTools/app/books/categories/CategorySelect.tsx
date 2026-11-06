'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ExpenseCategory } from '@/types/globalTypes';

interface CategorySelectProps {
  categories: ExpenseCategory[];
  value: string; // selected category id, '' for none
  onChange: (categoryId: string) => void;
  // Called with whatever was typed when "+ Add category" is chosen
  onAddCategory?: (typedTitle: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function Swatch({ color }: { color: string | null }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: color ?? '#ccc',
        flex: 'none',
      }}
    />
  );
}

// Type to search your expense categories; pick one from the list.
export default function CategorySelect({
  categories,
  value,
  onChange,
  onAddCategory,
  disabled,
  placeholder = 'Search categories',
}: CategorySelectProps) {
  const selected = categories.find((c) => c.id === value) ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = q ? categories.filter((c) => c.title.toLowerCase().includes(q)) : categories;
  const exactMatch = categories.some((c) => c.title.toLowerCase() === q);
  const showAdd = !!onAddCategory;
  // Options: matching categories, then (optionally) "+ Add category"
  const optionCount = matches.length + (showAdd ? 1 : 0);

  const choose = (index: number) => {
    if (index < matches.length) {
      onChange(matches[index].id);
    } else if (showAdd) {
      onAddCategory!(query.trim());
    }
    setOpen(false);
    setQuery('');
  };

  const openList = () => {
    setQuery('');
    setHighlight(0);
    setOpen(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, optionCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      // Don't submit the row's form while picking a category
      e.preventDefault();
      if (optionCount > 0) choose(highlight);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', minWidth: '150px' }}>
      <div className='flex-center-start' style={{ gap: '6px' }}>
        {selected && !open && <Swatch color={selected.color} />}
        <input
          type='text'
          disabled={disabled}
          autoComplete='off'
          placeholder={placeholder}
          style={{ width: '100%' }}
          value={open ? query : selected?.title ?? ''}
          onFocus={openList}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            minWidth: '200px',
            marginTop: '4px',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '5px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {value && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                onChange('');
                setOpen(false);
              }}
              style={{ padding: '8px 10px', fontSize: '12px', color: '#999', cursor: 'pointer' }}
            >
              Clear selection
            </div>
          )}
          {matches.map((c, i) => (
            <div
              key={c.id}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(i);
              }}
              onMouseEnter={() => setHighlight(i)}
              className='flex-center-start'
              style={{
                gap: '8px',
                padding: '8px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                background: highlight === i ? '#f0f0f0' : undefined,
                fontWeight: c.id === value ? 600 : undefined,
              }}
            >
              <Swatch color={c.color} />
              <span style={{ flex: 1 }}>{c.title}</span>
              <span style={{ color: '#999' }}>{Number(c.percent_writeoff)}%</span>
            </div>
          ))}
          {matches.length === 0 && (
            <div style={{ padding: '8px 10px', fontSize: '12px', color: '#999' }}>No matching categories</div>
          )}
          {showAdd && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                choose(matches.length);
              }}
              onMouseEnter={() => setHighlight(matches.length)}
              style={{
                padding: '8px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                borderTop: '1px solid #eee',
                color: 'var(--navy)',
                fontWeight: 600,
                background: highlight === matches.length ? '#f0f0f0' : undefined,
              }}
            >
              + Add category{q && !exactMatch ? ` “${query.trim()}”` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
