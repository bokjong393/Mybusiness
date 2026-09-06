/* Tests for the Battle Royale engine.
 *
 * The game is only fair if its consequences are deterministic and its runway
 * maths agrees with the Sapa Meter the player was shown beforehand.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createBattleScenario, selectRandomEvents, applyBattleChoice,
  calculatePlayerScores, determineRank, generateBattleSummary,
  daysBeyondForecast, makeRandom, RANKS,
  DEFAULT_START_CASH, DEFAULT_WEEKLY_BURN
} from '../lib/battleEngine.js';
import { BATTLE_EVENTS, EVENTS_PER_BATTLE, BATTLE_DAYS } from '../data/battleEvents.js';
import { simulateRunway } from '../lib/sapaEngine.js';

const START = new Date(2026, 8, 6);
const scenarioOf = (over = {}) => ({ currentCash: 85000, weeklySpending: 31500, startDate: START, ...over });

/** Play a whole battle, choosing options by index. */
function playThrough(state, chooseIndex) {
  let current = state;
  const changes = [];
  while (current.status === 'playing') {
    const event = current.events[current.step];
    const option = event.options[Math.min(chooseIndex(event, current), event.options.length - 1)];
    const outcome = applyBattleChoice(current, event, option);
    current = outcome.state;
    changes.push(outcome.change);
  }
  return { state: current, changes };
}

test('the event deck meets the spec and is well-formed', () => {
  assert.ok(BATTLE_EVENTS.length >= 25, `expected at least 25 events, found ${BATTLE_EVENTS.length}`);

  const ids = new Set();
  for (const event of BATTLE_EVENTS) {
    assert.ok(event.id && !ids.has(event.id), `duplicate or missing event id: ${event.id}`);
    ids.add(event.id);
    assert.ok(event.title && event.prompt && event.category, `${event.id} is missing copy`);
    assert.ok(event.options.length >= 2, `${event.id} needs a real choice`);

    const optionIds = new Set();
    for (const option of event.options) {
      assert.ok(option.id && !optionIds.has(option.id), `${event.id}: duplicate option id`);
      optionIds.add(option.id);
      assert.equal(typeof option.cashDelta, 'number', `${event.id}/${option.id}: cashDelta must be a number`);
      assert.ok(Number.isFinite(option.cashDelta));
      assert.ok(option.scores, `${event.id}/${option.id}: missing score deltas`);
    }
  }

  // The deck should span the categories the design calls for.
  const categories = new Set(BATTLE_EVENTS.map((e) => e.category));
  for (const required of ['unavoidable', 'optional', 'income', 'emergency', 'social', 'opportunity', 'shock', 'surprise']) {
    assert.ok(categories.has(required), `deck is missing the "${required}" category`);
  }
});

test('a battle draws distinct events spread across the month', () => {
  const events = selectRandomEvents(EVENTS_PER_BATTLE, 1234);
  assert.equal(events.length, EVENTS_PER_BATTLE);
  assert.equal(new Set(events.map((e) => e.id)).size, EVENTS_PER_BATTLE, 'no event should repeat in one battle');

  const days = events.map((e) => e.day);
  assert.deepEqual(days, [...days].sort((a, b) => a - b), 'events must arrive in day order');
  assert.ok(days[0] >= 1);
  assert.ok(days[days.length - 1] <= BATTLE_DAYS);
});

test('the same seed always deals the same battle', () => {
  const a = selectRandomEvents(EVENTS_PER_BATTLE, 99);
  const b = selectRandomEvents(EVENTS_PER_BATTLE, 99);
  const c = selectRandomEvents(EVENTS_PER_BATTLE, 100);
  assert.deepEqual(a.map((e) => e.id), b.map((e) => e.id));
  assert.notDeepEqual(a.map((e) => e.id), c.map((e) => e.id));
});

test('the seeded generator is uniform enough to shuffle fairly', () => {
  const random = makeRandom(7);
  const values = Array.from({ length: 2000 }, () => random());
  assert.ok(values.every((v) => v >= 0 && v < 1), 'values must stay in [0,1)');
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  assert.ok(Math.abs(mean - 0.5) < 0.05, `mean drifted to ${mean}`);
});

test('the battle baseline matches the Sapa Meter for the same scenario', () => {
  // If these ever disagree, the player is asked to beat a different number
  // from the one they were shown.
  const scenario = scenarioOf();
  const meter = simulateRunway(scenario);
  const battle = createBattleScenario(scenario, { seed: 5 });
  assert.equal(battle.originalRunway, meter.runwayDays);
  assert.equal(battle.originalSapaDate.getTime(), meter.sapaDate.getTime());
});

test('entering without a Meter scenario uses the documented defaults', () => {
  const battle = createBattleScenario({}, { seed: 5 });
  assert.equal(battle.scenario.currentCash, DEFAULT_START_CASH);
  assert.equal(battle.scenario.weeklySpending, DEFAULT_WEEKLY_BURN);
  assert.equal(battle.balance, DEFAULT_START_CASH);
});

test('spending money moves Sapa closer and earning pushes it away', () => {
  const state = createBattleScenario(scenarioOf(), { seed: 11 });
  const event = state.events[0];

  const cost = { id: 'x', label: 'Spend', cashDelta: -30000, scores: {} };
  const gain = { id: 'y', label: 'Earn', cashDelta: 30000, scores: {} };

  const spent = applyBattleChoice(state, event, cost);
  const earned = applyBattleChoice(state, event, gain);

  assert.ok(spent.change.dayShift < 0, 'spending should shorten the runway');
  assert.equal(spent.change.direction, 'closer');
  assert.ok(earned.change.dayShift > 0, 'earning should lengthen it');
  assert.equal(earned.change.direction, 'retreat');
  assert.equal(spent.state.balance, state.balance - 30000);
});

test('a permanent spending increase also shortens the runway', () => {
  const state = createBattleScenario(scenarioOf(), { seed: 12 });
  const event = state.events[0];
  const outcome = applyBattleChoice(state, event, {
    id: 'z', label: 'Fare rise', cashDelta: 0, weeklySpendDelta: 7000, scores: {}
  });
  assert.equal(outcome.state.balance, state.balance, 'no cash moved');
  assert.ok(outcome.change.dayShift < 0, 'but the burn rate rose, so Sapa is closer');
  assert.equal(outcome.state.weeklySpending, state.weeklySpending + 7000);
});

test('scores stay inside 0-100 no matter how extreme the choices', () => {
  let state = createBattleScenario(scenarioOf(), { seed: 13 });
  const brutal = { id: 'b', label: 'Bad', cashDelta: -1000, scores: { discipline: -999, risk: -999, impulse: -999, energy: -999 } };
  const saintly = { id: 's', label: 'Good', cashDelta: 1000, scores: { discipline: 999, risk: 999, impulse: 999, energy: 999 } };

  let low = applyBattleChoice(state, state.events[0], brutal).state;
  for (const value of Object.values(low.scores)) assert.equal(value, 0);

  let high = applyBattleChoice(state, state.events[0], saintly).state;
  for (const value of Object.values(high.scores)) assert.equal(value, 100);

  const summary = calculatePlayerScores(high);
  assert.equal(summary.overall, 100);
});

test('weekly spending can never be driven below zero', () => {
  const state = createBattleScenario(scenarioOf(), { seed: 14 });
  const outcome = applyBattleChoice(state, state.events[0], {
    id: 'q', label: 'Impossible cut', cashDelta: 0, weeklySpendDelta: -999999, scores: {}
  });
  assert.equal(outcome.state.weeklySpending, 0);
});

test('running out of money ends the battle as a failure', () => {
  let state = createBattleScenario({ currentCash: 20000, weeklySpending: 21000, startDate: START }, { seed: 15 });
  const outcome = applyBattleChoice(state, state.events[0], {
    id: 'ruin', label: 'Ruin', cashDelta: -25000, scores: {}
  });
  assert.equal(outcome.state.status, 'failed');
  assert.ok(outcome.state.balance <= 0);

  const summary = generateBattleSummary(outcome.state);
  assert.equal(summary.status, 'failed');
  assert.equal(summary.finalBalance, 0, 'a negative balance is reported as zero, not as debt');
});

test('answering every event without going broke ends as survived', () => {
  const state = createBattleScenario({ currentCash: 400000, weeklySpending: 14000, startDate: START }, { seed: 16 });
  const { state: final } = playThrough(state, (event) => {
    // Always take the least damaging option available.
    let best = 0;
    event.options.forEach((option, index) => {
      if (option.cashDelta > event.options[best].cashDelta) best = index;
    });
    return best;
  });
  assert.equal(final.status, 'survived');
  assert.equal(final.history.length, EVENTS_PER_BATTLE);
  assert.equal(final.day, BATTLE_DAYS);
});

test('ranks are deterministic and cover both outcomes', () => {
  const survivor = createBattleScenario({ currentCash: 500000, weeklySpending: 7000, startDate: START }, { seed: 17 });
  const { state: won } = playThrough(survivor, (event) => {
    let best = 0;
    event.options.forEach((option, index) => {
      if (option.cashDelta > event.options[best].cashDelta) best = index;
    });
    return best;
  });
  const rank = determineRank(won);
  assert.ok(RANKS.some((r) => r.id === rank.id));
  assert.ok(['minister', 'strategist', 'veteran', 'grace'].includes(rank.id), `survivor got ${rank.id}`);

  // Same state ranked twice must give the same answer.
  assert.equal(determineRank(won).id, rank.id);

  const doomed = createBattleScenario({ currentCash: 12000, weeklySpending: 21000, startDate: START }, { seed: 18 });
  const failed = applyBattleChoice(doomed, doomed.events[0], {
    id: 'end', label: 'End', cashDelta: -20000, scores: {}
  }).state;
  assert.equal(determineRank(failed).id, 'ancestor', 'failing in the first few events is the worst rank');
});

test('the summary reports best, worst and biggest shock honestly', () => {
  let state = createBattleScenario(scenarioOf({ currentCash: 300000 }), { seed: 19 });
  const event = state.events[0];

  state = applyBattleChoice(state, event, { id: 'a', label: 'Windfall', cashDelta: 60000, scores: {} }).state;
  state = applyBattleChoice(state, state.events[1], { id: 'b', label: 'Disaster', cashDelta: -50000, scores: {} }).state;
  state = applyBattleChoice(state, state.events[2], { id: 'c', label: 'Small', cashDelta: -1000, scores: {} }).state;

  const summary = generateBattleSummary(state);
  assert.equal(summary.bestDecision.optionLabel, 'Windfall');
  assert.equal(summary.worstDecision.optionLabel, 'Disaster');
  assert.equal(summary.biggestShock.optionLabel, 'Disaster');
  assert.equal(summary.decisionCount, 3);
});

test('days beyond forecast is measured against the player own original forecast', () => {
  const state = createBattleScenario(scenarioOf(), { seed: 20 });
  assert.equal(state.originalRunway, 19);

  const survived = { ...state, status: 'survived', day: BATTLE_DAYS };
  assert.equal(daysBeyondForecast(survived), BATTLE_DAYS - 19);

  const failedEarly = { ...state, status: 'failed', day: 12 };
  assert.equal(daysBeyondForecast(failedEarly), 12 - 19, 'failing before the forecast is a negative result');
});

test('a full battle never produces a NaN balance or runway', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const start = createBattleScenario(scenarioOf(), { seed });
    const { state: final } = playThrough(start, () => 0);
    assert.ok(Number.isFinite(final.balance), `seed ${seed}: balance became ${final.balance}`);
    assert.ok(Number.isFinite(final.weeklySpending), `seed ${seed}: spending became ${final.weeklySpending}`);
    for (const [key, value] of Object.entries(final.scores)) {
      assert.ok(Number.isInteger(value) && value >= 0 && value <= 100, `seed ${seed}: ${key} = ${value}`);
    }
    const summary = generateBattleSummary(final);
    assert.ok(Number.isFinite(summary.daysBeyond));
    assert.ok(summary.rank && summary.rank.label);
  }
});
