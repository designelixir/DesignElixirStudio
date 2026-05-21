'use client';

import { useEffect, useState, useRef } from 'react';
import { fetchProjectById } from '@/app/utils/clientUtils';
import { TimeEntry, Project, SelectedClientData } from '@/app/admin/types/globalTypes';
import EditTimeEntry from './EditTimeEntry';
import SearchAndSelectClient from '../components/SearchAndSelectClient';
import { useTimeEntries } from '../context/TimeEntriesContext';
import { fetchTimeEntriesAction } from '../actions/timeActions';
import Link from 'next/link';
import Image from 'next/image';

interface TimeTrackedListProps {
  filterProjectIds?: string[];
  showInvoiced?: boolean;
  billableRate?: number;
  showCalculations?: boolean;
  allowProjectSelection?: boolean;
  showPastInvoicesByDefault?: boolean;
  loadStyle?: 'byWeeks' | 'fullList';
  selectedEntries?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onEntriesLoaded?: (entries: TimeEntryWithProject[]) => void;
  highlightInvoiceId?: string;
  readOnly?: boolean;
}

interface TimeEntryWithProject extends TimeEntry {
  projectData?: Project | null;
}

interface WeekGroup {
  key: string;
  year: number;
  weekNumber: number;
  weekLabel: string;
  entries: TimeEntryWithProject[];
  totalSeconds: number;
}

interface DateRange {
  start: Date | null;
  end: Date | null;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekDateRange(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

function getCurrentWeekNumber(): number {
  return getWeekNumber(new Date());
}

function isOlderThanOneMonth(weekGroup: WeekGroup): boolean {
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  if (weekGroup.year < now.getFullYear()) return true;
  if (weekGroup.year === now.getFullYear() && weekGroup.weekNumber < getWeekNumber(oneMonthAgo)) return true;
  return false;
}

export default function TimeTrackedList({
  filterProjectIds,
  billableRate,
  showCalculations = true,
  allowProjectSelection = true,
  showPastInvoicesByDefault = false,
  loadStyle = 'byWeeks',
  selectedEntries: controlledSelectedEntries,
  onSelectionChange,
  onEntriesLoaded,
  highlightInvoiceId,
  readOnly,
}: TimeTrackedListProps) {
  const { refreshTrigger } = useTimeEntries();
  const [allEntries, setAllEntries] = useState<TimeEntryWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvoicedAsWell, setShowInvoicedAsWell] = useState(showPastInvoicesByDefault);
  const [selectedFilter, setSelectedFilter] = useState<SelectedClientData | null>(null);
  const [activeProjectIds, setActiveProjectIds] = useState<string[]>(filterProjectIds || []);
  const [internalSelectedEntries, setInternalSelectedEntries] = useState<string[]>([]);
  const [loadedOldWeeks, setLoadedOldWeeks] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempStart, setTempStart] = useState('');
  const [tempEnd, setTempEnd] = useState('');
  const datePickerRef = useRef<HTMLDivElement>(null);

  const selectedEntries = controlledSelectedEntries ?? internalSelectedEntries;

  const setSelectedEntries = (updater: string[] | ((prev: string[]) => string[])) => {
    const next = typeof updater === 'function' ? updater(selectedEntries) : updater;
    setInternalSelectedEntries(next);
    onSelectionChange?.(next);
  };

  const hasSeededRef = useRef(false);




  const hasFixedFilter = filterProjectIds && filterProjectIds.length > 0;

  useEffect(() => {
    if (hasFixedFilter) loadInitialFilter();
  }, [filterProjectIds]);

  useEffect(() => {
    fetchEntries();
  }, [activeProjectIds, showInvoicedAsWell, refreshTrigger]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadInitialFilter = async () => {
    if (!filterProjectIds || filterProjectIds.length === 0) return;
    try {
      const project = await fetchProjectById(filterProjectIds[0]);
      if (project) {
        setSelectedFilter({
          client_id: project.client_id,
          client_name: `${project.client_first} ${project.client_last}`,
          client_first: project.client_first,
          client_last: project.client_last,
          project_id: project.id,
          project_name: project.project_name,
          project_color: project.color || '#CCCCCC',
          project_hourly: project.hourly_rate || 50,
        });
      }
    } catch (err) {
      console.error('Error loading initial filter:', err);
    }
  };

  const handleClientSelect = (clientData: SelectedClientData | null) => {
    if (hasFixedFilter) return;
    setSelectedFilter(clientData);
    setActiveProjectIds(clientData ? [clientData.project_id] : []);
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const data = await fetchTimeEntriesAction({
        projectIds: activeProjectIds.length > 0 ? activeProjectIds : undefined,
      });

      let filtered: TimeEntry[] = data ?? [];
      if (!showInvoicedAsWell) {
        filtered = filtered.filter((e: TimeEntry) => e.invoice_id == null || e.invoice_id === highlightInvoiceId);
      }

      const entriesWithProjects: TimeEntryWithProject[] = filtered.map((entry: TimeEntry) => {
        const p = entry.project;
        if (!p) return { ...entry, projectData: null };
        return {
          ...entry,
          projectData: {
            id: p.project_id,
            project_name: p.project_name,
            color: p.project_color,
            client_id: p.client_id,
            client_first: p.client_first,
            client_last: p.client_last,
            client_image: p.project_image,
            hourly_rate: p.hourly_rate,
            deadline: p.deadline,
            active: p.active,
            created_at: '',
          },
        };
      });

      setAllEntries(entriesWithProjects);
      onEntriesLoaded?.(entriesWithProjects);

      if (highlightInvoiceId && !hasSeededRef.current) {
  const alreadyHighlighted = entriesWithProjects
    .filter(e => e.invoice_id === highlightInvoiceId)
    .map(e => e.id);
  if (alreadyHighlighted.length > 0) {
    hasSeededRef.current = true;
    const merged = Array.from(new Set([...(controlledSelectedEntries ?? []), ...alreadyHighlighted]));
    onSelectionChange?.(merged);
  }
}

    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const getVisibleEntries = (): TimeEntryWithProject[] => {
    if (dateRange.start && dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      return allEntries.filter(e => {
        const d = new Date(e.start_time);
        return d >= dateRange.start! && d <= end;
      });
    }
    return allEntries;
  };

  const groupByWeek = (entries: TimeEntryWithProject[]): WeekGroup[] => {
    const groups: Record<string, WeekGroup> = {};
    entries.forEach(entry => {
      const date = new Date(entry.start_time);
      const weekNum = getWeekNumber(date);
      const year = date.getFullYear();
      const key = `${year}-${weekNum}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          year,
          weekNumber: weekNum,
          weekLabel: `${year} · Week ${weekNum} · ${getWeekDateRange(date)}`,
          entries: [],
          totalSeconds: 0,
        };
      }
      groups[key].entries.push(entry);
      groups[key].totalSeconds += entry.time_lapsed || 0;
    });
    return Object.values(groups).sort((a, b) =>
      a.year !== b.year ? b.year - a.year : b.weekNumber - a.weekNumber
    );
  };

  const handleApplyDateRange = () => {
    if (tempStart && tempEnd) {
      setDateRange({ start: new Date(tempStart), end: new Date(tempEnd) });
    }
    setShowDatePicker(false);
  };

  const handleClearDateRange = () => {
    setDateRange({ start: null, end: null });
    setTempStart('');
    setTempEnd('');
    setShowDatePicker(false);
  };

  const handleSelectAll = () => {
    const selectable = getVisibleEntries().filter(e => e.invoice_id == null || e.invoice_id === highlightInvoiceId);
    const selectableIds = selectable.map(e => e.id);
    const allSelected = selectableIds.every(id => selectedEntries.includes(id));
    setSelectedEntries(allSelected ? [] : selectableIds);
  };

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntries(prev =>
      prev.includes(entryId) ? prev.filter(id => id !== entryId) : [...prev, entryId]
    );
  };

  const calculateDateRangeTotals = () => {
    const entries = getVisibleEntries();
    const totalSeconds = entries.reduce((sum, e) => sum + (e.time_lapsed || 0), 0);
    const totalHours = totalSeconds / 3600;
    return {
      totalSeconds,
      totalHours: totalHours.toFixed(2),
      totalAmount: billableRate ? (totalHours * billableRate).toFixed(2) : null,
    };
  };

  const formatTime = (seconds: number | null): string => {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDateOnly = (dateString: string): string => new Date(dateString).toLocaleDateString();

  const formatTimeOnly = (dateString: string): string =>
    new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderTableHeader = () => (
    <thead>
      <tr>
        <th>
          {onSelectionChange && visibleEntries.length > 0 && (
            <div className='flex-start-start flex-column' style={{ gap: '8px', borderBottom: '0.5px solid var(--border)' }}>
              <label className='flex-center-start' style={{ gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type='checkbox'
                  checked={
                    getVisibleEntries()
                      .filter(e => e.invoice_id == null || e.invoice_id === highlightInvoiceId)
                      .every(e => selectedEntries.includes(e.id)) &&
                    getVisibleEntries().filter(e => e.invoice_id == null || e.invoice_id === highlightInvoiceId).length > 0
                  }
                  onChange={handleSelectAll}
                />
                {selectedEntries.length > 0 && (
                  <p className='no-text-spacing navy-text' style={{ fontSize: '9px', lineHeight: '0', padding: 0, margin: 0, textAlign: 'center', opacity: '0.5' }}>
                    {selectedEntries.length}
                  </p>
                )}
              </label>
            </div>
          )}
        </th>
        <th style={{ minWidth: '35%' }}><label>Description</label></th>
        <th><label>Project</label></th>
        <th><label>Start</label></th>
        <th><label>End</label></th>
        <th><label>Duration</label></th>
        <th style={{ textAlign: 'center' }}><label>Billable?</label></th>
        <th style={{ textAlign: 'center' }}><label>Invoice</label></th>
        <th style={{ textAlign: 'center' }}><label>Edit</label></th>
      </tr>
    </thead>
  );

  const renderEntryRow = (entry: TimeEntryWithProject) => {
    const projectData = entry.projectData;
    const isCheckedByInvoice = !!highlightInvoiceId && entry.invoice_id === highlightInvoiceId;
    const isChecked = selectedEntries.includes(entry.id) || isCheckedByInvoice;
    const isDisabled = !!entry.invoice_id && !isCheckedByInvoice;

    return (
      <tr
        key={entry.id}
        className={isChecked ? 'selected-row' : ''}
        style={{ borderBottom: '1px solid #eee', opacity: isDisabled ? '0.4' : '1' }}
      >
        <td style={{ padding: '10px' }}>
          <input
  type="checkbox"
  checked={isChecked}
  onChange={readOnly ? undefined : () => handleSelectEntry(entry.id)}
  readOnly={readOnly}
  disabled={readOnly ? false : isDisabled}
/>
        </td>
        <td><p className='small-text'>{entry.description || 'No description'}</p></td>
        <td style={{ padding: '10px' }}>
          {projectData ? (
            <div className='circle-wrapper client-tag-wrapper'>
              <div style={{ backgroundColor: projectData.color }} className='circle-small' />
              <span className='small-text'>{projectData.project_name}</span>
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
        <td><p className='teal-text duration-text'>{formatTime(entry.time_lapsed)}</p></td>
        <td>
          <p className='no-text-spacing billable-dollar' style={{ opacity: entry.billable ? '1' : '0.25', color: entry.billable ? 'green' : 'black' }}>$</p>
        </td>
        <td>
          {entry.invoice_id ? (
            <Link href={`/admin/invoices/${entry.invoice_id}`} className='flex-center-center flex-column no-flex-grow'>
              <Image src="/invoice.svg" height={25} width={25} alt="invoice icon" />
              <span className='xsmall-text no-text-spacing' style={{ fontSize: '8px' }}>{entry.invoice_id}</span>
            </Link>
          ) : (
            <p className='centered-text'>-</p>
          )}
        </td>
        <td className='centered-text' style={{ padding: '10px' }}>
          <EditTimeEntry entry={entry} onEntryUpdated={fetchEntries} />
        </td>
      </tr>
    );
  };

  if (loading) return <div>Loading...</div>;

  const visibleEntries = getVisibleEntries();
  const weekGroups = groupByWeek(visibleEntries);
  const dateRangeTotals = calculateDateRangeTotals();
  const isDateRangeActive = !!(dateRange.start && dateRange.end);
  const currentWeekNum = getCurrentWeekNumber();

  return (
    <div className='flex-start-start flex-column full-width'>

      {showCalculations && (
        <div className='flex-center-spacebetween calculated-time-wrapper full-width' style={{ position: 'relative' }}>
          <div className='flex-center-start' style={{ gap: '12px', flexWrap: 'wrap' }}>
            <label className='checkbox-wrapper'>
              <input
                type="checkbox"
                checked={showInvoicedAsWell}
                onChange={(e) => setShowInvoicedAsWell(e.target.checked)}
                role="switch"
                aria-checked={showInvoicedAsWell}
              />
              <span className="switch-label">Show Invoiced?</span>
            </label>

            {allowProjectSelection && !hasFixedFilter && (
              <SearchAndSelectClient
                selectedClient={selectedFilter}
                onClientSelect={handleClientSelect}
              />
            )}

            {selectedFilter && hasFixedFilter && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ whiteSpace: 'nowrap' }}>Filtering by:</span>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: selectedFilter.project_color }} />
                <span style={{ whiteSpace: 'nowrap' }}>{selectedFilter.project_name}</span>
              </div>
            )}

            <div ref={datePickerRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDatePicker(p => !p)}
                className={isDateRangeActive ? '' : 'system-button'}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                📅 {isDateRangeActive
                  ? `${dateRange.start!.toLocaleDateString()} – ${dateRange.end!.toLocaleDateString()}`
                  : 'Date Range'}
              </button>

              {showDatePicker && (
                <div className="calendar-box" style={{ marginLeft: '-100px' }}>
                  <strong>Select Date Range</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>From</label>
                    <input type="date" value={tempStart} onChange={(e) => setTempStart(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>To</label>
                    <input type="date" value={tempEnd} onChange={(e) => setTempEnd(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleApplyDateRange} disabled={!tempStart || !tempEnd}>Apply</button>
                    <button onClick={handleClearDateRange} className='system-button'>Clear</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isDateRangeActive && (
            <div className='flex-end-end flex-column'>
              <p className='no-text-spacing' style={{ fontSize: '12px', opacity: 0.6 }}>
                {dateRange.start!.toLocaleDateString()} – {dateRange.end!.toLocaleDateString()}
              </p>
              <h3 className='time-tracker-time no-text-spacing'>{formatTime(dateRangeTotals.totalSeconds)}</h3>
              {billableRate && dateRangeTotals.totalAmount && (
                <h3 className='no-text-spacing' style={{ color: 'green' }}>${dateRangeTotals.totalAmount}</h3>
              )}
            </div>
          )}
        </div>
      )}

      {visibleEntries.length === 0 ? (
        <div style={{ padding: '20px 0', opacity: 0.5 }}>No time entries found.</div>
      ) : loadStyle === 'fullList' ? (
        <table className='full-width'>
          {renderTableHeader()}
          <tbody>
            {visibleEntries.map(renderEntryRow)}
          </tbody>
        </table>
      ) : (
        <div className='full-width'>
          {weekGroups.map((group) => {
            const isCurrentWeek = group.weekNumber === currentWeekNum && group.year === new Date().getFullYear();
            const isOld = isOlderThanOneMonth(group);
            const isLoaded = loadedOldWeeks.has(group.key);

            return (
              <div key={group.key} className='full-width' style={{ marginBottom: '32px' }}>
                <div className='flex-center-spacebetween' style={{
                  padding: '10px 14px',
                  backgroundColor: isCurrentWeek ? 'var(--accent, #4F46E5)' : 'var(--white-1, #f5f5f5)',
                  color: isCurrentWeek ? 'white' : 'inherit',
                  borderRadius: 'var(--br, 6px)',
                  marginBottom: '8px',
                }}>
                  <strong>{group.weekLabel}{isCurrentWeek ? ' — Current' : ''}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span>{formatTime(group.totalSeconds)}</span>
                    {billableRate && (
                      <span style={{ color: isCurrentWeek ? 'rgba(255,255,255,0.85)' : 'green' }}>
                        ${((group.totalSeconds / 3600) * billableRate).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {isOld && !isLoaded && !isDateRangeActive ? (
                  <button
                    className='system-button'
                    style={{ width: '100%', padding: '10px', opacity: 0.6 }}
                    onClick={() => setLoadedOldWeeks(prev => new Set([...prev, group.key]))}
                  >
                    Load {group.entries.length} entries from {group.weekLabel}
                  </button>
                ) : (
                  <table className='full-width'>
                    {renderTableHeader()}
                    <tbody>
                      {group.entries.map(renderEntryRow)}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}