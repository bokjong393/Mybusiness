/* Risk classification and the copy that goes with each band.
 * Pure lookup — the runway number is decided by the engine, never here.
 */

export const RISK_LEVELS = [
  {
    id: 'invisible', min: 60, max: Infinity,
    emoji: '🟢', label: 'SAPA CANNOT SEE YOU',
    tone: 'allclear', weather: 'CLEAR SKIES',
    weatherIcon: '☀️',
    blurb: 'Financial visibility is excellent. Sapa has no idea where you live.'
  },
  {
    id: 'softlife', min: 31, max: 59,
    emoji: '🟢', label: 'SOFT LIFE TERRITORY',
    tone: 'allclear', weather: 'FAIR CONDITIONS',
    weatherIcon: '🌤️',
    blurb: 'Comfortable. Keep an eye on the horizon, but nothing is approaching.'
  },
  {
    id: 'number', min: 15, max: 30,
    emoji: '🟡', label: 'SAPA HAS YOUR NUMBER',
    tone: 'hazard', weather: 'SAPA WATCH',
    weatherIcon: '⛅',
    blurb: 'Conditions are stable but deteriorating. Sapa knows you exist.'
  },
  {
    id: 'onway', min: 8, max: 14,
    emoji: '🟠', label: 'SAPA IS ON THE WAY',
    tone: 'watch', weather: 'SAPA ADVISORY',
    weatherIcon: '🌧️',
    blurb: 'Financial oxygen levels are dropping. Movement detected.'
  },
  {
    id: 'outside', min: 3, max: 7,
    emoji: '🔴', label: 'SAPA IS OUTSIDE',
    tone: 'siren', weather: 'SEVERE SAPA WARNING',
    weatherIcon: '⛈️',
    blurb: 'Sapa is outside asking whether you live here. Do not open the door.'
  },
  {
    id: 'entered', min: 0, max: 2,
    emoji: '☠️', label: 'SAPA HAS ENTERED THE COMPOUND',
    tone: 'siren', weather: 'SAPA MAKING LANDFALL',
    weatherIcon: '🌪️',
    blurb: 'Your account balance has started writing its will.'
  }
];

/** runwayDays === null means the money outlasted the simulation horizon. */
export function getRiskLevel(runwayDays) {
  if (runwayDays === null || runwayDays === undefined) return RISK_LEVELS[0];
  const days = Math.max(0, Math.floor(Number(runwayDays) || 0));
  return RISK_LEVELS.find((level) => days >= level.min && days <= level.max) || RISK_LEVELS[0];
}

/** Headline shown when the situation is not a normal countdown. */
export function getEdgeCaseHeadline({ currentCash, weeklySpending, result }) {
  if (Number(currentCash) <= 0) return 'SAPA HAS ALREADY ENTERED THE COMPOUND ☠️';
  const hasFutureExpense = (result?.timeline || []).some((d) => d.expense > 0);
  if (Number(weeklySpending) === 0 && !hasFutureExpense) return 'SAPA CANNOT SEE YOU 👀';
  if (result?.survives) return 'NO IMMEDIATE SAPA DETECTED';
  return null;
}
