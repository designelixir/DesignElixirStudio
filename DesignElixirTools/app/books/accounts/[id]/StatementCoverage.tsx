'use client';

import { useMemo } from 'react';
import { Statement } from '@/types/globalTypes';
import { formatDay } from '@/app/books/statements/formatDay';

const GREEN = '#3a9d4f';
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// YYYY-MM-DD ⇄ day number (UTC, so daylight saving never shifts a day)
const dayNum = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m, d) / DAY_MS);
const parseDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return dayNum(y, m - 1, d);
};
const toDay = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);
const weekday = (n: number) => new Date(n * DAY_MS).getUTCDay(); // 0 = Sunday

// before = entirely earlier than the first statement; future = entirely after today
type Status = 'full' | 'partial' | 'none' | 'before' | 'future';

interface WeekDot {
  start: number;
  end: number;
  status: Status;
  statements: string[];
}

interface Period {
  start: number;
  end: number;
  name: string;
}

// The month's weeks as Sunday–Saturday rows, cut to the month's own days
function monthWeeks(year: number, month: number): { start: number; end: number }[] {
  const first = dayNum(year, month, 1);
  const last = dayNum(year, month + 1, 0);
  const weeks = [];
  let start = first;
  while (start <= last) {
    const end = Math.min(start + (6 - weekday(start)), last); // through Saturday
    weeks.push({ start, end });
    start = end + 1;
  }
  return weeks;
}

// Only days from the first statement through today count; the dot is green when
// statements cover all of those, half when some, empty when none
function weekStatus(start: number, end: number, firstDay: number, today: number, periods: Period[]): WeekDot {
  if (end < firstDay) return { start, end, status: 'before', statements: [] };
  if (start > today) return { start, end, status: 'future', statements: [] };
  const from = Math.max(start, firstDay);
  const to = Math.min(end, today);
  let covered = 0;
  const names = new Set<string>();
  for (let day = from; day <= to; day++) {
    const hits = periods.filter((p) => day >= p.start && day <= p.end);
    if (hits.length) covered += 1;
    hits.forEach((p) => names.add(p.name));
  }
  const days = to - from + 1;
  return {
    start,
    end,
    status: covered === days ? 'full' : covered > 0 ? 'partial' : 'none',
    statements: [...names],
  };
}

const dotStyle = (status: Status) => ({
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  flex: 'none' as const,
  boxSizing: 'border-box' as const,
  border:
    status === 'before'
      ? '1.5px solid #e2e2e2'
      : status === 'future'
        ? '1.5px dashed #ddd'
        : `1.5px solid ${status === 'none' ? '#bbb' : GREEN}`,
  background:
    status === 'full'
      ? GREEN
      : status === 'partial'
        ? `linear-gradient(90deg, ${GREEN} 50%, transparent 50%)`
        : status === 'before'
          ? '#e2e2e2'
          : 'transparent',
});

const describe = (w: WeekDot) => {
  const range = `${formatDay(toDay(w.start))} – ${formatDay(toDay(w.end))}`;
  switch (w.status) {
    case 'before':
      return `${range}: before the first statement`;
    case 'future':
      return `${range}: not here yet`;
    case 'none':
      return `${range}: no statement`;
    case 'partial':
      return `${range}: partly covered by ${w.statements.join(', ')}`;
    default:
      return `${range}: ${w.statements.join(', ')}`;
  }
};

// A calendar per year: a row per month, a dot per week. Green when a statement
// covers the week, half-filled when only some of it, empty when none, grey
// before the first statement.
export default function StatementCoverage({ statements }: { statements: Statement[] }) {
  const calendar = useMemo(() => {
    const periods: Period[] = statements
      .filter((s) => s.period_start && s.period_end)
      .map((s) => ({ start: parseDay(s.period_start!), end: parseDay(s.period_end!), name: s.name || s.file_name }));
    if (periods.length === 0) return null;

    const firstDay = Math.min(...periods.map((p) => p.start));
    const now = new Date();
    const today = dayNum(now.getFullYear(), now.getMonth(), now.getDate());
    const firstYear = new Date(firstDay * DAY_MS).getUTCFullYear();

    const years = [];
    for (let year = firstYear; year <= now.getFullYear(); year++) {
      years.push({
        year,
        months: MONTHS.map((label, month) => ({
          label,
          weeks: monthWeeks(year, month).map((w) => weekStatus(w.start, w.end, firstDay, today, periods)),
        })),
      });
    }
    const all = years.flatMap((y) => y.months.flatMap((m) => m.weeks));
    return {
      firstDay,
      years,
      missing: all.filter((w) => w.status === 'none').length,
      partial: all.filter((w) => w.status === 'partial').length,
    };
  }, [statements]);

  const undated = statements.filter((s) => !s.period_start || !s.period_end).length;

  return (
    <div className='card no-flex-grow' style={{ background: 'white' }}>
      <h6 style={{ margin: 0 }}>Statement coverage</h6>
      {!calendar ? (
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: '13px' }}>
          No statements with a start and end date yet.
        </p>
      ) : (
        <>
          <p style={{ margin: '4px 0 10px', color: '#666', fontSize: '12px' }}>
            Since {formatDay(toDay(calendar.firstDay))} ·{' '}
            {calendar.missing === 0 && calendar.partial === 0 ? (
              <span style={{ color: GREEN }}>every week covered</span>
            ) : (
              <span style={{ color: '#b35c00' }}>
                {calendar.missing > 0 && `${calendar.missing} week${calendar.missing === 1 ? '' : 's'} missing`}
                {calendar.missing > 0 && calendar.partial > 0 && ', '}
                {calendar.partial > 0 && `${calendar.partial} partly covered`}
              </span>
            )}
          </p>

          <div className='flex-start-start flex-wrap' style={{ gap: '20px' }}>
            {calendar.years.map(({ year, months }) => (
              <div key={year}>
                <strong style={{ fontSize: '12px' }}>{year}</strong>
                <div style={{ marginTop: '4px' }}>
                  {months.map(({ label, weeks }) => (
                    <div key={label} className='flex-center-start' style={{ gap: '3px', height: '14px' }}>
                      <span style={{ fontSize: '10px', color: '#888', width: '24px', flex: 'none' }}>{label}</span>
                      {weeks.map((w) => (
                        <span key={w.start} style={dotStyle(w.status)} title={describe(w)} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className='flex-center-start flex-wrap' style={{ gap: '12px', marginTop: '10px', fontSize: '11px', color: '#666' }}>
            <span className='flex-center-start no-flex-grow' style={{ gap: '4px' }}><span style={dotStyle('full')} /> Covered</span>
            <span className='flex-center-start no-flex-grow' style={{ gap: '4px' }}><span style={dotStyle('partial')} /> Partly covered</span>
            <span className='flex-center-start no-flex-grow' style={{ gap: '4px' }}><span style={dotStyle('none')} /> No statement</span>
            <span className='flex-center-start no-flex-grow' style={{ gap: '4px' }}><span style={dotStyle('before')} /> Before first statement</span>
          </div>
          {undated > 0 && (
            <p style={{ margin: '6px 0 0', color: '#b35c00', fontSize: '11px' }}>
              {undated} statement{undated === 1 ? ' has' : 's have'} no start/end date, so {undated === 1 ? 'it isn’t' : 'they aren’t'} counted.
            </p>
          )}
        </>
      )}
    </div>
  );
}
