/* Naira formatting. Kept in one place so every surface — HUD, share card,
 * result screen — renders the same figure identically. */

export function formatNaira(amount, { compact = false } = {}) {
  const n = Math.round(Number(amount) || 0);
  if (compact && Math.abs(n) >= 1000000) return `₦${(n / 1000000).toFixed(1)}m`;
  if (compact && Math.abs(n) >= 10000) return `₦${Math.round(n / 1000)}k`;
  return `₦${n.toLocaleString('en-NG')}`;
}

/** Signed, for showing the effect of a choice: "−₦15,000" / "+₦45,000". */
export function formatDelta(amount) {
  const n = Math.round(Number(amount) || 0);
  if (n === 0) return '₦0';
  const sign = n > 0 ? '+' : '−';
  return `${sign}₦${Math.abs(n).toLocaleString('en-NG')}`;
}

export function formatDays(days) {
  if (days === null || days === undefined) return '60+';
  const n = Math.max(0, Math.floor(Number(days) || 0));
  return String(n);
}

export function formatDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long' });
}

export function formatShortDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
}
