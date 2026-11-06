// 'YYYY-MM-DD' → 'Oct 1, 2026' without the UTC shift new Date('YYYY-MM-DD') causes
export function formatDay(day: string | null) {
  if (!day) return '—';
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
