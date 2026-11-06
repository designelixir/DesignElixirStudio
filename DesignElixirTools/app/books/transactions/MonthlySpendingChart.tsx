'use client';

import { useMemo, useState } from 'react';
import { ExpenseCategory, Transaction } from '@/types/globalTypes';
import { computeCategoryTotals } from '../categories/categoryTotals';

interface MonthlySpendingChartProps {
  transactions: Transaction[]; // all transactions; the ones in `year` are used
  categories: ExpenseCategory[];
  year: number;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const compact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Chart geometry (SVG units; the SVG scales to its container's width)
const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };
const LINE = '#333399';  // your navy
const SURFACE = '#ffffff';

// A "nice" top for the y-axis, e.g. 3,412 → 4,000
function niceMax(value: number) {
  if (value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s * 4 >= value) ?? magnitude * 10;
  return step * 4;
}

// Spending per month for the year, as a line. "Spending" uses the same rule as
// the categories page: purchases minus returns, not counting payments/credits.
export default function MonthlySpendingChart({ transactions, categories, year }: MonthlySpendingChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const months = useMemo(() => {
    const now = new Date();
    const lastMonth = year === now.getFullYear() ? now.getMonth() : 11; // up to this month
    return Array.from({ length: lastMonth + 1 }, (_, m) => {
      const from = new Date(year, m, 1).getTime();
      const to = new Date(year, m + 1, 1).getTime();
      const inMonth = transactions.filter((t) => {
        const time = new Date(t.date).getTime();
        return time >= from && time < to;
      });
      return { month: m, spent: computeCategoryTotals(inMonth, categories).totalSpent, count: inMonth.length };
    });
  }, [transactions, categories, year]);

  if (months.length === 0) return <p style={{ color: '#666' }}>No months to show yet.</p>;

  const total = months.reduce((sum, m) => sum + m.spent, 0);
  // Average over finished months that have transactions (this month is still
  // going, and a month with nothing imported yet would drag it down)
  const now = new Date();
  const finished = months.filter(
    (m) => m.count > 0 && !(year === now.getFullYear() && m.month === now.getMonth())
  );
  const average = finished.length ? finished.reduce((sum, m) => sum + m.spent, 0) / finished.length : null;
  const yMax = niceMax(Math.max(...months.map((m) => m.spent)));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  // Months spread across the full year's width so the axis stays Jan–Dec
  const x = (m: number) => PAD.left + (plotW * m) / 11;
  const y = (v: number) => PAD.top + plotH - (plotH * v) / yMax;
  const ticks = [0, 1, 2, 3, 4].map((i) => (yMax * i) / 4);
  const path = months.map((m, i) => `${i === 0 ? 'M' : 'L'} ${x(m.month)} ${y(m.spent)}`).join(' ');
  const peak = months.reduce((a, b) => (b.spent > a.spent ? b : a));
  const hovered = hover !== null ? months[hover] : null;

  return (
    <div>
      <h6 style={{ margin: '0 0 4px' }}>Spending by month · {year}</h6>
      <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#666' }}>
        {currency.format(total)} so far
        {average !== null && ` · ${currency.format(average)} average per month`}
      </p>

      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width='100%'
          role='img'
          aria-label={`Spending by month in ${year}`}
          onMouseLeave={() => setHover(null)}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* Recessive grid + y labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke='#ececec' strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor='end' fontSize='11' fill='#888'>
                {compact.format(t)}
              </text>
            </g>
          ))}
          {/* Month labels */}
          {MONTHS.map((label, m) => (
            <text key={label} x={x(m)} y={H - 8} textAnchor='middle' fontSize='11' fill={m < months.length ? '#888' : '#ccc'}>
              {label}
            </text>
          ))}

          {/* Crosshair */}
          {hovered && (
            <line x1={x(hovered.month)} x2={x(hovered.month)} y1={PAD.top} y2={PAD.top + plotH} stroke='#bbb' strokeWidth={1} strokeDasharray='3 3' />
          )}

          {/* The line, then points with a surface ring */}
          <path d={path} fill='none' stroke={LINE} strokeWidth={2} strokeLinejoin='round' strokeLinecap='round' />
          {months.map((m) => (
            <circle
              key={m.month}
              cx={x(m.month)}
              cy={y(m.spent)}
              r={hover === m.month ? 6 : 4}
              fill={LINE}
              stroke={SURFACE}
              strokeWidth={2}
            />
          ))}

          {/* Direct label on the highest month only */}
          {hover === null && peak.spent > 0 && (
            <text x={x(peak.month)} y={y(peak.spent) - 10} textAnchor='middle' fontSize='11' fill='#333'>
              {compact.format(peak.spent)}
            </text>
          )}

          {/* Hover targets: one full-height band per month (bigger than the point) */}
          {months.map((m) => (
            <rect
              key={m.month}
              x={x(m.month) - plotW / 22}
              y={PAD.top}
              width={plotW / 11}
              height={plotH}
              fill='transparent'
              onMouseEnter={() => setHover(m.month)}
            >
              <title>{`${MONTHS[m.month]} ${year}: ${currency.format(m.spent)}`}</title>
            </rect>
          ))}
        </svg>

        {/* Tooltip */}
        {hovered && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${(x(hovered.month) / W) * 100}%`,
              transform: `translateX(${hovered.month > 8 ? '-100%' : hovered.month < 2 ? '0' : '-50%'})`,
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '5px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              padding: '6px 10px',
              fontSize: '12px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ color: '#666' }}>{MONTHS[hovered.month]} {year}</div>
            <strong>{currency.format(hovered.spent)}</strong>
          </div>
        )}
      </div>

      {/* The same numbers as a table */}
      <details style={{ marginTop: '8px', fontSize: '13px' }}>
        <summary style={{ cursor: 'pointer', color: '#666' }}>Show as table</summary>
        <table style={{ width: 'auto', marginTop: '6px' }}>
          <tbody>
            {months.map((m) => (
              <tr key={m.month}>
                <td style={{ padding: '3px 10px' }}>{MONTHS[m.month]}</td>
                <td style={{ padding: '3px 10px', textAlign: 'right' }}>{currency.format(m.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
