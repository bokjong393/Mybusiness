/* SAPA — deterministic financial engine
 *
 * THE PRODUCT RULE: no language model ever produces a number here. Every
 * naira value, runway length, Sapa date and shock impact is computed by a
 * day-by-day simulation in this file. AI only ever describes what this
 * engine already decided.
 *
 * Every function is pure: same inputs, same outputs, no I/O, no clock reads
 * except the explicit `startDate` you pass in.
 */

export const SIMULATION_HORIZON = 365;
export const MAX_HORIZON = 730;

/* Repeated subtraction of a non-terminating daily burn leaves floating-point
 * residue: ₦70,000 at ₦10,000/week is exactly 49 days, but subtracting
 * 1428.571... forty-nine times ends on +1.4e-11 rather than 0, which would
 * report the Sapa date a day late. Anything under a millionth of a naira is
 * not money, so treat it as depleted. */
const DEPLETED = 1e-6;

/** Weekly spending converted to a daily burn rate. */
export function calculateDailyBurn(weeklySpending) {
  const weekly = toAmount(weeklySpending);
  return weekly / 7;
}

/** Coerce anything the UI hands us into a safe, finite, non-negative number. */
export function toAmount(value) {
  const n = typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) : Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
}

/** Whole days between two dates, ignoring clock time. */
export function daysBetween(from, to) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

export function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/* Scheduled cash movements are normalised to "day offset from today", so the
 * simulation never has to reason about calendars mid-loop. */
function normaliseSchedule(entries, startDate) {
  return (entries || [])
    .map((entry) => {
      const amount = toAmount(entry?.amount);
      if (amount <= 0) return null;
      let day = entry?.day;
      if (day == null && entry?.date) {
        const parsed = entry.date instanceof Date ? entry.date : new Date(entry.date);
        if (Number.isNaN(parsed.getTime())) return null;
        day = daysBetween(startDate, parsed);
      }
      day = Math.round(Number(day));
      if (!Number.isFinite(day) || day < 0) return null;
      return { day, amount };
    })
    .filter(Boolean);
}

/**
 * Simulate the balance one day at a time.
 *
 * Order within a day matters and is deliberate: spend first, then receive
 * income, then pay scheduled expenses. Income landing on the same day money
 * runs out should rescue you — that is how a real bank balance behaves.
 *
 * @returns {{
 *   runwayDays: number|null, survives: boolean, sapaDate: Date|null,
 *   startingBalance: number, dailyBurn: number, endingBalance: number,
 *   timeline: Array<{day:number, balance:number, income:number, expense:number}>,
 *   lowestBalance: number, horizon: number
 * }}
 */
export function simulateRunway({
  currentCash,
  weeklySpending,
  income = [],
  expenses = [],
  startDate = new Date(),
  horizon = SIMULATION_HORIZON
} = {}) {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const cappedHorizon = Math.min(Math.max(Math.round(horizon) || 0, 1), MAX_HORIZON);

  const startingBalance = toAmount(currentCash);
  const dailyBurn = calculateDailyBurn(weeklySpending);
  const incomeByDay = groupByDay(normaliseSchedule(income, start));
  const expenseByDay = groupByDay(normaliseSchedule(expenses, start));

  const timeline = [];
  let balance = startingBalance;
  let runwayDays = null;
  let lowestBalance = balance;

  // Day 0 is today. Already broke means Sapa is not approaching — it arrived.
  if (balance <= 0) {
    return {
      runwayDays: 0,
      survives: false,
      sapaDate: new Date(start.getTime()),
      startingBalance,
      dailyBurn,
      endingBalance: balance,
      timeline: [{ day: 0, balance, income: 0, expense: 0 }],
      lowestBalance: balance,
      horizon: cappedHorizon
    };
  }

  for (let day = 1; day <= cappedHorizon; day++) {
    const dayIncome = incomeByDay.get(day) || 0;
    const dayExpense = expenseByDay.get(day) || 0;

    balance -= dailyBurn;
    balance += dayIncome;
    balance -= dayExpense;

    timeline.push({ day, balance, income: dayIncome, expense: dayExpense });
    if (balance < lowestBalance) lowestBalance = balance;

    if (balance <= DEPLETED && runwayDays === null) {
      runwayDays = day;
      break;
    }
  }

  const survives = runwayDays === null;
  return {
    runwayDays,
    survives,
    sapaDate: survives ? null : addDays(start, runwayDays),
    startingBalance,
    dailyBurn,
    endingBalance: balance,
    timeline,
    lowestBalance,
    horizon: cappedHorizon
  };
}

function groupByDay(entries) {
  const map = new Map();
  for (const entry of entries) {
    map.set(entry.day, (map.get(entry.day) || 0) + entry.amount);
  }
  return map;
}

/** The date the money runs out, or null if it never does inside the horizon. */
export function calculateSapaDate(scenario) {
  return simulateRunway(scenario).sapaDate;
}

/**
 * Re-run the simulation with a modification applied. Used by Sapa Lab and by
 * the battle engine, so a "what if" always goes through the same maths as the
 * original forecast rather than a separate approximation.
 *
 * shock: { cashDelta, spendMultiplier, weeklySpendDelta, extraIncome:[], extraExpenses:[] }
 */
export function applyShock(scenario, shock = {}) {
  const next = {
    ...scenario,
    currentCash: toAmount(scenario.currentCash) + toAmount(shock.cashDelta),
    weeklySpending:
      toAmount(scenario.weeklySpending) * (Number.isFinite(shock.spendMultiplier) ? shock.spendMultiplier : 1)
      + toAmount(shock.weeklySpendDelta),
    income: [...(scenario.income || []), ...(shock.extraIncome || [])],
    expenses: [...(scenario.expenses || []), ...(shock.extraExpenses || [])]
  };
  if (next.weeklySpending < 0) next.weeklySpending = 0;
  if (next.currentCash < 0) next.currentCash = 0;
  return { scenario: next, result: simulateRunway(next) };
}

/** Difference in runway days between two results; positive = Sapa retreated. */
export function runwayDelta(before, after) {
  const b = before.runwayDays === null ? before.horizon : before.runwayDays;
  const a = after.runwayDays === null ? after.horizon : after.runwayDays;
  return a - b;
}
