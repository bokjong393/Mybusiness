import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyseCourse,
  bandFor,
  cumulative,
  projectGpa,
} from '../gradeEngine.js';

const course = (overrides = {}) => ({
  code: 'ECO 201',
  title: 'Intermediate Microeconomics',
  units: 3,
  assessments: [
    { name: 'Quiz 1', weight: 10, maxScore: 10 },
    { name: 'Quiz 2', weight: 10, maxScore: 10 },
    { name: 'Assignment', weight: 20, maxScore: 20 },
    { name: 'Final exam', weight: 60, maxScore: 100 },
  ],
  ...overrides,
});

test('bandFor maps scores onto the 5-point scale', () => {
  assert.equal(bandFor(85).points, 5);
  assert.equal(bandFor(70).points, 5);
  assert.equal(bandFor(69).points, 4);
  assert.equal(bandFor(50).points, 3);
  assert.equal(bandFor(45).points, 2);
  assert.equal(bandFor(40).points, 1);
  assert.equal(bandFor(39).points, 0);
});

test('a clean CA run leaves a modest exam target', () => {
  // 34/40 banked on continuous assessment.
  const result = analyseCourse(
    course({
      assessments: [
        { name: 'Quiz 1', weight: 10, maxScore: 10, score: 9 },
        { name: 'Quiz 2', weight: 10, maxScore: 10, score: 8 },
        { name: 'Assignment', weight: 20, maxScore: 20, score: 17 },
        { name: 'Final exam', weight: 60, maxScore: 100 },
      ],
    }),
  );

  assert.equal(result.earned, 34);
  assert.equal(result.remainingWeight, 60);
  assert.equal(result.requiredOnRemaining, 60);
  assert.equal(result.status, 'on_track');
});

test('a weak CA run pushes the exam target into stretch territory', () => {
  // Only 24/40 banked — the same A now costs 77% in the exam.
  const result = analyseCourse(
    course({
      assessments: [
        { name: 'Quiz 1', weight: 10, maxScore: 10, score: 6 },
        { name: 'Quiz 2', weight: 10, maxScore: 10, score: 5 },
        { name: 'Assignment', weight: 20, maxScore: 20, score: 13 },
        { name: 'Final exam', weight: 60, maxScore: 100 },
      ],
    }),
  );

  assert.equal(result.earned, 24);
  assert.equal(result.requiredOnRemaining, 76.67);
  assert.equal(result.status, 'stretch');
});

test('a missed assessment can put an A out of reach entirely', () => {
  const result = analyseCourse(
    course({
      assessments: [
        { name: 'Quiz 1', weight: 10, maxScore: 10, score: 0 },
        { name: 'Quiz 2', weight: 10, maxScore: 10, score: 0 },
        { name: 'Assignment', weight: 20, maxScore: 20, score: 10 },
        { name: 'Final exam', weight: 60, maxScore: 100 },
      ],
    }),
  );

  assert.equal(result.ceiling, 70);
  assert.equal(result.requiredOnRemaining, 100);
  assert.equal(result.status, 'at_risk');
});

test('losing more than 30 marks of CA makes an A mathematically impossible', () => {
  const result = analyseCourse(
    course({
      assessments: [
        { name: 'Quiz 1', weight: 10, maxScore: 10, score: 0 },
        { name: 'Quiz 2', weight: 10, maxScore: 10, score: 0 },
        { name: 'Assignment', weight: 20, maxScore: 20, score: 8 },
        { name: 'Final exam', weight: 60, maxScore: 100 },
      ],
    }),
  );

  assert.equal(result.ceiling, 68);
  assert.equal(result.status, 'impossible');
});

test('an A already banked before the exam reports as secured', () => {
  const result = analyseCourse(
    course({
      assessments: [
        { name: 'Coursework', weight: 80, maxScore: 100, score: 95 },
        { name: 'Final exam', weight: 20, maxScore: 100 },
      ],
    }),
  );

  assert.equal(result.status, 'secured');
  assert.ok(result.requiredOnRemaining <= 0);
});

test('weights that do not total 100 are rejected rather than quietly scaled', () => {
  assert.throws(
    () => analyseCourse(course({ assessments: [{ name: 'Quiz', weight: 40, maxScore: 10 }] })),
    /weights total 40%/,
  );
});

test('projectGpa assumes outstanding work meets the target', () => {
  const result = projectGpa([
    course({ code: 'ECO 201', units: 3 }),
    course({ code: 'ECO 203', units: 2 }),
  ]);

  assert.equal(result.totalUnits, 5);
  assert.equal(result.gpa, 5);
  assert.equal(result.ceilingGpa, 5);
});

test('projectGpa drops below 5.0 once a course is out of reach', () => {
  const result = projectGpa([
    course({
      code: 'ECO 201',
      units: 3,
      assessments: [
        { name: 'CA', weight: 40, maxScore: 40, score: 8 },
        { name: 'Final exam', weight: 60, maxScore: 100 },
      ],
    }),
    course({ code: 'ECO 203', units: 3 }),
  ]);

  assert.ok(result.gpa < 5);
  assert.ok(result.ceilingGpa < 5);
});

test('cumulative rolls a previous CGPA forward', () => {
  // 4.5 over 30 units, then a clean 5.0 semester of 18 units.
  assert.equal(cumulative({ previousCgpa: 4.5, previousUnits: 30 }, 5, 18), 4.69);
});

test('cumulative handles a first semester with no history', () => {
  assert.equal(cumulative({ previousCgpa: 0, previousUnits: 0 }, 5, 18), 5);
});
