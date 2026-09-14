# Semester Command Center

A grade-targeting and time-budgeting tool for an online, self-paced degree.
Built for BSc Economics at Miva Open University, on the Nigerian 5-point scale.

## Why it exists

At a self-paced university nobody chases you, so a CGPA is rarely lost in the
exam hall. It is lost in three quieter ways:

1. **Silent CA leakage.** A quiz window closes, an assignment lands late. Those
   marks never come back, and no exam performance recovers them.
2. **Not knowing your number.** With 34/40 banked on continuous assessment an A
   costs 60% in the exam. With 24/40 it costs 77%. Most students learn which
   one they were in only after the exam, when it is too late to act.
3. **Uneven time.** One interesting course eats the week while a dull one
   quietly slides from an A to a B.

Each module below exists to close one of those gaps.

## Modules

| Module | Status | What it does |
|---|---|---|
| Grade engine | built | Per course: marks banked, marks still winnable, and the exact score needed on what remains to hold an A. Projects semester GPA and cumulative CGPA. |
| Time budget | built | Turns 168 hours into an honest weekly plan: fixed life commitments first, academic floor second, extracurriculars from what genuinely remains. |
| Deadline radar | planned | Every quiz window and due date, with a hard alert inside 48 hours. |
| Recall deck | planned | Spaced repetition for definitions, formulas and model assumptions. Doubles as a Korean vocabulary deck. |

## How time is allocated

The naive approach — study first, fit everything else into the leftovers —
fails, because leftovers never materialise and the plan gets abandoned. This
works the other way round:

```
168 hours
  - sleep
  - fixed commitments (meals, family, worship, paid work)
  = discretionary hours
      - academic floor (credit units x difficulty rate, + 15% slack)
      = extracurricular budget
```

The **academic floor** is treated as untouchable. Study time per course scales
with both credit units and your own difficulty rating:

| Difficulty | Hours per credit unit per week |
|---|---|
| 1 (comfortable) | 1.5 |
| 3 (default) | 2.0 |
| 5 (hardest course on the timetable) | 3.0 |

Extracurriculars then compete for what is left, each declaring a **floor** (the
hours below which the activity effectively dies) and a **target** (the healthy
amount). Floors are funded before any target is topped up, so a protected
activity survives a tight week instead of being silently zeroed.

Three tiers decide what gives way when the week is short:

- **protected** — keeps its hours even during exam weeks
- **flexible** — halved automatically in crunch mode
- **surplus** — suspended in crunch mode, runs on spare capacity

The 15% slack on study time is deliberate. Power cuts, a slow network, a day
that simply does not go to plan — a schedule with no slack breaks on contact
with a real week.

## Getting started

```bash
npm test     # runs the engine test suite, no dependencies required
```

Fill in [`data/intake.md`](data/intake.md), which becomes `data/semester.json`.
[`data/semester.example.json`](data/semester.example.json) shows the shape.

## Layout

```
data/
  intake.md                 questionnaire to fill in
  semester.example.json     data shape, by example
src/engine/
  gradeEngine.js            CGPA maths and per-course targets
  timeBudget.js             weekly hour allocation
  __tests__/                node:test suite
```
