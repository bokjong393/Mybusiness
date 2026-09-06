/* Privacy-safe categorisation.
 *
 * Analytics never receives a real naira figure. Everything is widened into a
 * band before it leaves the browser, so product questions stay answerable
 * ("how many users are in real trouble?") without the database ever holding
 * anybody's actual balance.
 */

export function cashBand(amount) {
  const n = Number(amount) || 0;
  if (n < 10000) return 'under-10000';
  if (n < 25000) return '10000-25000';
  if (n < 50000) return '25000-50000';
  if (n < 100000) return '50000-100000';
  if (n < 250000) return '100000-250000';
  return '250000-plus';
}

export function spendingBand(amount) {
  const n = Number(amount) || 0;
  if (n < 5000) return 'under-5000';
  if (n < 10000) return '5000-10000';
  if (n < 20000) return '10000-20000';
  if (n < 50000) return '20000-50000';
  if (n < 100000) return '50000-100000';
  return '100000-plus';
}

export function runwayBand(days) {
  if (days === null || days === undefined) return '60-plus';
  const n = Math.max(0, Math.floor(Number(days) || 0));
  if (n <= 2) return '0-2';
  if (n <= 7) return '3-7';
  if (n <= 14) return '8-14';
  if (n <= 30) return '15-30';
  if (n <= 60) return '31-60';
  return '60-plus';
}

export function survivalBand(days) {
  const n = Math.max(0, Math.floor(Number(days) || 0));
  if (n <= 7) return '0-7';
  if (n <= 14) return '8-14';
  if (n <= 21) return '15-21';
  if (n <= 29) return '22-29';
  return 'full-30';
}
