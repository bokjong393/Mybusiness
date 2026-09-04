/**
 * Ayoka — the generator catalogue.
 *
 * Each generator is one "job to be done" for a freelancer trying to win, price,
 * or get paid by a client. The field definitions drive the UI form, the API
 * validation, and the prompt construction, so there is exactly one place to
 * edit when a generator changes.
 *
 * tier:  "free"    — usable without a licence (subject to the daily free limit)
 *        "starter" — Starter licence and above
 *        "pro"     — Pro licence only
 */

/** Currencies we let people quote in. Rates are illustrative anchors only. */
export const CURRENCIES = [
  { code: 'USD', symbol: '$',   label: 'US Dollar' },
  { code: 'NGN', symbol: '₦',   label: 'Nigerian Naira' },
  { code: 'XOF', symbol: 'FCFA', label: 'CFA Franc (BCEAO)' },
  { code: 'GHS', symbol: '₵',   label: 'Ghanaian Cedi' },
  { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling' },
  { code: 'EUR', symbol: '€',   label: 'Euro' },
  { code: 'GBP', symbol: '£',   label: 'Pound Sterling' },
];

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

export const TONES = [
  { code: 'warm',       en: 'Warm and human',        fr: 'Chaleureux et humain' },
  { code: 'direct',     en: 'Direct and confident',  fr: 'Direct et assuré' },
  { code: 'formal',     en: 'Formal and corporate',  fr: 'Formel et corporate' },
  { code: 'friendly',   en: 'Friendly and casual',   fr: 'Amical et décontracté' },
];

const f = {
  text:     (name, label, opts = {}) => ({ name, label, type: 'text', ...opts }),
  textarea: (name, label, opts = {}) => ({ name, label, type: 'textarea', rows: 6, ...opts }),
  select:   (name, label, options, opts = {}) => ({ name, label, type: 'select', options, ...opts }),
  number:   (name, label, opts = {}) => ({ name, label, type: 'number', ...opts }),
};

export const PACKS = [
  {
    id: 'proposal',
    tier: 'free',
    icon: '📄',
    en: {
      name: 'Client Proposal',
      blurb: 'Turn a job post or a messy brief into a proposal that reads like it came from a studio, not a stranger.',
    },
    fr: {
      name: 'Proposition client',
      blurb: "Transformez une offre d'emploi ou un brief flou en une proposition digne d'un studio.",
    },
    fields: [
      f.textarea('brief', 'The job post or client brief — paste it raw', {
        required: true, minLength: 40, maxLength: 6000,
        placeholder: 'Paste the Upwork post, the WhatsApp message, the email — exactly as you received it.',
      }),
      f.text('service', 'What you actually do', { required: true, maxLength: 160, placeholder: 'e.g. Brand identity design for food startups' }),
      f.text('proof', 'Your strongest proof', { maxLength: 400, placeholder: 'e.g. Rebranded 3 Lagos restaurants; one grew orders 40% in 2 months' }),
      f.number('price', 'Your price (leave blank and I will suggest a range)', { min: 0 }),
      f.select('pricing_model', 'Pricing model', [
        { value: 'fixed', label: 'Fixed project fee' },
        { value: 'hourly', label: 'Hourly rate' },
        { value: 'retainer', label: 'Monthly retainer' },
        { value: 'value', label: 'Value-based / % of result' },
      ]),
      f.text('timeline', 'Timeline you can honestly commit to', { maxLength: 120, placeholder: 'e.g. 3 weeks from deposit' }),
    ],
    build: (i, c) => `
Write a complete client proposal.

THE BRIEF THE CLIENT SENT (verbatim, may be messy or incomplete):
"""
${i.brief}
"""

ABOUT THE FREELANCER
- Service they sell: ${i.service}
- Proof / track record: ${i.proof || '(none supplied — do NOT invent any. Write around it using method and process instead.)'}
- Pricing model: ${i.pricing_model || 'fixed'}
- Price: ${i.price ? `${c.currencySymbol}${i.price} (${c.currency})` : `NOT SUPPLIED — propose a defensible range in ${c.currency} and explain the anchor for it`}
- Timeline: ${i.timeline || 'not supplied — propose a realistic one and mark it as a draft'}

STRUCTURE
1. A one-line subject/title the client will actually open.
2. "What I understand you need" — mirror their problem back in their own words. This section decides the sale; make it specific enough that it could not have been written for anyone else.
3. "How I would approach it" — 3 to 5 concrete phases, each with what happens and what the client receives.
4. "What you get" — a deliverables list, unambiguous, with quantities.
5. "Timeline" — phases mapped to dates or week numbers.
6. "Investment" — the price, framed against the outcome, not against hours.
7. "Why me" — short. Proof over adjectives.
8. "Next step" — one single action, with a deadline.

Then, after the proposal, add a section titled "⚠️ Before you send this" with 3 to 5 bullets: gaps in the brief you had to guess at, questions to ask the client, and anything in the proposal the freelancer must verify or replace. Be blunt here.`,
  },

  {
    id: 'outreach',
    tier: 'free',
    icon: '📬',
    en: {
      name: 'Cold Outreach',
      blurb: 'A first message that gets a reply, because it is about them and not about you.',
    },
    fr: {
      name: 'Prise de contact',
      blurb: "Un premier message qui obtient une réponse, parce qu'il parle d'eux et non de vous.",
    },
    fields: [
      f.text('target', 'Who you are messaging', { required: true, maxLength: 200, placeholder: 'e.g. Founder of a 6-person skincare brand in Accra' }),
      f.textarea('research', 'What you noticed about them', {
        required: true, minLength: 20, maxLength: 2000,
        placeholder: 'Their site loads in 9 seconds. Their Instagram bio has no link. They just posted about hiring. Anything real.',
      }),
      f.text('service', 'What you are offering', { required: true, maxLength: 160 }),
      f.select('channel', 'Channel', [
        { value: 'email', label: 'Email' },
        { value: 'linkedin', label: 'LinkedIn DM' },
        { value: 'instagram', label: 'Instagram / X DM' },
        { value: 'whatsapp', label: 'WhatsApp' },
      ]),
    ],
    build: (i, c) => `
Write cold outreach for the ${i.channel || 'email'} channel.

TARGET: ${i.target}
WHAT THE FREELANCER NOTICED (this is the whole basis of the message — use it):
"""
${i.research}
"""
OFFER: ${i.service}

RULES
- Length caps: email under 120 words; LinkedIn under 90; Instagram/X DM under 55; WhatsApp under 50.
- Open with the specific observation. Never open with "I hope this message finds you well", "My name is", or "I came across your profile".
- Name one consequence of the problem in their terms (money, time, or customers lost).
- Make the ask tiny. Not "let's hop on a call" — something they can say yes to in one word.
- No adjectives about the freelancer. No "passionate", "dedicated", "results-driven".
- Zero attachments, zero links unless it is one piece of proof.

OUTPUT
- Version A — the message.
- Version B — a different angle on the same person (change the hook, not the tone).
- Then "Why these work" — 3 bullets on the specific psychology used, so the freelancer can write the next one alone.
- Then "Send it when" — best day/time for ${i.channel || 'email'}, and what to do if there is no reply.`,
  },

  {
    id: 'followup',
    tier: 'free',
    icon: '🔁',
    en: {
      name: 'Follow-Up Sequence',
      blurb: 'The three messages that turn silence into a signed contract. Most work is lost here.',
    },
    fr: {
      name: 'Séquence de relance',
      blurb: 'Les trois messages qui transforment le silence en contrat signé.',
    },
    fields: [
      f.textarea('context', 'What you already sent them, and when', {
        required: true, minLength: 20, maxLength: 3000,
        placeholder: 'Sent a proposal for a ₦450,000 brand identity on the 3rd. They said "let me discuss with my partner". Nothing since.',
      }),
      f.select('stage', 'Where the deal is', [
        { value: 'after_outreach', label: 'They never replied to my first message' },
        { value: 'after_proposal', label: 'They have my proposal, no answer' },
        { value: 'after_call', label: 'We had a call, then silence' },
        { value: 'went_cold', label: 'They went cold weeks ago' },
      ]),
    ],
    build: (i) => `
Write a 3-message follow-up sequence.

SITUATION: ${i.stage || 'after_proposal'}
WHAT HAPPENED SO FAR:
"""
${i.context}
"""

Produce exactly three messages, each labelled with when to send it (Day 2, Day 6, Day 14 — adjust if the situation calls for it and say why).

- Message 1: add value, do not ask for anything. Give them one useful thing related to their problem.
- Message 2: make it easy to say no. Give them a one-word exit. Counter-intuitively this is the one that gets replies.
- Message 3: the close-the-file message. Warm, final, no guilt, leaves the door open.

Never use: "just checking in", "bumping this up", "circling back", "following up on my last email".
Each message under 70 words.

End with a section "If they reply with…" covering the four most likely replies for this situation and exactly what to send back to each.`,
  },

  {
    id: 'pricing',
    tier: 'starter',
    icon: '💰',
    en: {
      name: 'Price Defence',
      blurb: 'They said "that is too expensive". Here is what you say back — without discounting.',
    },
    fr: {
      name: 'Défense du prix',
      blurb: "Ils ont dit « c'est trop cher ». Voici quoi répondre — sans baisser vos prix.",
    },
    fields: [
      f.textarea('objection', 'What exactly did they say?', {
        required: true, minLength: 10, maxLength: 2000,
        placeholder: 'Copy their words. "This is above our budget" is a different problem to "why is it this much?"',
      }),
      f.text('service', 'What you quoted for', { required: true, maxLength: 200 }),
      f.number('price', 'Your quoted price', { required: true, min: 0 }),
      f.number('floor', 'Your true walk-away price (this stays private)', { min: 0 }),
    ],
    build: (i, c) => `
The freelancer quoted ${c.currencySymbol}${i.price} (${c.currency}) for: ${i.service}

THE CLIENT'S OBJECTION, VERBATIM:
"""
${i.objection}
"""
Private floor the freelancer will not go below: ${i.floor ? `${c.currencySymbol}${i.floor}` : 'not supplied'}

Do this in order:

1. "What they actually mean" — diagnose the objection. It is one of: no budget, no perceived value, comparison shopping, a negotiation reflex, or a stall for someone else's approval. Say which, and what evidence in their wording points to it.

2. "Your reply" — the message to send. It must not discount. It should either re-anchor on outcome, reduce scope to fit the budget (never reduce price for the same scope), or qualify them out gracefully.

3. "Two ways to restructure, not discount" — e.g. staged payments, a smaller phase 1, removing a deliverable, extending timeline. Show the new price and what changes for each.

4. "Your walk-away line" — the sentence that ends it with dignity if they will not move. ${i.floor ? `Their floor is ${c.currencySymbol}${i.floor}; do not suggest anything below it.` : ''}

5. "The lesson" — one sentence on what to change in the next quote so this objection does not come back.`,
  },

  {
    id: 'profile',
    tier: 'starter',
    icon: '✨',
    en: {
      name: 'Profile Rewrite',
      blurb: 'Your Upwork, Fiverr or LinkedIn profile, rewritten so clients pick you from a list of forty.',
    },
    fr: {
      name: 'Réécriture de profil',
      blurb: 'Votre profil Upwork, Fiverr ou LinkedIn, réécrit pour être choisi parmi quarante.',
    },
    fields: [
      f.select('platform', 'Platform', [
        { value: 'upwork', label: 'Upwork' },
        { value: 'fiverr', label: 'Fiverr' },
        { value: 'linkedin', label: 'LinkedIn' },
        { value: 'website', label: 'My own website' },
      ]),
      f.textarea('current', 'Your current bio (paste it, however bad)', { required: true, minLength: 20, maxLength: 4000 }),
      f.text('niche', 'The client you want most', { required: true, maxLength: 200, placeholder: 'e.g. Series-A fintechs in Africa that need investor decks' }),
      f.textarea('wins', 'Real results you have delivered', { maxLength: 2000, placeholder: 'Numbers if you have them. If you have none, say "none yet" — I will work with that honestly.' }),
    ],
    build: (i) => `
Rewrite this freelancer's ${i.platform || 'upwork'} profile.

CURRENT BIO:
"""
${i.current}
"""
TARGET CLIENT: ${i.niche}
REAL RESULTS: ${i.wins || 'NONE SUPPLIED — invent nothing. Build authority from process, specificity and point of view instead.'}

Respect the platform's real constraints: Upwork title 70 chars and overview 5000 with only the first ~250 visible before "more"; Fiverr description 1200; LinkedIn headline 220 and About 2600. Front-load everything.

Deliver:
1. Headline / title — 3 options, each under the platform limit.
2. The opening 2 sentences — these are the only ones most clients read. Make them do the whole job.
3. The full rewritten bio.
4. "What I removed and why" — point at the specific dead phrases in their original ("passionate", "I am a hardworking...", "satisfaction guaranteed") and explain what each one cost them.
5. Three skills/keywords to add for the platform's search, and where to put them.

If they supplied no results, do not fabricate any — and say plainly in section 4 that the profile will convert better once they have one real number to put in it.`,
  },

  {
    id: 'discovery',
    tier: 'starter',
    icon: '🎧',
    en: {
      name: 'Discovery Call Script',
      blurb: 'The questions that make a client sell themselves on hiring you — plus how to close at the end.',
    },
    fr: {
      name: "Script d'appel découverte",
      blurb: 'Les questions qui poussent le client à se convaincre lui-même — et comment conclure.',
    },
    fields: [
      f.text('client', 'Who is on the call', { required: true, maxLength: 200 }),
      f.textarea('known', 'What you already know about their situation', { required: true, minLength: 20, maxLength: 2500 }),
      f.text('service', 'What you hope to sell them', { required: true, maxLength: 160 }),
      f.number('duration', 'Call length in minutes', { min: 10, max: 120 }),
    ],
    build: (i, c) => `
Build a discovery call script.

CLIENT: ${i.client}
WHAT IS ALREADY KNOWN:
"""
${i.known}
"""
SERVICE TO SELL: ${i.service}
CALL LENGTH: ${i.duration || 30} minutes

Deliver:
1. "Before the call" — 3 things to check in the 10 minutes beforehand.
2. "Opening (first 2 minutes)" — the exact words to set the agenda and take control politely.
3. "The questions" — 8 to 12 questions in order, grouped as: situation → problem → cost of the problem → what they have already tried → decision process → budget. For each question, add one line on what a bad answer tells you.
4. "The budget question" — the exact wording to use. This is the one everybody fumbles.
5. "Closing (last 5 minutes)" — how to summarise, when to quote live vs send a proposal, and the specific next step to agree.
6. "Red flags" — 4 things that mean you should not take this client, and the polite words to decline.
7. "After the call" — what to send within 2 hours, and the price framing to use in ${c.currency}.`,
  },

  {
    id: 'scope',
    tier: 'pro',
    icon: '🧾',
    en: {
      name: 'Scope & Agreement',
      blurb: 'A plain-language work agreement that stops scope creep before it starts. Not legal advice — but far better than nothing.',
    },
    fr: {
      name: 'Périmètre et accord',
      blurb: 'Un accord clair qui stoppe la dérive du périmètre. Ce n\'est pas un conseil juridique, mais bien mieux que rien.',
    },
    fields: [
      f.textarea('agreed', 'What you and the client agreed', { required: true, minLength: 30, maxLength: 4000 }),
      f.text('client', 'Client name / company', { required: true, maxLength: 160 }),
      f.text('freelancer', 'Your name / business name', { required: true, maxLength: 160 }),
      f.number('price', 'Agreed price', { required: true, min: 0 }),
      f.text('timeline', 'Agreed timeline', { maxLength: 120 }),
      f.number('revisions', 'Rounds of revision included', { min: 0, max: 20 }),
    ],
    build: (i, c) => `
Draft a plain-language work agreement.

PARTIES: ${i.freelancer} (the Freelancer) and ${i.client} (the Client)
WHAT WAS AGREED:
"""
${i.agreed}
"""
FEE: ${c.currencySymbol}${i.price} (${c.currency})
TIMELINE: ${i.timeline || 'to be inserted'}
REVISIONS INCLUDED: ${i.revisions ?? 2}

Write it so a non-lawyer can read it in three minutes. Sections:
1. What is being done — the deliverables, with quantities and formats. Precise.
2. What is NOT included — this section prevents most disputes. Be generous with it.
3. Timeline and what happens when the client is late supplying something.
4. Money — amount, deposit (recommend 50% upfront), payment schedule, accepted methods, and a late-payment term.
5. Revisions — exactly ${i.revisions ?? 2} rounds; define what counts as a revision versus new work, and the rate for extra rounds.
6. Changes to scope — the change-request process and that extra work is quoted separately before it starts.
7. Ownership — who owns the work, and when ownership transfers (recommend: on final payment).
8. Ending it early — notice, and what is owed for work already done.
9. Signature block.

Open the document with this exact line in bold: "This is a plain-language working agreement, not legal advice. For high-value work, have a qualified lawyer in your jurisdiction review it."
Then finish with "Clauses to ask a lawyer about" — 3 items specific to this job.`,
  },

  {
    id: 'invoice',
    tier: 'pro',
    icon: '🏦',
    en: {
      name: 'Invoice & Payment Chase',
      blurb: 'A clean invoice, plus the escalating messages that get an overdue one paid.',
    },
    fr: {
      name: 'Facture et relance de paiement',
      blurb: 'Une facture claire, et les relances qui font payer un impayé.',
    },
    fields: [
      f.text('client', 'Client name', { required: true, maxLength: 160 }),
      f.text('freelancer', 'Your name / business name', { required: true, maxLength: 160 }),
      f.textarea('work', 'Work delivered (one line per item)', { required: true, minLength: 10, maxLength: 3000 }),
      f.number('price', 'Total amount due', { required: true, min: 0 }),
      f.text('terms', 'Payment terms', { maxLength: 120, placeholder: 'e.g. Net 14, bank transfer' }),
      f.number('days_overdue', 'Days overdue (0 if this is a fresh invoice)', { min: 0 }),
    ],
    build: (i, c) => `
PART 1 — Produce a clean, professional invoice.
From: ${i.freelancer}
To: ${i.client}
Line items (expand into a proper itemised table with quantity, unit, and amount):
"""
${i.work}
"""
Total: ${c.currencySymbol}${i.price} (${c.currency})
Terms: ${i.terms || 'Net 14'}
Include placeholders in [SQUARE BRACKETS] for: invoice number, issue date, due date, bank/payment details, and tax ID if applicable. Note where VAT or withholding tax would go for ${c.currency === 'NGN' ? 'Nigeria' : c.currency === 'XOF' ? 'the UEMOA zone' : 'their jurisdiction'}, and say that local rates must be confirmed with a local accountant.

PART 2 — ${Number(i.days_overdue) > 0 ? `This invoice is ${i.days_overdue} days overdue.` : 'For when it goes unpaid.'} Write four escalating messages:
- Day 1 after due date: assume it is an oversight. Friendly, 40 words.
- Day 7: firm, restate the amount and the due date, give a payment link/details again.
- Day 14: state the consequence — pausing work, late fee, or withholding final files. Still professional.
- Day 30: the formal demand. Short, unemotional, states the next step.

PART 3 — "Never again" — 3 changes to make to the next contract so this cannot happen: deposit, milestone payments, and file-release-on-payment.`,
  },
];

export const PACK_BY_ID = Object.fromEntries(PACKS.map((p) => [p.id, p]));

export const TIER_RANK = { free: 0, starter: 1, pro: 2 };

/** Can a holder of `licenseTier` (or none) run `pack`? */
export function tierAllows(licenseTier, pack) {
  return TIER_RANK[licenseTier ?? 'free'] >= TIER_RANK[pack.tier];
}

/** Catalogue shape the browser needs — no prompt bodies leak to the client. */
export function publicCatalogue() {
  return PACKS.map((p) => ({
    id: p.id,
    tier: p.tier,
    icon: p.icon,
    en: p.en,
    fr: p.fr,
    fields: p.fields,
  }));
}
