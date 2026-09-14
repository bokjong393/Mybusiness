/**
 * Grade engine — Nigerian 5-point CGPA scale.
 *
 * The job of this module is to answer one question per course, as early as
 * possible in the semester:
 *
 *   "Given what I have scored so far, what do I need on everything that is
 *    left in order to still finish with an A?"
 *
 * Knowing that number in week 5 is the difference between fixing a course and
 * discovering after the exam that it was already out of reach.
 */

/** Grade bands for the 5-point scale, highest first. */
export const GRADE_BANDS = [
  { grade: 'A', min: 70, points: 5 },
  { grade: 'B', min: 60, points: 4 },
  { grade: 'C', min: 50, points: 3 },
  { grade: 'D', min: 45, points: 2 },
  { grade: 'E', min: 40, points: 1 },
  { grade: 'F', min: 0, points: 0 },
];

/** The score a course must reach to still count as a 5.0 course. */
export const A_THRESHOLD = 70;

/** Maps a 0-100 course score onto its letter grade and grade point. */
export function bandFor(score) {
  return GRADE_BANDS.find((band) => score >= band.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}

/**
 * An assessment is graded once `score` is a number. Until then it is still
 * outstanding and its weight counts toward what is winnable.
 */
function isGraded(assessment) {
  return typeof assessment.score === 'number';
}

/** Percentage earned on a single graded assessment, as a 0-1 fraction. */
function fractionEarned(assessment) {
  if (assessment.maxScore <= 0) {
    throw new Error(`Assessment "${assessment.name}" has a maxScore of ${assessment.maxScore}`);
  }
  return assessment.score / assessment.maxScore;
}

/**
 * Analyses one course against a target score (70 by default, i.e. an A).
 *
 * Returns the weighted marks already banked, the marks still on the table, and
 * `requiredOnRemaining` — the average percentage needed across every
 * outstanding assessment to still land on the target.
 */
export function analyseCourse(course, target = A_THRESHOLD) {
  const assessments = course.assessments ?? [];
  const totalWeight = assessments.reduce((sum, a) => sum + a.weight, 0);

  if (assessments.length > 0 && Math.abs(totalWeight - 100) > 0.01) {
    throw new Error(
      `Course ${course.code}: assessment weights total ${totalWeight}%, expected 100%`,
    );
  }

  const graded = assessments.filter(isGraded);
  const outstanding = assessments.filter((a) => !isGraded(a));

  const earned = graded.reduce((sum, a) => sum + fractionEarned(a) * a.weight, 0);
  const lost = graded.reduce((sum, a) => sum + (1 - fractionEarned(a)) * a.weight, 0);
  const remainingWeight = outstanding.reduce((sum, a) => sum + a.weight, 0);

  // The best score still reachable if every outstanding assessment is perfect.
  const ceiling = earned + remainingWeight;

  let requiredOnRemaining = null;
  if (remainingWeight > 0) {
    requiredOnRemaining = ((target - earned) / remainingWeight) * 100;
  }

  return {
    code: course.code,
    title: course.title,
    units: course.units,
    target,
    earned: round(earned),
    lost: round(lost),
    remainingWeight: round(remainingWeight),
    ceiling: round(ceiling),
    // Null when nothing is outstanding; <=0 when the target is already locked in.
    requiredOnRemaining: requiredOnRemaining === null ? null : round(requiredOnRemaining),
    status: statusFor({ earned, remainingWeight, ceiling, requiredOnRemaining, target }),
    outstanding: outstanding.map((a) => a.name),
  };
}

/**
 * Turns the raw numbers into the traffic light the dashboard actually shows.
 *
 * `secured`     — the target is banked no matter what happens next.
 * `impossible`  — the target cannot be reached even with perfect scores.
 * `at_risk`     — still reachable, but only with a near-perfect run.
 * `stretch`     — reachable, but demands better than the target itself.
 * `on_track`    — a normal effort holds the target.
 */
function statusFor({ earned, remainingWeight, ceiling, requiredOnRemaining, target }) {
  if (remainingWeight === 0) return earned >= target ? 'secured' : 'missed';
  if (ceiling < target) return 'impossible';
  if (requiredOnRemaining <= 0) return 'secured';
  if (requiredOnRemaining > 90) return 'at_risk';
  if (requiredOnRemaining > target) return 'stretch';
  return 'on_track';
}

/**
 * Projects the semester GPA. Courses with no results yet are assumed to hit
 * their target, so the projection answers "if I hold the line, where do I land?"
 */
export function projectGpa(courses, target = A_THRESHOLD) {
  const rows = courses.map((course) => {
    const analysis = analyseCourse(course, target);
    // Assume the target is met on everything still outstanding.
    const projectedScore = analysis.earned + analysis.remainingWeight * (target / 100);
    const band = bandFor(projectedScore);
    return { ...analysis, projectedScore: round(projectedScore), ...band };
  });

  const totalUnits = rows.reduce((sum, r) => sum + r.units, 0);
  const weightedPoints = rows.reduce((sum, r) => sum + r.points * r.units, 0);

  return {
    courses: rows,
    totalUnits,
    gpa: totalUnits === 0 ? 0 : round(weightedPoints / totalUnits),
    // Best case still mathematically available across every course.
    ceilingGpa: round(ceilingGpa(rows)),
  };
}

function ceilingGpa(rows) {
  const totalUnits = rows.reduce((sum, r) => sum + r.units, 0);
  if (totalUnits === 0) return 0;
  const best = rows.reduce((sum, r) => sum + bandFor(r.ceiling).points * r.units, 0);
  return best / totalUnits;
}

/** Rolls a previous CGPA and the current semester into a new CGPA. */
export function cumulative({ previousCgpa, previousUnits }, semesterGpa, semesterUnits) {
  const totalUnits = previousUnits + semesterUnits;
  if (totalUnits === 0) return 0;
  return round((previousCgpa * previousUnits + semesterGpa * semesterUnits) / totalUnits);
}

function round(value) {
  return Math.round(value * 100) / 100;
}
