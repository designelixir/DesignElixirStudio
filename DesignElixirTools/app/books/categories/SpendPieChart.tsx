'use client';

import { useState } from 'react';

export interface PieSlice {
  key: string;          // category id, or 'other'
  label: string;
  color: string;
  value: number;        // dollars, > 0
  selectable?: boolean; // clicking picks the category (false for "Other")
  detail?: string;      // shown in the legend, e.g. "21 categories"
}

interface SpendPieChartProps {
  slices: PieSlice[];   // largest first
  total: number;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });

const SIZE = 220;
const CENTER = SIZE / 2;
const OUTER = 104;
const INNER = 66; // donut hole, holds the total / hovered slice
const SURFACE = '#ffffff'; // page background, used for the 2px gaps between slices

// Very light colors (e.g. white) need an outline to show up on a white page
function isVeryLight(hex: string) {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return false;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.85;
}

function point(radius: number, angle: number) {
  // angle 0 = 12 o'clock, clockwise
  return [CENTER + radius * Math.sin(angle), CENTER - radius * Math.cos(angle)];
}

function arcPath(start: number, end: number): string {
  // A full circle can't be drawn as one arc; split it in two
  if (end - start >= Math.PI * 2 - 1e-6) {
    return `${arcPath(0, Math.PI)} ${arcPath(Math.PI, Math.PI * 2)}`;
  }
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = point(OUTER, start);
  const [x2, y2] = point(OUTER, end);
  const [x3, y3] = point(INNER, end);
  const [x4, y4] = point(INNER, start);
  return [
    `M ${x1} ${y1}`,
    `A ${OUTER} ${OUTER} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${INNER} ${INNER} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

// Donut of spending by category, with a legend that lists every slice's amount and share
export default function SpendPieChart({ slices, total, selectedKey, onSelect }: SpendPieChartProps) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const focusKey = hoverKey ?? (slices.some((s) => s.key === selectedKey) ? selectedKey : null) ?? null;
  const focused = slices.find((s) => s.key === focusKey) ?? null;

  if (slices.length === 0 || total <= 0) {
    return <p style={{ color: '#666' }}>No spending for these filters.</p>;
  }

  // Each slice starts where the ones before it end (clockwise from 12 o'clock)
  const arcs = slices.map((s, i) => {
    const before = slices.slice(0, i).reduce((sum, p) => sum + p.value, 0);
    const start = (before / total) * Math.PI * 2;
    return { slice: s, start, end: start + (s.value / total) * Math.PI * 2 };
  });

  const choose = (s: PieSlice) => {
    if (s.selectable && onSelect) onSelect(s.key);
  };

  return (
    <div className='flex-center-start flex-wrap' style={{ gap: '30px' }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role='img'
        aria-label={`Spending by category, ${currency.format(total)} total`}
        style={{ flex: 'none' }}
        onMouseLeave={() => setHoverKey(null)}
      >
        {arcs.map(({ slice, start, end }) => {
          const dimmed = focusKey !== null && focusKey !== slice.key;
          return (
            <path
              key={slice.key}
              d={arcPath(start, end)}
              fill={slice.color}
              // 2px surface gap between slices; outline very light colors so they show
              stroke={isVeryLight(slice.color) ? '#bbbbbb' : SURFACE}
              strokeWidth={isVeryLight(slice.color) ? 1 : 2}
              opacity={dimmed ? 0.35 : 1}
              style={{ cursor: slice.selectable && onSelect ? 'pointer' : 'default', transition: 'opacity 0.15s' }}
              onMouseEnter={() => setHoverKey(slice.key)}
              onClick={() => choose(slice)}
            >
              <title>{`${slice.label}: ${currency.format(slice.value)} (${percent.format(slice.value / total)})`}</title>
            </path>
          );
        })}
        {/* Center: the hovered (or selected) slice, otherwise the total */}
        <text x={CENTER} y={CENTER - 12} textAnchor='middle' fontSize='11' fill='#666'>
          {focused ? truncate(focused.label, 18) : 'Total spent'}
        </text>
        <text x={CENTER} y={CENTER + 8} textAnchor='middle' fontSize='17' fontWeight='600' fill='#222'>
          {currency.format(focused ? focused.value : total)}
        </text>
        {focused && (
          <text x={CENTER} y={CENTER + 26} textAnchor='middle' fontSize='11' fill='#666'>
            {percent.format(focused.value / total)}
          </text>
        )}
      </svg>

      {/* Legend: every slice with its amount and share (the readable version of the chart) */}
      <table style={{ width: 'auto', minWidth: '300px' }} onMouseLeave={() => setHoverKey(null)}>
        <tbody>
          {slices.map((s) => {
            const dimmed = focusKey !== null && focusKey !== s.key;
            return (
              <tr
                key={s.key}
                onMouseEnter={() => setHoverKey(s.key)}
                onClick={() => choose(s)}
                style={{ cursor: s.selectable && onSelect ? 'pointer' : 'default', opacity: dimmed ? 0.5 : 1 }}
              >
                <td style={{ padding: '5px 8px', width: '14px' }}>
                  <span
                    style={{
                      display: 'block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      background: s.color,
                      border: isVeryLight(s.color) ? '1px solid #bbb' : undefined,
                    }}
                  />
                </td>
                <td style={{ padding: '5px 8px', fontWeight: s.key === selectedKey ? 600 : undefined }}>
                  {s.label}
                  {s.detail && <span style={{ color: '#999', fontSize: '11px' }}> · {s.detail}</span>}
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{currency.format(s.value)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#666', whiteSpace: 'nowrap' }}>
                  {percent.format(s.value / total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
