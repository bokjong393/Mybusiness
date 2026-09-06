/* Local commentary, used whenever the AI route is unavailable — which is the
 * default, since the app ships with no AI key configured.
 *
 * These are written per risk band so the fallback still reads as if it looked
 * at your result, rather than a generic fortune cookie. The AI, when present,
 * replaces the wording but never the numbers.
 */

const BY_RISK = {
  invisible: {
    diagnosis: [
      'Financial visibility is excellent. Sapa has checked three addresses and none of them were yours.',
      'Your money is comfortable. Suspiciously comfortable.',
      'At this burn rate, Sapa would need a search warrant.'
    ],
    suggestion: [
      'Move a slice of this into something you cannot casually reach.',
      'This is the month to build the buffer, not to upgrade the phone.',
      'Set a standing transfer on payday before anything else moves.'
    ],
    prophecy: [
      'Sapa asked around. Nobody had your address.',
      'Currently unlocatable.',
      'Financial oxygen levels: excellent.'
    ]
  },
  softlife: {
    diagnosis: [
      'Comfortable, with a horizon worth watching.',
      'You have room to breathe. Not room to relax entirely.',
      'Conditions are fair. Nothing is approaching from the east.'
    ],
    suggestion: [
      'One unplanned expense is the difference between this month and a harder one.',
      'Name a number you will not spend below. Then defend it.',
      'A small automatic transfer beats a big intention.'
    ],
    prophecy: [
      'Soft life detected. Handle with care.',
      'Sapa is aware of you but not yet interested.',
      'Stable, for now.'
    ]
  },
  number: {
    diagnosis: [
      'Sapa has your number. It has not called yet, but it has your number.',
      'Stable but deteriorating. The trend matters more than the balance.',
      'You are fine this week. Next week is doing the negotiating.'
    ],
    suggestion: [
      'Cut one recurring thing this week. The smallest one you will not miss.',
      'Push one non-urgent purchase past your Sapa date and watch the date move.',
      'Find the single largest line in your week and halve it once.'
    ],
    prophecy: [
      'Sapa has your number and is deciding when to use it.',
      'Currently under observation.',
      'The countdown has started quietly.'
    ]
  },
  onway: {
    diagnosis: [
      'Financial oxygen levels are dropping. Movement has been detected.',
      'Your runway is short enough that one surprise ends the conversation.',
      'This is the fortnight where decisions actually matter.'
    ],
    suggestion: [
      'Delay every optional payment until after your expected income lands.',
      'If money is coming, do not spend against it before it arrives.',
      'Protect transport and food first. Everything else can wait a week.'
    ],
    prophecy: [
      'Sapa is on the way and has been given directions.',
      'Approach detected. Take cover.',
      'Financial oxygen levels dropping.'
    ]
  },
  outside: {
    diagnosis: [
      'Sapa is outside asking whether you live here. Do not open the door.',
      'Your balance is running on fumes and optimism.',
      'This is not a forecast any more. This is a warning.'
    ],
    suggestion: [
      'Today: list every payment due this week and cancel the ones nobody will chase.',
      'Ask about the money you are owed. Today, not next week.',
      'Any income at all, however small, buys you days right now.'
    ],
    prophecy: [
      'Sapa is outside. It knocked twice.',
      'Severe warning in effect.',
      'Your account balance has started writing its will.'
    ]
  },
  entered: {
    diagnosis: [
      'Sapa has entered the compound and made itself comfortable.',
      'The countdown finished while you were reading this.',
      'There is no runway left to calculate.'
    ],
    suggestion: [
      'Focus on the next seven days only. Food, transport, shelter, in that order.',
      'Speak to whoever you owe before they speak to you.',
      'Any small income this week matters more than any plan for next month.'
    ],
    prophecy: [
      'Sapa has entered the compound.',
      'Landfall confirmed.',
      'Currently rebuilding.'
    ]
  }
};

/* Deterministic pick, so a given forecast keeps the same line when the screen
 * re-renders instead of flickering through variants. */
function pick(list, seed) {
  let hash = 0;
  const text = String(seed || '');
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return list[Math.abs(hash) % list.length];
}

export function getFallbackCommentary(riskId, seed = '') {
  const bank = BY_RISK[riskId] || BY_RISK.number;
  return {
    diagnosis: pick(bank.diagnosis, `${riskId}-d-${seed}`),
    suggestion: pick(bank.suggestion, `${riskId}-s-${seed}`),
    prophecy: pick(bank.prophecy, `${riskId}-p-${seed}`),
    source: 'local'
  };
}

/** Total lines available, asserted by the test suite. */
export function countFallbackLines() {
  return Object.values(BY_RISK).reduce(
    (sum, bank) => sum + bank.diagnosis.length + bank.suggestion.length + bank.prophecy.length, 0
  );
}

export { BY_RISK };
