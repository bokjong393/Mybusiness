/* Unit tests for the deterministic valuation engine.
 * Run with: npm test   (or: node --test tests/)
 *
 * The engine is the credibility of this project — if the arithmetic is wrong,
 * the joke stops being funny and starts being embarrassing. These tests load
 * the browser files as-is so what ships is exactly what is tested.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

for (const file of ['data.js', 'engine.js']) {
  vm.runInThisContext(fs.readFileSync(new URL(`../assets/js/${file}`, import.meta.url), 'utf8'));
}
const { PayMeEngine: E, PayMeData: D } = globalThis;

test('prices a single task at hours x rate', () => {
  const r = E.compute({ entries: [{ key: 'cooking', hours: 4 }], tier: 'typical' });
  assert.equal(r.lines.length, 1);
  assert.equal(r.lines[0].rate, 1200);
  assert.equal(r.weeklyValue, 4800);
  assert.equal(r.outstanding, 4800);
  assert.equal(r.amountPaid, 0, 'the entire premise is that nothing was paid');
});

test('tier multipliers scale every priced rate', () => {
  const entries = [{ key: 'cleaning', hours: 10 }];
  const low = E.compute({ entries, tier: 'conservative' });
  const mid = E.compute({ entries, tier: 'typical' });
  const high = E.compute({ entries, tier: 'premium' });
  assert.equal(low.weeklyValue, 6000);   // 1000 * 0.6  * 10
  assert.equal(mid.weeklyValue, 10000);  // 1000 * 1.0  * 10
  assert.equal(high.weeklyValue, 17500); // 1000 * 1.75 * 10
  assert.ok(low.weeklyValue < mid.weeklyValue && mid.weeklyValue < high.weeklyValue);
});

test('emotional support counts as hours but is never priced', () => {
  const r = E.compute({ entries: [{ key: 'emotional', hours: 6 }], tier: 'premium' });
  assert.equal(r.totalHours, 6);
  assert.equal(r.pricedHours, 0);
  assert.equal(r.unpricedHours, 6);
  assert.equal(r.weeklyValue, 0);
  assert.equal(r.lines[0].priced, false);
  assert.equal(r.lines[0].rate, null);
});

test('a rate override beats the tier, but cannot price the unpriceable', () => {
  const priced = E.compute({
    entries: [{ key: 'cooking', hours: 2 }],
    tier: 'conservative',
    rateOverrides: { cooking: 5000 }
  });
  assert.equal(priced.weeklyValue, 10000, 'override should win over the tier multiplier');

  const unpriced = E.compute({
    entries: [{ key: 'emotional', hours: 2 }],
    rateOverrides: { emotional: 9999 }
  });
  assert.equal(unpriced.weeklyValue, 0, 'emotional labour stays unpriced by design');
});

test('duplicate categories merge into one payslip line', () => {
  const r = E.compute({ entries: [{ key: 'cooking', hours: 2 }, { key: 'cooking', hours: 3 }] });
  assert.equal(r.lines.length, 1);
  assert.equal(r.lines[0].hours, 5);
  assert.equal(r.weeklyValue, 6000);
});

test('junk input is discarded rather than poisoning the total', () => {
  const r = E.compute({
    entries: [
      { key: 'cooking', hours: 4 },
      { key: 'not_a_real_task', hours: 100 },
      { key: 'cleaning', hours: -5 },
      { key: 'laundry', hours: 'abc' },
      null
    ]
  });
  assert.equal(r.lines.length, 1);
  assert.equal(r.weeklyValue, 4800);
});

test('hours are capped at the length of an actual week', () => {
  const r = E.compute({ entries: [{ key: 'cooking', hours: 5000 }] });
  assert.equal(r.lines[0].hours, 168);
});

test('empty input produces a valid empty payslip, not a crash', () => {
  const r = E.compute({});
  assert.equal(r.isEmpty, true);
  assert.equal(r.totalHours, 0);
  assert.equal(r.weeklyValue, 0);
  assert.equal(r.topLine, null);
  assert.equal(r.blendedHourly, 0);
});

test('monthly and annual projections use calendar weeks, not 4-week months', () => {
  const r = E.compute({ entries: [{ key: 'cooking', hours: 10 }] }); // ₦12,000/week
  assert.equal(r.annualValue, 624000);                       // 12000 * 52
  assert.equal(r.monthlyValue, Math.round(12000 * 52 / 12)); // 52,000
  assert.notEqual(r.monthlyValue, 48000, 'a 4-week month would undercount by ~8%');
});

test('workload bands escalate with hours', () => {
  assert.equal(E.bandFor(2).id, 'light');
  assert.equal(E.bandFor(10).id, 'part');
  assert.equal(E.bandFor(20).id, 'serious');
  assert.equal(E.bandFor(45).id, 'full');
});

test('top line identifies the biggest priced contributor', () => {
  const r = E.compute({
    entries: [{ key: 'cooking', hours: 2 }, { key: 'tutoring', hours: 4 }, { key: 'emotional', hours: 40 }]
  });
  assert.equal(r.topLine.key, 'tutoring', 'unpriced hours must never win the top slot');
});

test('naira and hour formatting stay payslip-clean', () => {
  assert.equal(E.formatNaira(1234567), '₦1,234,567');
  assert.equal(E.formatNaira(0), '₦0');
  assert.equal(E.formatHours(3.0), '3');
  assert.equal(E.formatHours(3.46), '3.5');
});

test('deterministic pick is stable for a seed and varies across seeds', () => {
  const a = E.pickDeterministic(D.JOB_TITLES, 'peace-cooking-4');
  const b = E.pickDeterministic(D.JOB_TITLES, 'peace-cooking-4');
  assert.equal(a, b, 'same payslip must keep the same job title on re-render');
  const seeds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const distinct = new Set(seeds.map((s) => E.pickDeterministic(D.JOB_TITLES, s)));
  assert.ok(distinct.size > 1, 'different payslips should not all get one title');
});

test('every priced task has a sane positive rate and a market comparator', () => {
  for (const t of D.TASKS) {
    assert.ok(t.label && t.blurb, `${t.key} needs a label and a stated comparator`);
    if (t.rate !== null) assert.ok(t.rate > 0 && t.rate < 100000, `${t.key} rate out of range`);
  }
});
