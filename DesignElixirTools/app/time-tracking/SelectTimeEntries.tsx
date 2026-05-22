'use client';

import { useState, useEffect } from 'react';
import { fetchTimeEntriesAction } from '../actions/timeActions';
import { TimeEntry } from '../types/globalTypes';

interface Props {
  selectedEntryIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function formatTime(seconds: number | null): string {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SelectTimeEntries({ selectedEntryIds, onSelectionChange }: Props) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchTimeEntriesAction({});
        const uninvoiced = (data ?? []).filter((e: TimeEntry) => e.invoice_id == null);
        setEntries(uninvoiced);
      } catch (err) {
        console.error('Error loading time entries:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggle = (id: string) => {
    onSelectionChange(
      selectedEntryIds.includes(id)
        ? selectedEntryIds.filter(i => i !== id)
        : [...selectedEntryIds, id]
    );
  };

  const toggleAll = () => {
    if (selectedEntryIds.length === entries.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(entries.map(e => e.id));
    }
  };

  const totalSeconds = entries
    .filter(e => selectedEntryIds.includes(e.id))
    .reduce((s, e) => s + (e.time_lapsed || 0), 0);

  if (loading) return <p style={{ fontSize: '12px', opacity: 0.5 }}>Loading entries…</p>;
  if (entries.length === 0) return <p style={{ fontSize: '12px', opacity: 0.5 }}>No uninvoiced time entries.</p>;

  return (
    <div className='flex-start-start flex-column' style={{ gap: '6px', width: '100%' }}>

      {/* Select all + total */}
      <div className='flex-center-spacebetween full-width' style={{ paddingBottom: '6px', borderBottom: '0.5px solid var(--border)' }}>
        <label className='flex-center-start' style={{ gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
          <input
            type='checkbox'
            checked={selectedEntryIds.length === entries.length && entries.length > 0}
            onChange={toggleAll}
          />
          Select all ({entries.length})
        </label>
        {selectedEntryIds.length > 0 && (
          <span style={{ fontSize: '11px', opacity: 0.7 }}>
            {formatTime(totalSeconds)} selected
          </span>
        )}
      </div>

      {/* Entry rows */}
      {entries.map(entry => (
        <label
          key={entry.id}
          className='flex-center-start'
          style={{ gap: '8px', width: '100%', cursor: 'pointer', padding: '4px 0', borderBottom: '0.5px solid var(--border)' }}
        >
          <input
            type='checkbox'
            checked={selectedEntryIds.includes(entry.id)}
            onChange={() => toggle(entry.id)}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className='no-text-spacing' style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.description || 'No description'}
            </p>
            <p className='no-text-spacing' style={{ fontSize: '11px', opacity: 0.5 }}>
              {entry.project?.project_name} · {formatDateShort(entry.start_time)}
            </p>
          </div>
          <span style={{ fontSize: '11px', whiteSpace: 'nowrap', opacity: 0.7 }}>
            {formatTime(entry.time_lapsed)}
          </span>
        </label>
      ))}
    </div>
  );
}