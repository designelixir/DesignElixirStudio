// components/invoice/SelectTimeEntriesModal.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { SelectedClientData, TimeEntry, Project } from '../types/globalTypes';
import { fetchTimeEntriesAction } from '../actions/timeActions';
import { applyInvoiceToTimeEntries, removeTimeEntryFromInvoice, fetchTimeEntriesByIds } from './invoiceActions';

interface TimeEntryWithProject extends TimeEntry {
  projectData?: Project | null;
}

interface TimeEntryMeta {
  totalSeconds: number;
  earliest: Date | null;
  latest: Date | null;
  count: number;
}

interface SelectTimeEntriesModalProps {
  selectedClient: SelectedClientData | null;
  existingTimeEntryIds: string[];
  invoiceId?: string;
  isOpen: boolean;
  meta: TimeEntryMeta | null;
  onOpen: () => void;
  onDone: (ids: string[], meta: { totalSeconds: number; earliest: Date | null; latest: Date | null }) => void;
  onClose: () => void;
  fmt: (d: Date) => string;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatDateOnly(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

function formatTimeOnly(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SelectTimeEntriesModal({
  selectedClient,
  existingTimeEntryIds,
  invoiceId,
  isOpen,
  meta,
  onOpen,
  onDone,
  onClose,
  fmt,
}: SelectTimeEntriesModalProps) {
  const [entries, setEntries] = useState<TimeEntryWithProject[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([...existingTimeEntryIds]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Re-sync selectedIds when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds([...existingTimeEntryIds]);
    loadEntries();
  }, [isOpen]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await fetchTimeEntriesAction({
        projectIds: selectedClient ? [selectedClient.project_id] : undefined,
      });

      const uninvoiced: TimeEntryWithProject[] = (data ?? []).map((entry: TimeEntry) => ({
        ...entry,
        projectData: entry.project ? {
          id: entry.project.project_id,
          project_name: entry.project.project_name,
          color: entry.project.project_color,
          client_id: entry.project.client_id,
          client_first: entry.project.client_first,
          client_last: entry.project.client_last,
          created_at: '',
        } : null,
      }));

      let invoicedEntries: TimeEntryWithProject[] = [];
      if (existingTimeEntryIds.length > 0) {
        const existing = await fetchTimeEntriesByIds(existingTimeEntryIds);
        invoicedEntries = existing.map((entry: any) => ({
          ...entry,
          projectData: null,
        }));
      }

      const existingSet = new Set(uninvoiced.map(e => String(e.id)));
      const merged = [
  ...uninvoiced,
  ...invoicedEntries.filter(e => !existingSet.has(String(e.id))),
].filter(e => e.invoice_id == null || e.invoice_id === invoiceId);

      setEntries(merged);
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleEntry = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const selectable = entries.filter(e => e.invoice_id == null || e.invoice_id === invoiceId);
    const allSelected = selectable.every(e => selectedIds.includes(String(e.id)));
    setSelectedIds(allSelected ? [] : selectable.map(e => String(e.id)));
  };

  const calcMeta = () => {
    const matched = entries.filter(e => selectedIds.includes(String(e.id)));
    const totalSeconds = matched.reduce((s, e) => s + (e.time_lapsed || 0), 0);
    const dates = matched
      .map(e => new Date(e.start_time))
      .sort((a, b) => a.getTime() - b.getTime());
    return {
      totalSeconds,
      earliest: dates[0] ?? null,
      latest: dates[dates.length - 1] ?? null,
    };
  };

  const handleDone = async () => {
    setSaving(true);
    try {
      if (invoiceId) {
        const added = selectedIds.filter(id => !existingTimeEntryIds.includes(id));
        const removed = existingTimeEntryIds.filter(id => !selectedIds.includes(id));
        if (added.length > 0) await applyInvoiceToTimeEntries(invoiceId, added);
        for (const id of removed) {
          const remaining = selectedIds.filter(i => i !== id);
          await removeTimeEntryFromInvoice(invoiceId, id, remaining);
        }
      }
      onDone(selectedIds, calcMeta());
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const selectable = entries.filter(e => e.invoice_id == null || e.invoice_id === invoiceId);
  const allSelected = selectable.length > 0 && selectable.every(e => selectedIds.includes(String(e.id)));

  return (
    <>
      {/* Header — always visible */}
      <div className='flex-start-spacebetween full-width basic-padding-top-bottom'>
        <button onClick={onOpen}>
          + Select Time Entries
          {meta && meta.count > 0 && (
            <span style={{ fontSize: '13px', fontWeight: 400, opacity: 0.9, marginLeft: '6px' }}>
              ({meta.count})
            </span>
          )}
        </button>
        {meta && meta.count > 0 && (
          <div style={{ textAlign: 'right' }}>
            {meta.totalSeconds > 0 && (
              <p className='no-text-spacing'>
                <strong>Total:</strong> {(meta.totalSeconds / 3600).toFixed(2)} hrs
              </p>
            )}
            {meta.earliest && meta.latest && (
              <p className='no-text-spacing' style={{ opacity: 0.6 }}>
                {fmt(meta.earliest)}
                {meta.earliest.toDateString() !== meta.latest.toDateString() && <> – {fmt(meta.latest)}</>}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {isOpen && (
        <div className='module-popup-container flex-center-center'>
          <div ref={modalRef} className='module-popup basic-padding br'>
            <div className='flex-center-spacebetween module-popup-header'>
              <h3>Select Time Entries</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className='system-button' onClick={onClose} disabled={saving}>Cancel</button>
                <button className='green-button' onClick={handleDone} disabled={saving}>
                  {saving ? 'Saving…' : `Done (${selectedIds.length})`}
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '20px', opacity: 0.5 }}>Loading entries…</div>
            ) : entries.length === 0 ? (
              <div style={{ padding: '20px', opacity: 0.5 }}>No available time entries.</div>
            ) : (
              <div className='module-popup-inner'>
                <table className='full-width'>
                  <thead>
                    <tr>
                      <th>
                        <input type='checkbox' checked={allSelected} onChange={toggleAll} />
                      </th>
                      <th style={{ minWidth: '35%' }}><label>Description</label></th>
                      <th><label>Project</label></th>
                      <th><label>Start</label></th>
                      <th><label>End</label></th>
                      <th><label>Duration</label></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => {
                      const isThisInvoice = entry.invoice_id === invoiceId;
                      const isOtherInvoice = !!entry.invoice_id && !isThisInvoice;
                      const isChecked = selectedIds.includes(String(entry.id));

                      return (
                        <tr
                          key={entry.id}
                          className={isChecked ? 'selected-row' : ''}
                          style={{ borderBottom: '1px solid #eee', opacity: isOtherInvoice ? 0.4 : 1 }}
                        >
                          <td style={{ padding: '10px' }}>
                            <input
                              type='checkbox'
                              checked={isChecked}
                              disabled={isOtherInvoice}
                              onChange={() => toggleEntry(String(entry.id))}
                            />
                          </td>
                          <td>
                            <p className='small-text'>{entry.description || 'No description'}</p>
                            {isThisInvoice && (
                              <p className='small-text' style={{ opacity: 0.5, fontSize: '10px' }}>This invoice</p>
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {entry.projectData ? (
                              <div className='circle-wrapper client-tag-wrapper'>
                                <div style={{ backgroundColor: entry.projectData.color }} className='circle-small' />
                                <span className='small-text'>{entry.projectData.project_name}</span>
                              </div>
                            ) : <span>N/A</span>}
                          </td>
                          <td>
                            <p className='nowrap small-text no-text-spacing'>{formatDateOnly(entry.start_time)}</p>
                            <p className='nowrap small-text no-text-spacing'><strong>{formatTimeOnly(entry.start_time)}</strong></p>
                          </td>
                          <td>
                            {entry.end_time ? (
                              <>
                                <p className='nowrap small-text no-text-spacing'>{formatDateOnly(entry.end_time)}</p>
                                <p className='nowrap small-text no-text-spacing'><strong>{formatTimeOnly(entry.end_time)}</strong></p>
                              </>
                            ) : 'N/A'}
                          </td>
                          <td>
                            <p className='teal-text duration-text'>{formatTime(entry.time_lapsed || 0)}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}