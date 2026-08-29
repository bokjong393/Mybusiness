# BUSINESS.md — Current Model and Thesis

**Status:** Pre-revenue. Hypothesis stage. Nothing here is proven until a stranger pays.
**Last updated:** 2026-08-29

---

## The one-line thesis

> AI has made *finding* companies free. It has not made *knowing which ones are worth contacting this month* free. We sell that judgment to the people whose revenue depends on it, at a price that is cheap for them and excellent for us.

## The business

**Trigger-qualified prospect research, white-labelled for small B2B agencies.**

The deliverable is not a list of contacts. It is a research file where **every row carries a verified, dated buying signal with a source URL** — a funding round, a new VP of Sales, a job posting that reveals a gap, a tech-stack change, an expansion announcement, a pattern in public complaints.

A list answers *who exists*. Our file answers *who to contact this week, and what to say to them*. The second question is the one agencies actually get paid to answer, and the one they most often get wrong.

## Why this and not the other 24 options

1. **The buyer is trivially reachable.** Agencies list themselves in directories, advertise publicly, and are active on LinkedIn. No network required.
2. **The buyer cannot object to cold outreach** — they sell it. This neutralizes the single biggest disadvantage of a cold start.
3. **The outreach *is* the product demonstration.** We do not describe the work; we send a sample of it, unrequested, in the first message. This is the only credential a second-year student needs.
4. **White-label means location is invisible.** The agency's client never sees us. Agencies buy on output quality, not on the vendor's passport.
5. **Structural cost advantage.** A $500/month retainer is unattractive to a US freelancer and excellent for a Nigeria-based operator. We can profitably serve the segment our competition ignores.
6. **The money is already allocated.** Agencies already pay VAs, Clay credits, and Apollo seats for worse versions of this. We are a line-item substitution, not a new budget request.
7. **It recurs by nature.** Signals decay in about 30 days. A client who values month one needs month two.

## Why it might still be wrong — five honest failure modes

| # | Failure mode | Why it's plausible | How we test it cheaply |
|---|---|---|---|
| 1 | **"We can just use Clay + AI."** | Largely true. Tooling has collapsed the cost of doing this in-house. | Lead with time saved, not capability. Test in the first 20 conversations: if 3+ say this unprompted, the wedge is wrong. Cost: 0. |
| 2 | **Nigeria trust and deliverability penalty.** | Real. Lower reply rates, payment-security questions, harsher platform scrutiny. | Split-test channel in week 2: LinkedIn (identity visible, trust higher) vs cold email (identity abstract, volume higher). Measure reply rates separately. Cost: ~$20. |
| 3 | **Small agencies churn fast.** | They have volatile cash flow. A 2–3 month average life would cap us near $1k/mo permanently. | Track cohort retention from client #1. If month-3 retention is under 50% across the first 5 clients, move upmarket or switch to Plan B. Cost: 0. |
| 4 | **Quality ceiling without paid data.** | Free tiers of Apollo/LinkedIn cap out fast. Signal research may hit a wall we cannot pay past. | Deliver the first pilot entirely on free tiers and log where we get blocked. If quality requires >$150/month of tools before client #3, the model is capital-gated. Cost: 0. |
| 5 | **Student time collapse.** | Exams, term schedule, strikes. 20–40 hrs/week may not survive contact with a semester. | Cap at 3 clients until one full delivery cycle is completed inside an exam period. Never sell capacity that a bad week destroys. Cost: 0. |

**Sixth, and the one that actually worries me most:** this business is *not defensible* in year one. Anyone can copy the offer. Our only durable assets are (a) accumulated client-specific criteria — knowing exactly what a given agency's clients consider a good signal — and (b) a reusable signal-source library that gets faster every month. We should be honest that we are buying time, not building a moat, and use that time to migrate toward Plan B's structural advantages.

## Plan B — Bid & Tender Concierge

Monitor public procurement portals against one client's exact capability profile; deliver a weekly qualified shortlist with go/no-go recommendations.

**Why it's the better *long-term* business:** inherently subscription, deadline-driven (so urgency is structural, not sold), competing against $600–900/month software at $250–400/month, and the client-specific qualification criteria we accumulate become genuinely hard to replicate. **Why it's not Plan A:** slower sales cycle with more conservative buyers, and a cold-start founder has no proof to lead with.

**Trigger to switch:** if O1 gets to $1,000/month but month-3 retention stays under 50%, migrate. Plan B is also the intended *evolution* of Plan A, not just its alternative.

## Plan C — Recruiting Sourcing Support

25–40 qualified candidate profiles per open role for boutique recruiters, at $200–350/role.

**Why it's a real fallback:** recruiters have the highest willingness-to-pay per hour of any buyer on the list (15–25% of first-year salary), and they hate sourcing. **Why it's third:** delivery quality is gated by paid LinkedIn access we cannot afford yet.

**Trigger to switch:** if fewer than 3 of 150 agencies reply positively in the validation window, the buyer is wrong, not the skill. Recruiters are the next-best buyer for the same underlying capability.

---

## Business model (Phase 7)

### Value proposition

> "Your campaigns run on lists that were true last quarter. We send you 200 companies a month that have a documented reason to buy *this* month — each with the signal, the date, and the source link. You spend your time selling instead of researching."

### Offer ladder

| Tier | Offer | Price | Purpose |
|---|---|---:|---|
| **Free hook** | 3 trigger-qualified prospects, researched before contact, delivered inside the first message | $0 | Replaces credentials. Proves the work exists. |
| **Entry** | Pilot Pack — 50 rows, one ICP, 5-day turnaround | $147 | A no-meeting, no-risk purchase. The validation instrument. |
| **Core** | Signal Retainer — 200 rows/month, 2 ICPs, delivered weekly in batches of 50 | $450–650/mo | The actual business. |
| **Premium** | Signal Retainer Plus — 400 rows/month + a monthly written "what changed in your market" brief | $900–1,200/mo | Margin expansion on proven clients. |
| **Upsells** | Extra ICP (+$150/mo) · CRM hygiene sprint ($250) · competitor-monitoring add-on (+$200/mo) · rush turnaround (+40%) | varies | Raises revenue per client without new acquisition. |

**Pricing logic:** the entry price is deliberately below an agency's approval threshold — $147 is a decision one person makes without a meeting. The retainer is deliberately far below the $2,500+/month agencies pay competitors, because our cost base makes that profitable and their alternatives make it obvious.

### Delivery mechanism

Google Sheets file + a 5-line summary of what changed since last batch. Shared by link. No login, no dashboard, no software. **If the client can act on it inside 60 seconds of opening it, it is designed correctly.**

### Cost structure

| Item | Monthly |
|---|---:|
| Domain | ~$1 |
| Google Workspace (deliverability) | ~$7 |
| AI subscription | $0–20 |
| Data tools (free tiers, then paid at client #3) | $0–50 |
| **Total at 2 clients** | **$8–30** |

Gross margin above 90%. The real cost is hours, not dollars.

### Acquisition channels

Three independent channels, by design — no permanent dependence on one platform. Detail in `ops/ACQUISITION.md`.
1. **LinkedIn** — identity-visible, free, best trust profile for a Nigerian founder.
2. **Cold email** — highest volume, needs domain warm-up, lower trust.
3. **Communities and marketplaces** — Reddit, agency Slack/Facebook groups, Upwork "No Hires" filter. Slowest but warmest.

### Retention strategy

Signals decay in ~30 days — the product is structurally recurring. We reinforce it by: opening every batch with what changed since last time; tracking which signal *types* produced replies for that client and rebalancing toward them; and delivering a monthly one-page "what we learned about your market" note that makes the relationship feel like a partnership rather than a data feed.

### Differentiation and potential moat

**Differentiation today:** citations and dates on every row. Most competitors sell unsourced lists. Ours can be audited in one click, which is exactly what a nervous first-time buyer needs.

**Potential moat later (and it is only *potential*):**
- Accumulated per-client qualification criteria — after 3 months we know what that agency's clients consider a good signal better than a new vendor could learn in a quarter.
- A reusable signal-source library that lowers our delivery cost every month while a competitor's stays flat.
- Reply-rate feedback data: once clients tell us which rows converted, we can optimize toward outcomes, which no list vendor can do.

**Being honest: none of this is a moat in month one.** It is a head start. Treat it as such.

### Funnel

```
Prospects      2–15 person B2B agencies, US/UK/CA/AU        ~200 identified
   ↓           free 3-lead sample sent unrequested
Leads          replied at all                                ~10–16  (5–8%)
   ↓           qualified: has clients, has budget, has the pain
Qualified      real conversation held                          ~6–8
   ↓           $147 pilot pack
Customers      paid once                                       ~2–3
   ↓           pilot converts to retainer
Repeat         monthly retainer                                ~1–2
   ↓
Revenue        $450–650/mo each
```

**Target economics at steady state:** 2 retainers = ~$1,000/month revenue, ~30 hours/month delivery, under $30/month costs. That clears the stated goal with one client to spare.
