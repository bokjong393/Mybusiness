/* PAY ME — reference data
 * Task categories, replacement rates, copy pools and context facts.
 * Attached to globalThis so the browser and the Node test runner share one source.
 *
 * ECONOMIC NOTE: every rate here is an ILLUSTRATIVE replacement-cost estimate —
 * roughly what it might cost to buy comparable services in a Nigerian market.
 * They are not survey data, not wages, and not an entitlement. The UI says so,
 * and every rate is user-editable for exactly that reason.
 */
(function (root) {
  'use strict';

  /* rate = illustrative naira per hour at the "typical" tier.
   * rate === null means the category is counted in HOURS ONLY and never priced.
   * Emotional support is deliberately unpriced: there is no clean market
   * substitute for it, and pricing it would undermine the credibility of the
   * categories that do have real market comparators.
   */
  var TASKS = [
    { key: 'cooking',   label: 'Cooking & food prep',   emoji: '\u{1F373}', rate: 1200, blurb: 'Market comparator: hired cook / food vendor' },
    { key: 'cleaning',  label: 'Cleaning',              emoji: '\u{1F9F9}', rate: 1000, blurb: 'Market comparator: cleaning service' },
    { key: 'laundry',   label: 'Laundry & ironing',     emoji: '\u{1F9FA}', rate: 900,  blurb: 'Market comparator: laundry service' },
    { key: 'childcare', label: 'Childcare',             emoji: '\u{1F476}', rate: 1100, blurb: 'Market comparator: nanny / creche' },
    { key: 'eldercare', label: 'Care for sick / elderly',emoji: '\u{1F9D3}', rate: 1300, blurb: 'Market comparator: home care aide' },
    { key: 'tutoring',  label: 'Homework help & tutoring',emoji: '\u{1F4DA}', rate: 2500, blurb: 'Market comparator: private lesson teacher' },
    { key: 'haircare',  label: 'Hair & beauty care',    emoji: '\u{1F488}', rate: 1800, blurb: 'Market comparator: salon / braider' },
    { key: 'errands',   label: 'Shopping & errands',    emoji: '\u{1F6D2}', rate: 1000, blurb: 'Market comparator: errand runner' },
    { key: 'repairs',   label: 'Household repairs',     emoji: '\u{1F527}', rate: 2000, blurb: 'Market comparator: handyman' },
    { key: 'admin',     label: 'Queues & family admin', emoji: '\u{1F4CB}', rate: 1200, blurb: 'Market comparator: personal assistant' },
    { key: 'emotional', label: 'Emotional support',     emoji: '\u{2764}\u{FE0F}', rate: null, blurb: 'Counted in hours. Deliberately not priced.' }
  ];

  var TASK_BY_KEY = TASKS.reduce(function (acc, t) { acc[t.key] = t; return acc; }, {});

  /* Three honest positions on the same method, rather than one fake-precise number.
   * The user can also override any individual rate.
   */
  var TIERS = [
    { id: 'conservative', label: 'Conservative', multiplier: 0.6,  note: 'Low-end informal market rates.' },
    { id: 'typical',      label: 'Typical',      multiplier: 1.0,  note: 'Mid-range urban Nigerian service rates.' },
    { id: 'premium',      label: 'Higher-cost',  multiplier: 1.75, note: 'Agency / professional-service rates.' }
  ];

  /* Workload bands drive the payslip status line. Hours are per week. */
  var BANDS = [
    { maxHours: 4,        id: 'light',     en: 'Payroll has ghosted you.',                  pcm: 'Payroll don ghost you.' },
    { maxHours: 14,       id: 'part',      id2: 'part-time', en: 'This is a part-time job.', pcm: 'This na part-time work be this.' },
    { maxHours: 29,       id: 'serious',   en: 'This is a real job with no contract.',      pcm: 'This na real work wey no get contract.' },
    { maxHours: Infinity, id: 'full',      en: 'This is a full-time job. Unpaid.',          pcm: 'This na full-time work. Dem never pay you.' }
  ];

  /* Local fallbacks so the product NEVER shows an empty state or a dead spinner
   * when the AI call fails, is rate-limited, or no key is configured at all.
   */
  var JOB_TITLES = [
    'Chief Everything Officer',
    'Director of Everybody’s Problems',
    'Head of Unpaid Operations',
    'Senior Manager, Domestic Affairs',
    'VP of Making It Work',
    'Chief Sibling Officer',
    'Head of Logistics (Unfunded)',
    'Group Head, Family Emergencies',
    'Acting MD, My Family Ltd.'
  ];

  var REVIEWS = [
    'Salary department has declined to comment.',
    'Promotion approved. Compensation adjustment denied.',
    'Congratulations on another successful week of unpaid employment.',
    'My Family Ltd. reports record productivity and zero payroll expense.',
    'Outstanding performance. Outstanding balance.',
    'Employee of the month. Again. Still no envelope.',
    'Workload increased. Headcount unchanged. Budget: none.',
    'Management reviewed your request and forwarded it to nobody.',
    'HR confirms your position is “family”, which does not exist in the payroll system.',
    'Your contribution is valued. Not paid, but valued.'
  ];

  /* Shown AFTER the reveal, never before. Sources named, no invented precision. */
  var FACTS = [
    {
      stat: '5 hrs vs 1 hr',
      body: 'Nigeria’s Time Use Survey 2024 reported women spending about 21% of the day — roughly five hours — on unpaid domestic and care work, against about 4.1% — roughly one hour — for men.',
      source: 'National Bureau of Statistics, Time Use Survey 2024'
    },
    {
      stat: 'Outside GDP',
      body: 'Under standard national-accounting conventions, unpaid household services such as cooking, cleaning and childcare fall outside the GDP production boundary. The work happens; the measurement does not count it.',
      source: 'System of National Accounts production boundary'
    },
    {
      stat: '15% vs 27%',
      body: 'Valuation method changes the answer. Across OECD countries analysed, replacement-cost valuation of unpaid work averaged about 15% of GDP, while opportunity-cost valuation averaged about 27%. PAY ME uses replacement cost.',
      source: 'OECD analysis of unpaid work valuation'
    }
  ];

  root.PayMeData = {
    TASKS: TASKS,
    TASK_BY_KEY: TASK_BY_KEY,
    TIERS: TIERS,
    BANDS: BANDS,
    JOB_TITLES: JOB_TITLES,
    REVIEWS: REVIEWS,
    FACTS: FACTS,
    WEEKS_PER_MONTH: 52 / 12,
    WEEKS_PER_YEAR: 52
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
