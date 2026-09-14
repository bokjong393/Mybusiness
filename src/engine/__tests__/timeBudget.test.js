import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  academicFloor,
  allocateExtracurriculars,
  buildWeeklyPlan,
  discretionaryHours,
} from '../timeBudget.js';

const life = {
  sleepHoursPerNight: 8,
  fixedCommitments: [
    { name: 'Meals and hygiene', hoursPerWeek: 17 },
    { name: 'Family and chores', hoursPerWeek: 10 },
    { name: 'Worship', hoursPerWeek: 4 },
  ],
};

const courses = [
  { code: 'ECO 201', title: 'Micro', units: 3, difficulty: 4 },
  { code: 'ECO 203', title: 'Macro', units: 3, difficulty: 4 },
  { code: 'ECO 205', title: 'Stats', units: 3, difficulty: 5 },
  { code: 'GST 201', title: 'GST', units: 2, difficulty: 1 },
];

const activities = [
  { name: 'Korean', tier: 'protected', floorHoursPerWeek: 3, targetHoursPerWeek: 6 },
  { name: 'Business', tier: 'flexible', floorHoursPerWeek: 2, targetHoursPerWeek: 10 },
  { name: 'Reading', tier: 'surplus', floorHoursPerWeek: 1, targetHoursPerWeek: 4 },
];

test('discretionaryHours strips sleep and fixed commitments from the week', () => {
  const result = discretionaryHours(life);

  assert.equal(result.total, 168);
  assert.equal(result.sleep, 56);
  assert.equal(result.fixed, 31);
  assert.equal(result.discretionary, 81);
});

test('academicFloor scales study hours by credit units and difficulty', () => {
  const result = academicFloor(courses);

  // 3x2.5 + 3x2.5 + 3x3.0 + 2x1.5 = 7.5 + 7.5 + 9 + 3
  assert.equal(result.study, 27);
  assert.equal(result.slack, 4.05);
  assert.equal(result.total, 31.05);
  assert.equal(result.perCourse.find((c) => c.code === 'ECO 205').hoursPerWeek, 9);
});

test('academicFloor rejects an out-of-range difficulty', () => {
  assert.throws(
    () => academicFloor([{ code: 'X', units: 3, difficulty: 9 }]),
    /difficulty must be 1-5/,
  );
});

test('a comfortable budget funds every activity to its target', () => {
  const result = allocateExtracurriculars(activities, 30);

  assert.equal(result.overcommitted, false);
  assert.deepEqual(
    result.allocations.map((a) => [a.name, a.allocated]),
    [['Korean', 6], ['Business', 10], ['Reading', 4]],
  );
  assert.equal(result.unallocated, 10);
});

test('a tight budget funds floors first and starves the lowest tier', () => {
  const result = allocateExtracurriculars(activities, 9);

  const byName = Object.fromEntries(result.allocations.map((a) => [a.name, a.allocated]));
  // Every floor is met (3 + 2 + 1 = 6), then Korean tops up toward its target.
  assert.equal(byName.Korean, 6);
  assert.equal(byName.Business, 2);
  assert.equal(byName.Reading, 1);
  assert.equal(result.unallocated, 0);
});

test('an impossible budget reports the deficit instead of silently clipping', () => {
  const result = allocateExtracurriculars(activities, 4);

  assert.equal(result.overcommitted, true);
  assert.equal(result.deficit, 2); // floors total 6, budget is 4
  const byName = Object.fromEntries(result.allocations.map((a) => [a.name, a.allocated]));
  assert.equal(byName.Korean, 3); // protected floor survives
  assert.equal(byName.Reading, 0); // surplus tier absorbs the shortfall
});

test('crunch mode suspends surplus and halves flexible, sparing protected', () => {
  const result = allocateExtracurriculars(activities, 30, { crunch: true });

  const byName = Object.fromEntries(result.allocations.map((a) => [a.name, a.allocated]));
  assert.equal(byName.Korean, 6); // protected target untouched
  assert.equal(byName.Business, 5); // halved from 10
  assert.equal(byName.Reading, 0); // suspended for the week
  assert.equal(result.unallocated, 19);
});

test('buildWeeklyPlan leaves a workable extracurricular budget', () => {
  const plan = buildWeeklyPlan({ life, courses, extracurriculars: activities });

  assert.equal(plan.feasible, true);
  assert.equal(plan.extracurricularBudget, 49.95); // 81 - 31.05
  assert.equal(plan.extracurriculars.overcommitted, false);
});

test('buildWeeklyPlan flags a week that cannot hold the course load', () => {
  const overloaded = {
    // 168 - 56 sleep - 85 committed = 27 discretionary, against a 31.05 floor.
    life: { sleepHoursPerNight: 8, fixedCommitments: [{ name: 'Job', hoursPerWeek: 85 }] },
    courses,
    extracurriculars: activities,
  };
  const plan = buildWeeklyPlan(overloaded);

  assert.equal(plan.feasible, false);
  assert.ok(plan.extracurricularBudget < 0);
});

test('an unknown tier is rejected', () => {
  assert.throws(
    () => allocateExtracurriculars([{ name: 'X', tier: 'whenever', floorHoursPerWeek: 1, targetHoursPerWeek: 2 }], 10),
    /unknown tier/,
  );
});
