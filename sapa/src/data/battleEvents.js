/* SAPA BATTLE ROYALE — event deck
 *
 * 26 events. Every option carries deterministic financial consequences;
 * nothing here is decided by a model. Score deltas are game metrics only —
 * they are not a financial rating of the player.
 *
 * Categories: unavoidable | optional | income | emergency | social |
 *             opportunity | tradeoff | surprise | shock
 *
 * Option fields:
 *   cashDelta        one-off naira change
 *   weeklySpendDelta permanent change to weekly burn
 *   spendMultiplier  proportional change to weekly burn
 *   scores           {discipline, risk, impulse, energy} deltas, clamped later
 */

export const BATTLE_EVENTS = [
  {
    id: 'weekend-outing', category: 'social', emoji: '🎉',
    title: 'The Weekend Outing',
    prompt: 'The group chat has chosen a place. Everyone is going. Your name has been mentioned twice.',
    options: [
      { id: 'go-full', label: 'Go, and enjoy yourself properly', detail: 'You only live once. Twice, allegedly.',
        cashDelta: -15000, scores: { discipline: -8, impulse: -12, energy: 10, risk: -4 } },
      { id: 'go-small', label: 'Show face, leave early', detail: 'Attendance recorded. Wallet mostly intact.',
        cashDelta: -5000, scores: { discipline: 4, impulse: 5, energy: 4, risk: 2 } },
      { id: 'skip', label: 'Claim you have a headache', detail: 'The headache is financial.',
        cashDelta: 0, scores: { discipline: 9, impulse: 10, energy: -6, risk: 3 } }
    ]
  },
  {
    id: 'phone-screen', category: 'emergency', emoji: '📱',
    title: 'Broken Phone Screen',
    prompt: 'It slipped. It landed face down. The spider web is now permanent.',
    options: [
      { id: 'fix-now', label: 'Repair it immediately', detail: 'Original part, proper technician.',
        cashDelta: -28000, scores: { discipline: 2, risk: 8, impulse: -2, energy: 4 } },
      { id: 'fix-cheap', label: 'Roadside repair', detail: 'Cheaper. Might crack again.',
        cashDelta: -12000, scores: { discipline: 5, risk: -6, impulse: 2, energy: 0 } },
      { id: 'endure', label: 'Live with it', detail: 'Read between the cracks.',
        cashDelta: 0, scores: { discipline: 8, risk: -4, impulse: 8, energy: -8 } }
    ]
  },
  {
    id: 'data-finished', category: 'unavoidable', emoji: '📶',
    title: 'Data Has Finished',
    prompt: 'Mid-upload. Of course.',
    options: [
      { id: 'monthly', label: 'Buy the monthly bundle', detail: 'Better rate per gig.',
        cashDelta: -9000, scores: { discipline: 6, risk: 5, impulse: 2, energy: 5 } },
      { id: 'daily', label: 'Buy daily, manage it', detail: 'Expensive per gig, easier today.',
        cashDelta: -1500, weeklySpendDelta: 2500, scores: { discipline: -4, risk: -5, impulse: -2, energy: 0 } }
    ]
  },
  {
    id: 'family-contribution', category: 'social', emoji: '👨‍👩‍👧',
    title: 'Family Contribution',
    prompt: 'A relative calls. There is a contribution. Your name is on the list.',
    options: [
      { id: 'full', label: 'Send the full amount', detail: 'Peace of mind has a price.',
        cashDelta: -20000, scores: { discipline: 0, risk: -3, impulse: 0, energy: 6 } },
      { id: 'part', label: 'Send what you can', detail: 'Honest, and survivable.',
        cashDelta: -7000, scores: { discipline: 6, risk: 4, impulse: 4, energy: 2 } },
      { id: 'later', label: 'Promise next month', detail: 'A promise is a form of credit.',
        cashDelta: 0, weeklySpendDelta: 1000, scores: { discipline: 3, risk: -5, impulse: 5, energy: -5 } }
    ]
  },
  {
    id: 'client-payment', category: 'income', emoji: '💰',
    title: 'Client Payment Lands',
    prompt: 'The invoice you chased for three weeks has finally cleared.',
    options: [
      { id: 'save', label: 'Keep it untouched', detail: 'Boring. Effective.',
        cashDelta: 45000, scores: { discipline: 12, risk: 10, impulse: 10, energy: -2 } },
      { id: 'treat', label: 'Keep most, treat yourself', detail: 'A small celebration.',
        cashDelta: 38000, scores: { discipline: 4, risk: 4, impulse: 2, energy: 8 } },
      { id: 'spend', label: 'You have been waiting — spend it', detail: 'The money knew what it signed up for.',
        cashDelta: 18000, scores: { discipline: -10, risk: -8, impulse: -12, energy: 12 } }
    ]
  },
  {
    id: 'friend-repays', category: 'surprise', emoji: '🤝',
    title: 'A Friend Repays a Debt',
    prompt: 'The one you had written off. It arrived without warning.',
    options: [
      { id: 'bank', label: 'Bank it quietly', detail: 'Do not announce it.',
        cashDelta: 15000, scores: { discipline: 8, risk: 6, impulse: 8, energy: 2 } },
      { id: 'split', label: 'Celebrate a little', detail: 'Half saved, half enjoyed.',
        cashDelta: 9000, scores: { discipline: 2, risk: 2, impulse: 0, energy: 7 } }
    ]
  },
  {
    id: 'transport-increase', category: 'shock', emoji: '🚌',
    title: 'Transport Fare Increases',
    prompt: 'Overnight, and permanently. Nobody announced anything.',
    options: [
      { id: 'absorb', label: 'Absorb the new fare', detail: 'Same route, higher cost.',
        cashDelta: 0, weeklySpendDelta: 4500, scores: { discipline: 0, risk: -4, impulse: 4, energy: 0 } },
      { id: 'trek', label: 'Walk part of the route', detail: 'Cheaper. Slower. Sweatier.',
        cashDelta: 0, weeklySpendDelta: 1500, scores: { discipline: 8, risk: 5, impulse: 6, energy: -10 } },
      { id: 'bulk', label: 'Buy a weekly pass upfront', detail: 'Costs now, saves later.',
        cashDelta: -8000, weeklySpendDelta: -1000, scores: { discipline: 7, risk: 8, impulse: 3, energy: 3 } }
    ]
  },
  {
    id: 'food-delivery', category: 'optional', emoji: '🛵',
    title: 'Food Delivery Temptation',
    prompt: 'You are tired. The app is open. The pictures look unusually persuasive.',
    options: [
      { id: 'order', label: 'Order it', detail: 'Delivery fee included, naturally.',
        cashDelta: -6500, scores: { discipline: -6, impulse: -10, energy: 8, risk: -2 } },
      { id: 'cook', label: 'Cook what is at home', detail: 'There is rice. There is always rice.',
        cashDelta: -800, scores: { discipline: 8, impulse: 9, energy: -4, risk: 3 } }
    ]
  },
  {
    id: 'flash-sale', category: 'optional', emoji: '🏷️',
    title: 'Flash Sale — 6 Hours Left',
    prompt: 'The item you have been eyeing is 40% off. The countdown is aggressive.',
    options: [
      { id: 'buy', label: 'Buy it before it ends', detail: 'A discount is not a saving if you had not budgeted for it.',
        cashDelta: -22000, scores: { discipline: -10, impulse: -14, energy: 9, risk: -6 } },
      { id: 'wait', label: 'Close the tab', detail: 'It will be on sale again. It always is.',
        cashDelta: 0, scores: { discipline: 10, impulse: 12, energy: -3, risk: 5 } }
    ]
  },
  {
    id: 'freelance-gig', category: 'opportunity', emoji: '💼',
    title: 'Freelance Opportunity',
    prompt: 'A small job. Real money. Tight deadline. Your weekend is the cost.',
    options: [
      { id: 'take', label: 'Take the job', detail: 'Pays on delivery.',
        cashDelta: 32000, scores: { discipline: 10, risk: 8, impulse: 4, energy: -12 } },
      { id: 'negotiate', label: 'Negotiate for more time', detail: 'Less money, more sanity.',
        cashDelta: 20000, scores: { discipline: 7, risk: 6, impulse: 5, energy: -4 } },
      { id: 'decline', label: 'Decline — you need rest', detail: 'Rest is not free, but burnout is expensive.',
        cashDelta: 0, scores: { discipline: 0, risk: -2, impulse: 6, energy: 12 } }
    ]
  },
  {
    id: 'refund', category: 'surprise', emoji: '↩️',
    title: 'Unexpected Refund',
    prompt: 'A failed transaction from last month has reversed.',
    options: [
      { id: 'keep', label: 'Leave it in the account', detail: 'Pretend you never saw the alert.',
        cashDelta: 12000, scores: { discipline: 9, risk: 7, impulse: 9, energy: 1 } },
      { id: 'spend', label: 'Found money is for spending', detail: 'It was already lost, after all.',
        cashDelta: 3000, scores: { discipline: -7, risk: -5, impulse: -9, energy: 8 } }
    ]
  },
  {
    id: 'subscription', category: 'unavoidable', emoji: '🔁',
    title: 'Subscription Renewal',
    prompt: 'Three services renew this week. You actively use one of them.',
    options: [
      { id: 'renew-all', label: 'Let them all renew', detail: 'Cancelling is admin.',
        cashDelta: 0, weeklySpendDelta: 3000, scores: { discipline: -8, impulse: -5, risk: -5, energy: 3 } },
      { id: 'cancel-two', label: 'Cancel the two you forgot about', detail: 'Fifteen minutes of admin.',
        cashDelta: 0, weeklySpendDelta: -1200, scores: { discipline: 12, impulse: 8, risk: 8, energy: -3 } }
    ]
  },
  {
    id: 'birthday', category: 'social', emoji: '🎂',
    title: 'Birthday Contribution',
    prompt: 'Someone in the group is turning a year older and there is a cake fund.',
    options: [
      { id: 'generous', label: 'Contribute generously', detail: 'You will be remembered.',
        cashDelta: -10000, scores: { discipline: -3, impulse: -4, energy: 8, risk: -2 } },
      { id: 'modest', label: 'Contribute modestly', detail: 'Present and solvent.',
        cashDelta: -3000, scores: { discipline: 5, impulse: 5, energy: 3, risk: 3 } }
    ]
  },
  {
    id: 'electricity', category: 'unavoidable', emoji: '⚡',
    title: 'Electricity Units Finished',
    prompt: 'At 9pm. Mid-cook. The whole compound heard your reaction.',
    options: [
      { id: 'bulk-units', label: 'Buy a big top-up', detail: 'Sorted for the month.',
        cashDelta: -18000, scores: { discipline: 6, risk: 7, impulse: 3, energy: 6 } },
      { id: 'small-units', label: 'Buy just enough for now', detail: 'You will be back here in five days.',
        cashDelta: -4000, weeklySpendDelta: 2000, scores: { discipline: -2, risk: -4, impulse: 2, energy: -2 } }
    ]
  },
  {
    id: 'side-hustle', category: 'opportunity', emoji: '🚀',
    title: 'Side Hustle Opening',
    prompt: 'A chance to start something small. It needs money upfront to begin.',
    options: [
      { id: 'invest', label: 'Put money in', detail: 'Costs now. May pay later. May not.',
        cashDelta: -25000, weeklySpendDelta: -2000, scores: { discipline: 5, risk: -8, impulse: -2, energy: -5 } },
      { id: 'small-start', label: 'Start smaller', detail: 'Test it before committing.',
        cashDelta: -8000, weeklySpendDelta: -500, scores: { discipline: 9, risk: 6, impulse: 4, energy: -2 } },
      { id: 'pass', label: 'Not this month', detail: 'Timing is part of strategy.',
        cashDelta: 0, scores: { discipline: 4, risk: 5, impulse: 6, energy: 2 } }
    ]
  },
  {
    id: 'medical', category: 'emergency', emoji: '🏥',
    title: 'You Are Not Feeling Well',
    prompt: 'It has been three days. It is not improving on its own.',
    options: [
      { id: 'clinic', label: 'Go to the clinic properly', detail: 'Consultation and drugs.',
        cashDelta: -15000, scores: { discipline: 5, risk: 12, impulse: 2, energy: 10 } },
      { id: 'pharmacy', label: 'Buy something at the pharmacy', detail: 'Cheaper, and a bit of a gamble.',
        cashDelta: -4000, scores: { discipline: 3, risk: -6, impulse: 3, energy: 2 } },
      { id: 'ignore', label: 'Wait and see', detail: 'The most expensive option, eventually.',
        cashDelta: 0, scores: { discipline: -2, risk: -14, impulse: 2, energy: -12 } }
    ]
  },
  {
    id: 'rent-reminder', category: 'unavoidable', emoji: '🏠',
    title: 'Rent Reminder Arrives',
    prompt: 'Not due yet. But the message has been sent, and it was sent to everyone.',
    options: [
      { id: 'part-pay', label: 'Pay part of it now', detail: 'Reduce the shock later.',
        cashDelta: -30000, scores: { discipline: 11, risk: 10, impulse: 5, energy: -3 } },
      { id: 'set-aside', label: 'Set money aside weekly', detail: 'Spread the pain.',
        cashDelta: 0, weeklySpendDelta: 6000, scores: { discipline: 8, risk: 7, impulse: 6, energy: 0 } },
      { id: 'later', label: 'Deal with it when it is due', detail: 'A future problem for a future you.',
        cashDelta: 0, scores: { discipline: -6, risk: -10, impulse: 3, energy: 4 } }
    ]
  },
  {
    id: 'borrow-request', category: 'social', emoji: '🙏',
    title: 'A Friend Asks to Borrow',
    prompt: 'They have asked before. They repaid, eventually.',
    options: [
      { id: 'lend', label: 'Lend it', detail: 'Money out, goodwill in.',
        cashDelta: -12000, scores: { discipline: -2, risk: -7, impulse: -2, energy: 5 } },
      { id: 'lend-small', label: 'Lend a smaller amount', detail: 'Help without exposure.',
        cashDelta: -4000, scores: { discipline: 5, risk: 4, impulse: 4, energy: 3 } },
      { id: 'decline', label: 'Say you cannot right now', detail: 'True, and awkward.',
        cashDelta: 0, scores: { discipline: 7, risk: 8, impulse: 7, energy: -4 } }
    ]
  },
  {
    id: 'price-jump', category: 'shock', emoji: '📈',
    title: 'Market Prices Jump',
    prompt: 'The same basket costs noticeably more than it did last week.',
    options: [
      { id: 'same-basket', label: 'Buy the same things anyway', detail: 'Comfort has a new price.',
        cashDelta: 0, spendMultiplier: 1.18, scores: { discipline: -5, impulse: -6, risk: -4, energy: 4 } },
      { id: 'substitute', label: 'Switch to cheaper substitutes', detail: 'Less variety, same calories.',
        cashDelta: 0, spendMultiplier: 1.05, scores: { discipline: 9, impulse: 7, risk: 6, energy: -4 } },
      { id: 'bulk-buy', label: 'Bulk-buy the staples now', detail: 'Big hit today, cheaper weeks after.',
        cashDelta: -20000, spendMultiplier: 0.85, scores: { discipline: 10, impulse: 4, risk: 9, energy: 0 } }
    ]
  },
  {
    id: 'wedding', category: 'social', emoji: '💍',
    title: 'An Owambe Invitation',
    prompt: 'There is aso-ebi. There is a deadline. There is a WhatsApp broadcast.',
    options: [
      { id: 'full', label: 'Buy the aso-ebi and attend', detail: 'You will look incredible.',
        cashDelta: -25000, scores: { discipline: -9, impulse: -11, energy: 12, risk: -5 } },
      { id: 'attend-only', label: 'Attend without the aso-ebi', detail: 'Wear something you own.',
        cashDelta: -6000, scores: { discipline: 6, impulse: 6, energy: 7, risk: 3 } },
      { id: 'send-gift', label: 'Send a gift, skip the event', detail: 'Thoughtful and cheap.',
        cashDelta: -5000, scores: { discipline: 7, impulse: 7, energy: 0, risk: 4 } }
    ]
  },
  {
    id: 'bonus', category: 'income', emoji: '🎁',
    title: 'A Small Bonus',
    prompt: 'Unannounced, unbudgeted, and already in your account.',
    options: [
      { id: 'buffer', label: 'Add it to your buffer', detail: 'Nobody needs to know.',
        cashDelta: 25000, scores: { discipline: 11, risk: 9, impulse: 9, energy: 2 } },
      { id: 'half', label: 'Save half, enjoy half', detail: 'A reasonable compromise.',
        cashDelta: 16000, scores: { discipline: 5, risk: 5, impulse: 3, energy: 8 } }
    ]
  },
  {
    id: 'gadget-envy', category: 'optional', emoji: '🎧',
    title: 'Everyone Has The New One',
    prompt: 'Yours still works perfectly. That is not the point, apparently.',
    options: [
      { id: 'buy', label: 'Buy it', detail: 'You will feel great for four days.',
        cashDelta: -35000, scores: { discipline: -12, impulse: -15, energy: 10, risk: -9 } },
      { id: 'resist', label: 'Keep what works', detail: 'Radical.',
        cashDelta: 0, scores: { discipline: 12, impulse: 13, energy: -2, risk: 6 } }
    ]
  },
  {
    id: 'transport-strike', category: 'shock', emoji: '🚧',
    title: 'Transport Strike',
    prompt: 'No buses on your route for three days. Everyone is bidding for the same rides.',
    options: [
      { id: 'ride-hail', label: 'Pay for rides', detail: 'Surge pricing, obviously.',
        cashDelta: -14000, scores: { discipline: -3, risk: 2, impulse: -2, energy: 6 } },
      { id: 'stay-home', label: 'Work from home for three days', detail: 'Free, if your work allows it.',
        cashDelta: 0, scores: { discipline: 8, risk: 6, impulse: 6, energy: -3 } }
    ]
  },
  {
    id: 'repair-bill', category: 'emergency', emoji: '🔧',
    title: 'Something Has Broken At Home',
    prompt: 'It was working yesterday. It is not working today.',
    options: [
      { id: 'proper-fix', label: 'Get it fixed properly', detail: 'Once, and correctly.',
        cashDelta: -22000, scores: { discipline: 4, risk: 9, impulse: 2, energy: 6 } },
      { id: 'patch', label: 'Patch it for now', detail: 'It will hold. Probably.',
        cashDelta: -6000, weeklySpendDelta: 800, scores: { discipline: 3, risk: -6, impulse: 4, energy: -2 } }
    ]
  },
  {
    id: 'skill-course', category: 'opportunity', emoji: '📘',
    title: 'A Course You Actually Want',
    prompt: 'It is relevant, it is time-limited, and it is not cheap.',
    options: [
      { id: 'enrol', label: 'Enrol now', detail: 'An investment, if you finish it.',
        cashDelta: -30000, scores: { discipline: 6, risk: -4, impulse: -3, energy: 5 } },
      { id: 'free-route', label: 'Learn it free first', detail: 'Prove you will stick with it.',
        cashDelta: 0, scores: { discipline: 10, risk: 8, impulse: 8, energy: -4 } }
    ]
  },
  {
    id: 'cash-gift', category: 'surprise', emoji: '💌',
    title: 'Someone Sends You Money',
    prompt: 'No occasion. No explanation. Just an alert.',
    options: [
      { id: 'save-it', label: 'Leave it untouched', detail: 'Gratitude, quietly banked.',
        cashDelta: 20000, scores: { discipline: 10, risk: 8, impulse: 9, energy: 4 } },
      { id: 'share-it', label: 'Share some of it forward', detail: 'Costs you, means something.',
        cashDelta: 12000, scores: { discipline: 5, risk: 3, impulse: 5, energy: 9 } }
    ]
  }
];

export const EVENTS_PER_BATTLE = 10;
export const BATTLE_DAYS = 30;
