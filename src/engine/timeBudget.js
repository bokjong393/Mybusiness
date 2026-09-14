/**
 * Time budget engine.
 *
 * The naive version of this — "study first, fit hobbies into whatever is left"
 * — fails, because leftover time never actually shows up and the plan gets
 * abandoned by week three. So the model here works the other way round:
 *
 *   1. Fixed life commitments come out first. They are not negotiable.
 *   2. The academic floor comes out next. This is the minimum study time the
 *      course load needs to hold a 5.0, and it is treated as untouchable.
 *   3. Whatever remains is the real extracurricular budget.
 *
 * Every extracurricular declares a floor (below which the activity dies) and a
 * target (the healthy amount). When a course goes red, hours are reclaimed from
 * the lowest tier upward — never by silently starving an activity to zero.
 */

export const HOURS_PER_WEEK = 168;

/**
 * Independent study hours per credit unit per week, scaled by how hard the
 * course actually is. The classic rule of thumb is 2 hours per unit; a course
 * that fights back needs more than that, an easy one needs less.
 */
export const DIFFICULTY_HOURS_PER_UNIT = {
  1: 1.5, // comfortable — largely revision of known ground
  2: 1.75,
  3: 2.0, // the default assumption
  4: 2.5,
  5: 3.0, // hardest course on the timetable
};

/** Priority tiers, most protected first. Hours are reclaimed in reverse order. */
export const TIERS = ['protected', 'flexible', 'surplus'];

/**
 * Hours the plan deliberately leaves unallocated, as a fraction of study time.
 * Power cuts, a slow network, a day that simply does not go to plan — a
 * schedule with no slack breaks on contact with a real week.
 */
export const SLACK_FRACTION = 0.15;

/**
 * Computes how much of the week is genuinely available once sleep and fixed
 * commitments are removed.
 */
export function discretionaryHours({ sleepHoursPerNight, fixedCommitments = [] }) {
  const sleep = sleepHoursPerNight * 7;
  const fixed = fixedCommitments.reduce((sum, c) => sum + c.hoursPerWeek, 0);
  const available = HOURS_PER_WEEK - sleep - fixed;

  return {
    total: HOURS_PER_WEEK,
    sleep: round(sleep),
    fixed: round(fixed),
    discretionary: round(available),
  };
}

/**
 * The minimum weekly study time the course load requires, per course and in
 * total. This is the number the whole plan is built around.
 */
export function academicFloor(courses) {
  const perCourse = courses.map((course) => {
    const rate = DIFFICULTY_HOURS_PER_UNIT[course.difficulty ?? 3];
    if (rate === undefined) {
      throw new Error(`Course ${course.code}: difficulty must be 1-5, got ${course.difficulty}`);
    }
    return {
      code: course.code,
      title: course.title,
      units: course.units,
      difficulty: course.difficulty ?? 3,
      hoursPerWeek: round(course.units * rate),
    };
  });

  const study = perCourse.reduce((sum, c) => sum + c.hoursPerWeek, 0);
  const slack = study * SLACK_FRACTION;

  return {
    perCourse,
    study: round(study),
    slack: round(slack),
    // What must actually be reserved, slack included.
    total: round(study + slack),
  };
}

/**
 * Distributes the leftover hours across extracurriculars.
 *
 * Floors are funded first, highest tier down, so a protected activity keeps its
 * minimum even in a tight week. Only once every floor is met does anything get
 * topped up toward its target — again highest tier first.
 *
 * `crunch` is for exam and deadline weeks: it halves flexible targets and
 * suspends the surplus tier entirely, without touching protected floors.
 */
export function allocateExtracurriculars(activities, budgetHours, { crunch = false } = {}) {
  const scaled = activities.map((activity) => {
    const tier = activity.tier ?? 'flexible';
    if (!TIERS.includes(tier)) {
      throw new Error(`Activity "${activity.name}": unknown tier "${tier}"`);
    }
    return {
      ...activity,
      tier,
      floor: crunch && tier === 'surplus' ? 0 : activity.floorHoursPerWeek,
      target: crunch ? crunchTarget(activity, tier) : activity.targetHoursPerWeek,
    };
  });

  const allocations = new Map(scaled.map((a) => [a.name, { ...a, allocated: 0 }]));
  let remaining = budgetHours;

  // Pass one: fund every floor, most protected tier first.
  for (const tier of TIERS) {
    for (const activity of scaled.filter((a) => a.tier === tier)) {
      const grant = Math.min(activity.floor, remaining);
      allocations.get(activity.name).allocated = grant;
      remaining -= grant;
    }
  }

  const flooredTotal = scaled.reduce((sum, a) => sum + a.floor, 0);
  const overcommitted = flooredTotal > budgetHours;

  // Pass two: top up toward targets with whatever is left.
  for (const tier of TIERS) {
    for (const activity of scaled.filter((a) => a.tier === tier)) {
      const row = allocations.get(activity.name);
      const gap = Math.max(0, activity.target - row.allocated);
      const grant = Math.min(gap, remaining);
      row.allocated += grant;
      remaining -= grant;
    }
  }

  return {
    crunch,
    budgetHours: round(budgetHours),
    allocations: [...allocations.values()].map((a) => ({
      name: a.name,
      tier: a.tier,
      floor: round(a.floor),
      target: round(a.target),
      allocated: round(a.allocated),
      shortfall: round(Math.max(0, a.target - a.allocated)),
    })),
    unallocated: round(Math.max(0, remaining)),
    overcommitted,
    // How many hours the week is short of even the bare minimum.
    deficit: overcommitted ? round(flooredTotal - budgetHours) : 0,
  };
}

function crunchTarget(activity, tier) {
  if (tier === 'protected') return activity.targetHoursPerWeek;
  if (tier === 'flexible') return activity.targetHoursPerWeek * 0.5;
  return 0;
}

/**
 * The whole picture for one week: what is available, what the courses claim,
 * and what that leaves for everything else.
 */
export function buildWeeklyPlan({ life, courses, extracurriculars = [] }, { crunch = false } = {}) {
  const time = discretionaryHours(life);
  const academic = academicFloor(courses);
  const budget = time.discretionary - academic.total;

  return {
    time,
    academic,
    extracurricularBudget: round(budget),
    extracurriculars: allocateExtracurriculars(extracurriculars, Math.max(0, budget), { crunch }),
    // Negative means the course load alone does not fit the week as described.
    feasible: budget >= 0,
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}
