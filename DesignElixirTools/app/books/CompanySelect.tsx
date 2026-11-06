'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface CompanySelectProps {
  options: string[]; // company names to suggest
  value: string;
  onChange: (company: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Type to search existing companies, or type a new name — whatever is typed is kept.
export default function CompanySelect({
  options,
  value,
  onChange,
  disabled,
  placeholder = 'Company',
}: CompanySelectProps) {
  const [open, setOpen] = useState(false);
  // -1 = nothing highlighted, so Enter keeps exactly what was typed
  const [highlight, setHighlight] = useState(-1);
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

  const q = value.trim().toLowerCase();
  const matches = (q ? options.filter((o) => o.toLowerCase().includes(q)) : options).slice(0, 50);
  const isNew = !!q && !options.some((o) => o.toLowerCase() === q);

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    } else if (e.key === 'Enter' && open) {
      // Pick the highlighted name, or keep what was typed; don't submit the row yet
      e.preventDefault();
      if (highlight >= 0 && matches[highlight]) choose(matches[highlight]);
      else setOpen(false);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', minWidth: '130px' }}>
      <input
        type='text'
        disabled={disabled}
        autoComplete='off'
        placeholder={placeholder}
        style={{ width: '100%' }}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlight(-1);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />

      {open && (matches.length > 0 || isNew) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            minWidth: '180px',
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
          {matches.map((name, i) => (
            <div
              key={name}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(name);
              }}
              onMouseEnter={() => setHighlight(i)}
              style={{
                padding: '8px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                background: highlight === i ? '#f0f0f0' : undefined,
                fontWeight: name.toLowerCase() === q ? 600 : undefined,
              }}
            >
              {name}
            </div>
          ))}
          {isNew && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                choose(value.trim());
              }}
              style={{
                padding: '8px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                borderTop: matches.length ? '1px solid #eee' : undefined,
                color: 'var(--navy)',
                fontWeight: 600,
              }}
            >
              + New company “{value.trim()}”
            </div>
          )}
        </div>
      )}
    </div>
  );
}
