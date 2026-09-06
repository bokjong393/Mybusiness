/* Tests for the deterministic financial engine.
 *
 * The whole product rests on these numbers being right. The humour is only
 * defensible because the arithmetic underneath it is.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  simulateRunway, calculateDailyBurn, applyShock, runwayDelta,
  daysBetween, addDays, toAmount, SIMULATION_HORIZON, MAX_HORIZON
} from '../lib/sapaEngine.js';
import { getRiskLevel, getEdgeCaseHeadline, RISK_LEVELS } from '../lib/riskLevels.js';
import { cashBand, spendingBand, runwayBand, survivalBand } from '../lib/bands.js';

const START = new Date(2026, 8, 6); // 6 September 2026, fixed so tests never drift

test('daily burn is weekly spending divided by seven', () => {
  assert.equal(calculateDailyBurn(7000), 1000);
  assert.equal(calculateDailyBurn(31500), 4500);
  assert.equal(calculateDailyBurn(0), 0);
});

test('simple runway: cash divided by daily burn', () => {
  // ₦70,000 at ₦10,000/week = ₦1,428.57/day → 49 days
  const r = simulateRunway({ currentCash: 70000, weeklySpending: 10000, startDate: START });
  assert.equal(r.runwayDays, 49);
  assert.equal(r.survives, false);
  assert.equal(r.sapaDate.getTime(), addDays(START, 49).getTime());
});

test('zero cash means Sapa has already arrived, not a countdown', () => {
  const r = simulateRunway({ currentCash: 0, weeklySpending: 20000, startDate: START });
  assert.equal(r.runwayDays, 0);
  assert.equal(r.survives, false);
  assert.equal(r.sapaDate.getTime(), START.getTime());
});

test('negative cash is treated as already broke', () => {
  const r = simulateRunway({ currentCash: -5000, weeklySpending: 10000, startDate: START });
  assert.equal(r.runwayDays, 0);
  assert.equal(r.survives, false);
});

test('zero spending with no expenses means the money never runs out', () => {
  const r = simulateRunway({ currentCash: 50000, weeklySpending: 0, startDate: START });
  assert.equal(r.survives, true);
  assert.equal(r.runwayDays, null);
  assert.equal(r.sapaDate, null);
  assert.equal(r.endingBalance, 50000);
});

test('zero spending still runs out if a scheduled expense is large enough', () => {
  const r = simulateRunway({
    currentCash: 50000, weeklySpending: 0, startDate: START,
    expenses: [{ amount: 60000, day: 10 }]
  });
  assert.equal(r.runwayDays, 10);
});

test('future income extends the runway', () => {
  const base = simulateRunway({ currentCash: 70000, weeklySpending: 14000, startDate: START });
  const withIncome = simulateRunway({
    currentCash: 70000, weeklySpending: 14000, startDate: START,
    income: [{ amount: 40000, day: 20 }]
  });
  assert.ok(withIncome.runwayDays > base.runwayDays, 'income should push Sapa further away');
  assert.equal(base.runwayDays, 35);   // 70000 / 2000 per day
  assert.equal(withIncome.runwayDays, 55); // + 40000 / 2000
});

test('future expense moves Sapa closer', () => {
  const base = simulateRunway({ currentCash: 70000, weeklySpending: 14000, startDate: START });
  const withExpense = simulateRunway({
    currentCash: 70000, weeklySpending: 14000, startDate: START,
    expenses: [{ amount: 20000, day: 10 }]
  });
  assert.equal(base.runwayDays, 35);
  assert.equal(withExpense.runwayDays, 25);
  assert.ok(withExpense.runwayDays < base.runwayDays);
});

test('the documented demo scenario produces the documented forecast', () => {
  // ₦85,000, ₦31,500/week, ₦20,000 out on day 9, ₦70,000 in on day 19.
  // The income never arrives — the money runs out on day 15 first.
  const r = simulateRunway({
    currentCash: 85000, weeklySpending: 31500, startDate: START,
    expenses: [{ amount: 20000, day: 9 }],
    income: [{ amount: 70000, day: 19 }]
  });
  assert.equal(r.dailyBurn, 4500);
  assert.equal(r.runwayDays, 15);
  assert.equal(getRiskLevel(r.runwayDays).id, 'number');
});

test('income landing on the day money would run out rescues the day', () => {
  // ₦7,000 at ₦7,000/week = ₦1,000/day, so day 7 would end at zero.
  const withoutIncome = simulateRunway({ currentCash: 7000, weeklySpending: 7000, startDate: START });
  assert.equal(withoutIncome.runwayDays, 7);

  const withIncome = simulateRunway({
    currentCash: 7000, weeklySpending: 7000, startDate: START,
    income: [{ amount: 10000, day: 7 }]
  });
  assert.ok(withIncome.runwayDays > 7, 'same-day income must be credited before the check');
  assert.equal(withIncome.runwayDays, 17);
});

test('scheduled items can be given as dates instead of day offsets', () => {
  const byDay = simulateRunway({
    currentCash: 70000, weeklySpending: 14000, startDate: START,
    expenses: [{ amount: 20000, day: 10 }]
  });
  const byDate = simulateRunway({
    currentCash: 70000, weeklySpending: 14000, startDate: START,
    expenses: [{ amount: 20000, date: addDays(START, 10) }]
  });
  assert.equal(byDate.runwayDays, byDay.runwayDays);
});

test('past-dated and malformed schedule entries are ignored, not crashed on', () => {
  const r = simulateRunway({
    currentCash: 70000, weeklySpending: 14000, startDate: START,
    income: [
      { amount: 50000, day: -5 },              // in the past
      { amount: 'not a number', day: 10 },
      { amount: 0, day: 12 },
      null,
      { amount: 20000, date: 'not a date' }
    ]
  });
  assert.equal(r.runwayDays, 35, 'only valid future entries should affect the result');
});

test('runway is bounded by the simulation horizon', () => {
  const r = simulateRunway({ currentCash: 100000000, weeklySpending: 700, startDate: START });
  assert.equal(r.survives, true);
  assert.equal(r.horizon, SIMULATION_HORIZON);
  assert.equal(r.timeline.length, SIMULATION_HORIZON);
});

test('the horizon can be extended but never past the hard maximum', () => {
  const r = simulateRunway({ currentCash: 1e9, weeklySpending: 700, startDate: START, horizon: 5000 });
  assert.equal(r.horizon, MAX_HORIZON);
  assert.equal(r.timeline.length, MAX_HORIZON);
});

test('shocks re-run the same simulation rather than approximating it', () => {
  const scenario = { currentCash: 70000, weeklySpending: 14000, startDate: START };
  const before = simulateRunway(scenario);

  const emergency = applyShock(scenario, { cashDelta: -30000 });
  assert.equal(emergency.result.runwayDays, 20);
  assert.equal(runwayDelta(before, emergency.result), -15, 'a ₦30k emergency costs 15 days here');

  const raise = applyShock(scenario, { cashDelta: 50000 });
  assert.ok(runwayDelta(before, raise.result) > 0);

  const cut = applyShock(scenario, { spendMultiplier: 0.8 });
  assert.equal(cut.result.runwayDays, 44, 'spending 20% less stretches 35 days to 44');
  assert.ok(runwayDelta(before, cut.result) > 0);

  const costOfLiving = applyShock(scenario, { spendMultiplier: 1.2 });
  assert.ok(runwayDelta(before, costOfLiving.result) < 0);
});

test('a shock can never drive spending or cash negative', () => {
  const scenario = { currentCash: 10000, weeklySpending: 5000, startDate: START };
  const wiped = applyShock(scenario, { cashDelta: -999999, weeklySpendDelta: -999999 });
  assert.equal(wiped.scenario.currentCash, 0);
  assert.equal(wiped.scenario.weeklySpending, 0);
});

test('risk levels cover every day count without gaps or overlaps', () => {
  assert.equal(getRiskLevel(0).id, 'entered');
  assert.equal(getRiskLevel(2).id, 'entered');
  assert.equal(getRiskLevel(3).id, 'outside');
  assert.equal(getRiskLevel(7).id, 'outside');
  assert.equal(getRiskLevel(8).id, 'onway');
  assert.equal(getRiskLevel(14).id, 'onway');
  assert.equal(getRiskLevel(15).id, 'number');
  assert.equal(getRiskLevel(30).id, 'number');
  assert.equal(getRiskLevel(31).id, 'softlife');
  assert.equal(getRiskLevel(59).id, 'softlife');
  assert.equal(getRiskLevel(60).id, 'invisible');
  assert.equal(getRiskLevel(null).id, 'invisible', 'surviving the horizon is the safest band');

  for (let days = 0; days <= 400; days++) {
    assert.ok(getRiskLevel(days), `no risk level matched ${days} days`);
  }
  assert.equal(RISK_LEVELS.length, 6);
});

test('edge-case headlines fire for the three special situations', () => {
  const broke = simulateRunway({ currentCash: 0, weeklySpending: 10000, startDate: START });
  assert.match(getEdgeCaseHeadline({ currentCash: 0, weeklySpending: 10000, result: broke }), /ALREADY ENTERED/);

  const noSpend = simulateRunway({ currentCash: 50000, weeklySpending: 0, startDate: START });
  assert.match(getEdgeCaseHeadline({ currentCash: 50000, weeklySpending: 0, result: noSpend }), /CANNOT SEE YOU/);

  const safe = simulateRunway({ currentCash: 5000000, weeklySpending: 7000, startDate: START });
  assert.match(getEdgeCaseHeadline({ currentCash: 5000000, weeklySpending: 7000, result: safe }), /NO IMMEDIATE SAPA/);

  const normal = simulateRunway({ currentCash: 70000, weeklySpending: 14000, startDate: START });
  assert.equal(getEdgeCaseHeadline({ currentCash: 70000, weeklySpending: 14000, result: normal }), null);
});

test('messy user input is coerced rather than trusted', () => {
  assert.equal(toAmount('85,000'), 85000);
  assert.equal(toAmount('₦31,500'), 31500);
  assert.equal(toAmount(''), 0);
  assert.equal(toAmount(undefined), 0);
  assert.equal(toAmount(NaN), 0);
  assert.equal(toAmount(Infinity), 0);

  const r = simulateRunway({ currentCash: '70,000', weeklySpending: '₦14,000', startDate: START });
  assert.equal(r.runwayDays, 35, 'formatted strings should still calculate');
});

test('the engine is pure: same input, same output, no mutation', () => {
  const scenario = {
    currentCash: 70000, weeklySpending: 14000, startDate: START,
    income: [{ amount: 10000, day: 5 }], expenses: [{ amount: 5000, day: 3 }]
  };
  const snapshot = JSON.stringify(scenario);
  const a = simulateRunway(scenario);
  const b = simulateRunway(scenario);
  assert.equal(a.runwayDays, b.runwayDays);
  assert.equal(JSON.stringify(scenario), snapshot, 'the engine must not mutate its input');
});

test('date helpers are calendar-correct across a month boundary', () => {
  assert.equal(daysBetween(new Date(2026, 8, 6), new Date(2026, 8, 21)), 15);
  assert.equal(daysBetween(new Date(2026, 8, 25), new Date(2026, 9, 5)), 10);
  assert.equal(addDays(new Date(2026, 8, 25), 10).getDate(), 5);
  assert.equal(addDays(new Date(2026, 8, 25), 10).getMonth(), 9);
});

test('bands widen figures before they could reach analytics', () => {
  assert.equal(cashBand(9999), 'under-10000');
  assert.equal(cashBand(85000), '50000-100000');
  assert.equal(cashBand(9999999), '250000-plus');
  assert.equal(spendingBand(31500), '20000-50000');
  assert.equal(runwayBand(0), '0-2');
  assert.equal(runwayBand(15), '15-30');
  assert.equal(runwayBand(null), '60-plus');
  assert.equal(survivalBand(30), 'full-30');
  assert.equal(survivalBand(9), '8-14');

  // A band must never be reversible to the original figure.
  assert.equal(cashBand(50001), cashBand(99999));
});
