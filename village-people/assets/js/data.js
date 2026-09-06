/* VILLAGE PEOPLE — reference data
 *
 * "Village people" is contemporary Nigerian humour: the joking explanation for
 * inexplicable misfortune. This is a satire generator, so two rules govern all
 * content here — the comedy is always aimed at an absurd fictional committee,
 * never at the user, and never at a real, nameable relative.
 */
(function (root) {
  'use strict';

  /* Each department handles one flavour of misfortune. `motions` are formal
   * committee resolutions; {subject} is the user's name. Keeping several per
   * department is what stops the joke going stale by the third read. */
  var DEPARTMENTS = [
    {
      key: 'academics',
      name: 'Directorate of Academic Sabotage',
      emoji: '\u{1F4DA}',
      keywords: ['exam', 'test', 'lecture', 'class', 'assignment', 'school', 'study', 'result', 'gpa', 'cgpa', 'course', 'project', 'defence', 'lecturer', 'quiz', 'portal', 'alarm', 'overslept', 'attendance', '8am', '9am', '7am', 'morning class', 'registration'],
      motions: [
        'That {subject} be caused to read the correct material for the wrong examination.',
        'That the alarm clock of {subject} be permitted to ring only in the dream.',
        'That the course portal be made to load fully, then log {subject} out.',
        'That every question {subject} skipped be moved to the compulsory section.'
      ]
    },
    {
      key: 'money',
      name: 'Bureau of Vanishing Funds',
      emoji: '\u{1F4B8}',
      keywords: ['money', 'broke', 'cash', 'transfer', 'account', 'bank', 'debit', 'alert', 'salary', 'allowance', 'pay', 'sapa', 'balance', 'naira', 'atm', 'pos', 'fee'],
      motions: [
        'That the pending transfer to {subject} remain pending, in perpetuity.',
        'That an unbudgeted expense locate {subject} within forty-eight hours.',
        'That the account balance of {subject} be debited by an amount nobody can explain.',
        'That every ATM within reach of {subject} display "TEMPORARILY UNAVAILABLE".'
      ]
    },
    {
      key: 'romance',
      name: 'Department of Romantic Interference',
      emoji: '\u{1F494}',
      keywords: ['crush', 'love', 'boyfriend', 'girlfriend', 'relationship', 'date', 'breakup', 'broke up', 'aired', 'ghosted', 'situationship', 'talking stage', 'marriage', 'left me on read', 'replied', 'chat'],
      motions: [
        'That the message of {subject} be delivered, read, and left unanswered.',
        'That the crush of {subject} be caused to say "you are like a brother to me".',
        'That the talking stage of {subject} be extended indefinitely, without notice.',
        'That {subject} be made to type, delete, and retype one message eleven times.'
      ]
    },
    {
      key: 'transport',
      name: 'Committee on Traffic & Untimely Delays',
      emoji: '\u{1F68C}',
      keywords: ['bus', 'traffic', 'transport', 'keke', 'okada', 'late', 'road', 'danfo', 'fare', 'journey', 'travel', 'car', 'fuel', 'commute', 'hold up'],
      motions: [
        'That the bus carrying {subject} develop a fault at the busiest junction.',
        'That fare be increased at the precise moment {subject} boards.',
        'That {subject} arrive four minutes after the doors are shut.',
        'That rain commence the moment {subject} steps outside without shelter.'
      ]
    },
    {
      key: 'tech',
      name: 'Unit for Network Failure & Battery Depletion',
      emoji: '\u{1F4F1}',
      keywords: ['phone', 'network', 'data', 'battery', 'wifi', 'internet', 'charge', 'nepa', 'took the light', 'power', 'laptop', 'screen', 'mtn', 'glo', 'airtel', 'connection', 'blackout', 'generator', 'upload', 'download'],
      motions: [
        'That the data bundle of {subject} finish mid-upload.',
        'That the battery of {subject} display 34% and then die without warning.',
        'That the light be taken the moment {subject} sits down to work.',
        'That the unsaved document of {subject} remain permanently unsaved.'
      ]
    },
    {
      key: 'career',
      name: 'Panel on Delayed Opportunities',
      emoji: '\u{1F4BC}',
      keywords: ['job', 'work', 'interview', 'application', 'boss', 'career', 'internship', 'cv', 'resume', 'hire', 'client', 'business', 'customer', 'employer', 'offer'],
      motions: [
        'That the application of {subject} be moved to a folder nobody opens.',
        'That the interviewer of {subject} be seized by an unexplained coldness.',
        'That the client of {subject} say "we will get back to you" and mean it literally.',
        'That the good news reaching {subject} arrive one day after it is useful.'
      ]
    },
    {
      key: 'health',
      name: 'Sub-Committee on Sudden Headaches',
      emoji: '\u{1F912}',
      keywords: ['sick', 'ill', 'headache', 'pain', 'malaria', 'fever', 'hospital', 'body', 'tired', 'catarrh', 'cough', 'stomach', 'injury', 'health'],
      motions: [
        'That a mild fever visit {subject} strictly on the weekend.',
        'That the body of {subject} choose the busiest day to demand rest.',
        'That one mosquito be assigned to {subject} for the entire night.',
        'That the appetite of {subject} arrive only when the pot is empty.'
      ]
    },
    {
      key: 'domestic',
      name: 'Task Force on Household Wahala',
      emoji: '\u{1F373}',
      keywords: ['cook', 'food', 'hungry', 'kitchen', 'house', 'home', 'chores', 'family', 'rent', 'landlord', 'neighbour', 'neighbor', 'water', 'market', 'soup'],
      motions: [
        'That the soup of {subject} finish one day earlier than calculated.',
        'That the landlord of {subject} remember the rent at an inconvenient hour.',
        'That the water stop running while {subject} is fully lathered.',
        'That every errand in the compound be routed through {subject}.'
      ]
    },
    {
      key: 'sleep',
      name: 'Bureau of Interrupted Rest',
      emoji: '\u{1F634}',
      keywords: ['sleep', 'tired', 'rest', 'nap', 'insomnia', 'awake', 'dream', 'night', 'bed', 'snooze', 'exhausted'],
      motions: [
        'That sleep abandon {subject} at 3:00 a.m. for no stated reason.',
        'That the deepest sleep of {subject} commence eleven minutes before the alarm.',
        'That {subject} be made to remember an embarrassing memory from 2019 while lying down.',
        'That a rooster be stationed permanently outside the window of {subject}.'
      ]
    },
    {
      key: 'general',
      name: 'Office of General Wahala',
      emoji: '\u{1F32A}\u{FE0F}',
      keywords: [],
      motions: [
        'That small, unremarkable inconveniences be distributed evenly across the week of {subject}.',
        'That {subject} be made to lose one item of no value but great sentiment.',
        'That whatever can go slightly wrong for {subject} do so quietly.',
        'That the day of {subject} be technically fine and spiritually exhausting.'
      ]
    }
  ];

  var DEPARTMENT_BY_KEY = DEPARTMENTS.reduce(function (acc, d) { acc[d.key] = d; return acc; }, {});

  /* Attendees are ROLES, never realistic personal names. This is the line that
   * keeps the satire pointed at an imaginary committee rather than at somebody's
   * actual auntie. */
  var ATTENDEES = [
    'The Chairman',
    'Secretary-General, Department of Delayed Alerts',
    'Head, Bureau of Missing Transfers',
    'The Aunty Who Asks About Marriage',
    'Deputy Chair, Sub-Committee on Sudden Rainfall',
    'The One Who Sighs Meaningfully',
    'Committee Elder (retired, still attends)',
    'Treasurer, Purse of Vanishing Small Change',
    'The Cousin Nobody Invited',
    'Officer-in-Charge of Bad Timing',
    'The Neighbour Who Hears Everything',
    'Director of Unfinished Business',
    'The Uncle With Opinions',
    'Coordinator, Night Meetings & Whispering',
    'The In-Law From The Other Side'
  ];

  var APOLOGIES = [
    'sent apologies; network was poor',
    'attended virtually, connection unstable',
    'arrived late, blamed traffic',
    'absent without explanation, as usual',
    'present in spirit only',
    'excused, attending another compound',
    'stepped out midway to take a call'
  ];

  var VENUES = [
    'Under the mango tree, behind the compound',
    'The usual place, beside the stream',
    'Village square, after darkness',
    'The back of the old family house',
    'Beneath the iroko tree, as tradition requires',
    'The uncompleted building at the junction'
  ];

  var MEETING_TIMES = [
    '11:47 p.m.', '2:13 a.m.', '3:00 a.m. prompt', '1:38 a.m.',
    'First cockcrow', '12:04 a.m.', 'Midnight, give or take'
  ];

  var VERDICTS = [
    'Carried unanimously.',
    'Carried by a show of hands.',
    'Carried, with one abstention.',
    'Carried after brief argument.',
    'Passed without debate.',
    'Carried; the Chairman was persuasive.',
    'Adopted, subject to available resources.'
  ];

  /* Any Other Business — the comic release valve at the end of every real
   * meeting agenda, and the best place for the joke to land softly. */
  var AOB = [
    'The Treasurer raised concerns about the committee’s dwindling budget. Matter deferred.',
    'A motion to leave {subject} alone entirely was raised. It did not receive a seconder.',
    'The Chairman reminded members that results have been disappointing lately.',
    'It was noted that {subject} has been praying more than usual. Members expressed concern.',
    'The committee acknowledged that {subject} is beginning to suspect something.',
    'A member proposed a short break. The Chairman refused.',
    'Complaints were received regarding the quality of refreshments. Noted.',
    'The committee observed that {subject} has started reading their Bible again. Alarm was expressed.'
  ];

  var MATTERS_ARISING = [
    'The minutes of the previous meeting were read and adopted, with corrections.',
    'Members expressed dissatisfaction with the pace of progress on this file.',
    'The Chairman noted that the subject continues to make gains despite resolutions passed.',
    'It was observed that previous resolutions have not been fully implemented.'
  ];

  var ADJOURNMENTS = [
    'The meeting was adjourned at first cockcrow.',
    'The meeting rose after the Chairman yawned twice.',
    'The meeting was adjourned sine die, pending further developments.',
    'The meeting ended abruptly when a dog began barking.'
  ];

  /* Preloaded so the page opens with something to laugh at, not an empty form. */
  var SAMPLE = 'I missed my 8am because my alarm did not ring, my crush left me on read for three days, my transfer is still pending since Tuesday and NEPA took the light while I was submitting my assignment.';

  var QUICK_ADD = [
    { label: 'Alarm betrayed me', text: 'my alarm did not ring and I missed my morning class' },
    { label: 'Transfer still pending', text: 'my transfer has been pending since Tuesday' },
    { label: 'Left on read', text: 'my crush left me on read for three days' },
    { label: 'NEPA took light', text: 'NEPA took the light while I was working' },
    { label: 'Data finished', text: 'my data finished in the middle of an upload' },
    { label: 'Bus broke down', text: 'the bus I entered broke down in traffic' },
    { label: 'Sudden headache', text: 'a headache appeared from nowhere on Saturday' },
    { label: 'Soup finished early', text: 'the soup I cooked finished one day early' }
  ];

  root.VPData = {
    DEPARTMENTS: DEPARTMENTS,
    DEPARTMENT_BY_KEY: DEPARTMENT_BY_KEY,
    ATTENDEES: ATTENDEES,
    APOLOGIES: APOLOGIES,
    VENUES: VENUES,
    MEETING_TIMES: MEETING_TIMES,
    VERDICTS: VERDICTS,
    AOB: AOB,
    MATTERS_ARISING: MATTERS_ARISING,
    ADJOURNMENTS: ADJOURNMENTS,
    SAMPLE: SAMPLE,
    QUICK_ADD: QUICK_ADD
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
