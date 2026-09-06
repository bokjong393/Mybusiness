/* NairaLens AI — reference data
 * Category metadata, shock definitions, benchmarks and the demo budget.
 * Attached to globalThis so the browser and the Node test runner share one source.
 */
(function (root) {
  'use strict';

  /* Every expense category carries four economic properties:
   *   essential   0..1  how non-negotiable the spend is (rent is 0.95, streaming is 0.05)
   *   elasticity  0..1  how much of it can realistically be cut inside one month
   *   benchmark   0..1  typical share of total spending for a Nigerian student household
   *   inflation   monthly price growth used by the 6-month projection
   * essential and elasticity are deliberately NOT (1 - each other): rent is both
   * essential and inelastic, while a phone plan is inessential but hard to cut mid-cycle.
   */
  var CATEGORIES = [
    { key: 'rent',      label: 'Rent / Accommodation', emoji: '\u{1F3E0}', essential: 0.95, elasticity: 0.05, benchmark: 0.22, inflation: 0.008 },
    { key: 'food',      label: 'Food',                 emoji: '\u{1F35A}', essential: 0.90, elasticity: 0.30, benchmark: 0.30, inflation: 0.018 },
    { key: 'transport', label: 'Transport',            emoji: '\u{1F68C}', essential: 0.75, elasticity: 0.35, benchmark: 0.15, inflation: 0.022 },
    { key: 'data',      label: 'Data / Airtime',       emoji: '\u{1F4F6}', essential: 0.70, elasticity: 0.40, benchmark: 0.10, inflation: 0.012 },
    { key: 'school',    label: 'School / Materials',   emoji: '\u{1F4DA}', essential: 0.85, elasticity: 0.15, benchmark: 0.08, inflation: 0.010 },
    { key: 'health',    label: 'Health',               emoji: '\u{1FA7A}', essential: 0.90, elasticity: 0.10, benchmark: 0.04, inflation: 0.015 },
    { key: 'family',    label: 'Family support',       emoji: '\u{1F46A}', essential: 0.60, elasticity: 0.45, benchmark: 0.05, inflation: 0.014 },
    { key: 'debt',      label: 'Debt repayment',       emoji: '\u{1F4B3}', essential: 0.80, elasticity: 0.10, benchmark: 0.03, inflation: 0.000 },
    { key: 'personal',  label: 'Personal / Social',    emoji: '\u{1F389}', essential: 0.20, elasticity: 0.80, benchmark: 0.03, inflation: 0.012 }
  ];

  var CATEGORY_BY_KEY = CATEGORIES.reduce(function (acc, c) { acc[c.key] = c; return acc; }, {});

  /* Shocks are expressed as multipliers and one-off amounts so the engine stays
   * a pure function. `compound` shocks hit more than one category at once —
   * that is the cost pass-through a fuel price change actually produces.
   */
  var SHOCKS = [
    { id: 'transport20', label: 'Transport +20%',    short: 'Transport', emoji: '\u{1F68C}', expense: { transport: 1.20 } },
    { id: 'food15',      label: 'Food +15%',         short: 'Food',      emoji: '\u{1F35A}', expense: { food: 1.15 } },
    { id: 'data25',      label: 'Data +25%',         short: 'Data',      emoji: '\u{1F4F6}', expense: { data: 1.25 } },
    { id: 'rent10',      label: 'Rent +10%',         short: 'Rent',      emoji: '\u{1F3E0}', expense: { rent: 1.10 } },
    { id: 'income20',    label: 'Income −20%',  short: 'Income',    emoji: '\u{1F4C9}', incomeFactor: 0.80 },
    { id: 'emergency',   label: '₦20,000 emergency', short: 'Emergency', emoji: '\u{1F691}', oneOff: 20000 },
    { id: 'fuel',        label: 'Fuel price spike',  short: 'Fuel',      emoji: '⛽', expense: { transport: 1.30, food: 1.10 }, compound: true },
    { id: 'save10',      label: 'Save 10% first',    short: 'Save first', emoji: '\u{1F4B0}', savingsFirst: 0.10, positive: true }
  ];

  /* A realistic Nigerian undergraduate budget that is *slightly* underwater —
   * chosen so the demo immediately shows the product doing something, rather
   * than a happy budget where every number is green and nothing is learned.
   */
  var DEMO_BUDGET = {
    income: 120000,
    buffer: 15000,
    expenses: {
      rent: 25000,
      food: 40000,
      transport: 30000,
      data: 12000,
      school: 8000,
      health: 2000,
      family: 5000,
      debt: 0,
      personal: 3000
    }
  };

  var EMPTY_BUDGET = {
    income: 0,
    buffer: 0,
    expenses: CATEGORIES.reduce(function (acc, c) { acc[c.key] = 0; return acc; }, {})
  };

  var BANDS = [
    { max: 24,  id: 'steady', label: 'Steady' },
    { max: 49,  id: 'watch',  label: 'Watch'  },
    { max: 74,  id: 'tight',  label: 'Tight'  },
    { max: 100, id: 'danger', label: 'Danger' }
  ];

  root.NairaLensData = {
    CATEGORIES: CATEGORIES,
    CATEGORY_BY_KEY: CATEGORY_BY_KEY,
    SHOCKS: SHOCKS,
    DEMO_BUDGET: DEMO_BUDGET,
    EMPTY_BUDGET: EMPTY_BUDGET,
    BANDS: BANDS,
    DAYS_IN_MONTH: 30
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
