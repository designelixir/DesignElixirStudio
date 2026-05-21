// components/SelectableCalendar.tsx
'use client'
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface SelectableCalendarProps {
  value: Date | null;
  onChange: (date: Date) => void;
  label: string | null;
  disabled?: boolean;
  allowFutureDates?: boolean;
  showPassedTimeValue?: boolean;
  showDate?: boolean;
  showTime?: boolean;
}

function localDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}


export default function SelectableCalendar({
  value,
  onChange,
  label,
  disabled = false,
  allowFutureDates = true,
  showPassedTimeValue = false,
  showDate = true,
  showTime = true,
}: SelectableCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<string>('');
  const [tempTime, setTempTime] = useState<string>('');
  const [error, setError] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
  if (value) {
    const dateStr = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
    setTempDate(dateStr);
    setTempTime(timeStr);
  }
}, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setError('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplay = (date: Date | null): string => {
    if (!date) return 'Not set';
    const parts: string[] = [];
    if (showDate) parts.push(date.toLocaleDateString());
    if (showTime) parts.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    return parts.join(' ');
  };

  const handleApply = () => {
    if (tempDate) {
      const timeToUse = tempTime || '23:59';
      const [year, month, day] = tempDate.split('-').map(Number);
      const [hours, minutes] = timeToUse.split(':').map(Number);
      const newDate = new Date(year, month - 1, day, hours, minutes, 0);
      const now = new Date();

      if (!allowFutureDates && newDate > now) {
        setError('Start time cannot be in the future');
        return;
      }

      onChange(newDate);
      setIsOpen(false);
      setError('');
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div className='flex-center-start no-flex-grow'>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="selectable-calendar-button time-bar-input"
        >
          <Image src="/calendar.png" alt="calendar icon" width={26} height={26} style={{ marginTop: '2px' }} />
        </button>
        {showPassedTimeValue && value && <span className='xs-basic-padding'><strong>{formatDisplay(value)}</strong></span>}
      </div>

      {isOpen && !disabled && (
        <div className="calendar-box">
          {showDate && (
            <div className="flex-start-start flex-column" style={{ marginBottom: '10px' }}>
              <label>Date:</label>
              <input className="full-width" type="date" value={tempDate} onChange={(e) => setTempDate(e.target.value)} />
            </div>
          )}
          {showTime && (
            <div className="flex-start-start flex-column" style={{ marginBottom: '15px' }}>
              <label>Time (optional):</label>
              <input className="full-width" type="time" value={tempTime} onChange={(e) => setTempTime(e.target.value)} placeholder="Defaults to 23:59" />
            </div>
          )}
          {error && (
            <div style={{ color: 'red', marginBottom: '10px', fontSize: '14px' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleApply}>Apply</button>
            <button className="system-button" onClick={() => { setIsOpen(false); setError(''); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}