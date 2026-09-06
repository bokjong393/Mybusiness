/* SAPA BATTLE ROYALE — game engine
 *
 * Deterministic throughout. Every choice's financial consequence is applied
 * through the same simulateRunway() the Sapa Meter uses, so a runway shown
 * mid-battle is computed identically to the original forecast — no separate
 * approximation that could disagree with it.
 *
 * Score metrics (discipline / risk / impulse / energy) are GAME metrics.
 * They are not a financial rating of a real person.
 */

import { simulateRunway, toAmount, addDays } from './sapaEngine.js';
import { BATTLE_EVENTS, EVENTS_PER_BATTLE, BATTLE_DAYS } from '../data/battleEvents.js';

export const DEFAULT_START_CASH = 100000;
export const DEFAULT_WEEKLY_BURN = 21000;
const SCORE_START = 50;

/* Seeded PRNG so a battle can be replayed exactly (used by demo mode and by
 * the tests). Math.random() is used only to pick a fresh seed. */
export function makeRandom(seed) {
  let state = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));
  return function random() {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

/** Build the starting state, from a Meter scenario when the player has one. */
export function createBattleScenario(base = {}, options = {}) {
  const startDate = base.startDate instanceof Date ? base.startDate : new Date();
  const scenario = {
    currentCash: toAmount(base.currentCash) > 0 ? toAmount(base.currentCash) : DEFAULT_START_CASH,
    weeklySpending: toAmount(base.weeklySpending) > 0 ? toAmount(base.weeklySpending) : DEFAULT_WEEKLY_BURN,
    // Scheduled items from the Meter carry into the battle so the original
    // forecast the player is trying to beat is the same one they were shown.
    income: base.income ? [...base.income] : [],
    expenses: base.expenses ? [...base.expenses] : [],
    startDate
  };

  const seed = options.seed != null ? options.seed : Math.floor(Math.random() * 2 ** 31);
  const baseline = simulateRunway(scenario);

  return {
    seed,
    scenario,
    startDate,
    baseline,
    originalRunway: baseline.runwayDays === null ? baseline.horizon : baseline.runwayDays,
    originalSapaDate: baseline.sapaDate,
    events: selectRandomEvents(EVENTS_PER_BATTLE, seed),
    step: 0,
    day: 0,
    balance: scenario.currentCash,
    weeklySpending: scenario.weeklySpending,
    scores: { discipline: SCORE_START, risk: SCORE_START, impulse: SCORE_START, energy: SCORE_START },
    history: [],
    status: 'playing'
  };
}

/** Draw `count` distinct events, spread across the 30 days. */
export function selectRandomEvents(count = EVENTS_PER_BATTLE, seed = 1) {
  const random = makeRandom(seed);
  const pool = BATTLE_EVENTS.slice();

  // Fisher-Yates with the seeded generator.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const picked = pool.slice(0, Math.min(count, pool.length));
  const spacing = BATTLE_DAYS / picked.length;
  return picked.map((event, index) => ({
    ...event,
    day: Math.max(1, Math.round((index + 1) * spacing))
  }));
}

/** Runway from wherever the player currently stands. */
export function recalculateRunway(state) {
  const remainingIncome = shiftSchedule(state.scenario.income, state.day);
  const remainingExpenses = shiftSchedule(state.scenario.expenses, state.day);
  return simulateRunway({
    currentCash: state.balance,
    weeklySpending: state.weeklySpending,
    income: remainingIncome,
    expenses: remainingExpenses,
    startDate: addDays(state.startDate, state.day)
  });
}

/* Scheduled items already in the past are dropped; future ones are re-based
 * to the current day so they still land on the correct calendar date. */
function shiftSchedule(entries, currentDay) {
  return (entries || [])
    .map((entry) => ({ ...entry, day: (entry.day ?? 0) - currentDay }))
    .filter((entry) => entry.day > 0);
}

/**
 * Apply one choice. Returns the next state plus a summary of what changed,
 * so the UI can show "Sapa moved N days closer" without recomputing anything.
 */
export function applyBattleChoice(state, event, option) {
  const before = recalculateRunway(state);
  const beforeSapaDate = before.sapaDate;

  const balance = state.balance + toAmount(option.cashDelta);
  let weeklySpending = state.weeklySpending;
  if (Number.isFinite(option.spendMultiplier)) weeklySpending *= option.spendMultiplier;
  if (Number.isFinite(option.weeklySpendDelta)) weeklySpending += option.weeklySpendDelta;
  if (weeklySpending < 0) weeklySpending = 0;

  const scores = { ...state.scores };
  for (const key of Object.keys(scores)) {
    scores[key] = clamp(scores[key] + (option.scores?.[key] || 0));
  }

  const next = {
    ...state,
    balance,
    weeklySpending,
    scores,
    day: event.day,
    step: state.step + 1
  };

  const after = recalculateRunway(next);

  // Compare like with like: both runways measured from the same day.
  const beforeDays = before.runwayDays === null ? before.horizon : before.runwayDays;
  const afterDays = after.runwayDays === null ? after.horizon : after.runwayDays;
  const dayShift = afterDays - beforeDays;

  const record = {
    eventId: event.id,
    eventTitle: event.title,
    category: event.category,
    optionId: option.id,
    optionLabel: option.label,
    cashDelta: toAmount(option.cashDelta),
    dayShift,
    balanceAfter: balance,
    beforeSapaDate,
    afterSapaDate: after.sapaDate,
    direction: dayShift > 0 ? 'retreat' : dayShift < 0 ? 'closer' : 'unchanged'
  };

  next.history = [...state.history, record];
  next.currentRunway = after;

  if (balance <= 0) next.status = 'failed';
  else if (next.step >= state.events.length) next.status = 'survived';

  return { state: next, change: record, before, after };
}

/** Snapshot of the four game metrics. */
export function calculatePlayerScores(state) {
  const { discipline, risk, impulse, energy } = state.scores;
  const overall = Math.round((discipline + risk + impulse + energy) / 4);
  return { discipline, risk, impulse, energy, overall };
}

export const RANKS = [
  { id: 'minister', emoji: '👑', label: 'MINISTER OF FINANCIAL DISCIPLINE',
    note: 'Sapa filed a complaint about you.' },
  { id: 'strategist', emoji: '🧠', label: 'SAPA STRATEGIST',
    note: 'You saw it coming and moved first.' },
  { id: 'veteran', emoji: '🪖', label: 'SAPA VETERAN',
    note: 'Bruised, standing, still solvent.' },
  { id: 'grace', emoji: '😭', label: 'LIVING ON GRACE',
    note: 'You survived. Nobody is sure how.' },
  { id: 'casualty', emoji: '☠️', label: 'SAPA CASUALTY',
    note: 'Sapa located you before the month did.' },
  { id: 'ancestor', emoji: '⚰️', label: 'FINANCIAL ANCESTOR',
    note: 'Your account balance has joined the ancestors.' }
];

const RANK_BY_ID = RANKS.reduce((acc, rank) => ({ ...acc, [rank.id]: rank }), {});

/**
 * Deterministic ranking: survival first, then how far the player beat their
 * own forecast, then discipline. No randomness, no model involvement.
 */
export function determineRank(state) {
  const scores = calculatePlayerScores(state);
  const survived = state.status === 'survived';
  const beat = daysBeyondForecast(state);

  if (!survived) {
    return state.step <= 3 ? RANK_BY_ID.ancestor : RANK_BY_ID.casualty;
  }
  if (beat >= 10 && scores.discipline >= 70) return RANK_BY_ID.minister;
  if (beat >= 5 || scores.discipline >= 65) return RANK_BY_ID.strategist;
  if (beat >= 0) return RANK_BY_ID.veteran;
  return RANK_BY_ID.grace;
}

/** How many days past the original forecast the player actually lasted. */
export function daysBeyondForecast(state) {
  const survivedDays = state.status === 'failed' ? state.day : BATTLE_DAYS;
  return survivedDays - state.originalRunway;
}

/** Everything the result screen and share card need, computed once. */
export function generateBattleSummary(state) {
  const scores = calculatePlayerScores(state);
  const rank = determineRank(state);
  const survivedDays = state.status === 'failed' ? state.day : BATTLE_DAYS;

  const decisions = state.history;
  const best = decisions.reduce((b, d) => (!b || d.dayShift > b.dayShift ? d : b), null);
  const worst = decisions.reduce((w, d) => (!w || d.dayShift < w.dayShift ? d : w), null);
  const shock = decisions.reduce((s, d) => (!s || d.cashDelta < s.cashDelta ? d : s), null);

  return {
    status: state.status,
    survivedDays,
    originalRunway: state.originalRunway,
    daysBeyond: daysBeyondForecast(state),
    finalBalance: Math.max(0, Math.round(state.balance)),
    scores,
    rank,
    bestDecision: best && best.dayShift > 0 ? best : null,
    worstDecision: worst && worst.dayShift < 0 ? worst : null,
    biggestShock: shock && shock.cashDelta < 0 ? shock : null,
    decisionCount: decisions.length
  };
}
