# METRICS.md — KPIs and Unit Economics

**Rule:** every number below is either sourced (see `research/MARKET-EVIDENCE.md`) or labelled ASSUMPTION. Assumptions get replaced with measured reality as soon as we have it. **No number here is allowed to be flattering.**

---

## Core assumptions

| # | Assumption | Value | Basis | Confidence |
|---|---|---|---|---|
| A1 | Cold contact → reply rate | **6%** | 2026 benchmarks: 3.43% avg, 5–10% good, 8–12% elite. Proof-first should land in the good band; we plan mid. | Medium |
| A2 | Reply → real conversation | **50%** | ASSUMPTION | Low |
| A3 | Conversation → $147 pilot | **35%** | ASSUMPTION — de-risked by the "don't pay if unusable" guarantee | Low |
| A4 | Pilot → monthly retainer | **40%** | ASSUMPTION | Low |
| A5 | Delivery time, 50 rows | **9 hrs → 6 hrs** | **Revised 2026-08-29 after the first verification pass.** Candidate→verified yield is ~45–50%, so ~110 candidates are screened per 50 rows. The original 6→3 estimate was low by roughly 2×. | Medium-high (measured) |
| A6 | Monthly churn, small agencies | **15%** (pessimistic 25%) | ASSUMPTION — small agencies have volatile cash flow | Low |
| A7 | Average retainer | **$500/mo** | Midpoint of $450–650 band | Medium |
| A8 | Tool cost | **$30/mo** at 1–2 clients, **$80/mo** at 5+ | Domain, Workspace, AI, data tiers | High |

**Compound conversion, contact → retainer:** 0.06 × 0.50 × 0.35 × 0.40 = **0.42%**, or roughly **one retainer per 240 contacts**.

That number is the most important one in this document. It says the business is a volume-of-relevance game, and it sets every plan that follows.

---

## Unit economics, per client

| Metric | Pilot | Retainer |
|---|---:|---:|
| Average selling price | $147 | $500/mo |
| Delivery hours | 9 → 6 | 36 → 24 /mo |
| Cash cost of delivery | ~$5 | ~$20/mo |
| Gross profit | ~$142 | ~$480/mo |
| **Gross margin** | **96%** | **96%** |
| Effective hourly (month 1) | $16/hr | $14/hr |
| Effective hourly (systematized) | $25/hr | $21/hr |

**CAC:** ~240 contacts at 3–4 minutes each = **~14 hours** plus ~$20 of tooling per acquired retainer. Cash CAC ≈ **$20**. Time CAC ≈ **14 hours**.

**LTV:** $500/mo × 6.7-month average life (at 15% churn) × 96% margin = **~$3,200**.

**LTV:CAC:** ~160:1 in cash. ~20:1 valuing founder time at a notional $15/hr. **This ratio is the whole business** — it only looks like this because the founder's time is cheap relative to the revenue it generates. That is the arbitrage, stated numerically.

**Payback period:** immediate. The $147 pilot covers cash CAC on the first transaction.

**Break-even:** month 1. Fixed costs of ~$30/month are covered by a single pilot sale.

---

## The revenue ladder — what each level actually requires

Contacts are cumulative-to-date. Hours are per month.

| Target | Clients needed | Contacts required | Delivery hrs/mo | Costs/mo | Profit/mo | Realistic timing | Verdict |
|---|---|---:|---:|---:|---:|---|---|
| **First $100** | 1 pilot | ~150 | 6 | $30 | $117 | Day 14–21 | Very achievable |
| **$500/mo** | 1 retainer | ~240 | 12–24 | $30 | ~$470 | Day 45–60 | Achievable |
| **$1,000/mo** | 2 retainers | ~480 | 24–48 | $50 | ~$950 | **Day 60–90** | **The stated goal. Realistic.** |
| **$3,000/mo** | 6 retainers | ~1,440 | 72 | $100 | ~$2,900 | Month 5–7 | Feasible but ~23 hrs/wk — collides with school |
| **$5,000/mo** | 8–10, or price rise | ~2,000 | 120 solo | $450 | ~$4,550 | Month 7–10 | **Not solo.** Needs 1 assistant or premium pricing |
| **$10,000/mo** | 12–15 at higher ASP | ~3,000 | 180+ | ~$1,400 | ~$8,600 | Month 9–18 | Needs 2–3 assistants; founder does sales + QA only |
| **$25,000/mo** | 30+, or productized | — | — | ~$8,000 | ~$9,000–12,000 | Month 18–30 | **A different company.** Decide at $10k: agency or software. |

### Three honest warnings about this ladder

1. **$3,000/month is the collision point with being a student.** 72 hours of delivery plus 20 of sales is ~23 hours/week of obligated work. That is the top of the stated availability with no slack for exams. **Do not sell past 4 clients without either raising prices or hiring** — and on revised delivery hours the collision arrives at **5 clients, not 6**.
2. **$5,000/month is where the model must change.** Selling more of the same thing stops working. The choice is fewer clients at higher prices, or delegation. Delegation is where a Nigeria-based founder has a second arbitrage: a competent local research assistant costs $250–400/month and can be trained on a documented process.
3. **$25,000/month is not this business.** It is either a 30-client agency with people management, or the software in Phase 11. That is a genuine strategic fork, and pretending it is a straight-line extension of the current plan would be dishonest.

---

## KPIs — what gets tracked weekly

### Leading indicators (predict revenue; watch these daily)

| KPI | Target | Alarm threshold |
|---|---:|---|
| Contacts sent /week | 100+ | < 60 = the plan is not running |
| Reply rate | ≥ 5% | < 3% over 150 contacts = message or ICP is wrong |
| Positive reply rate | ≥ 2% | < 1% = offer is wrong |
| Conversations /week | 3+ | 0 for two weeks = stop and re-diagnose |
| Pool inventory (researched rows) | ≥ 60 | < 30 = outreach will stall next week |

### Lagging indicators (confirm revenue; watch weekly)

| KPI | Target |
|---|---:|
| Pilots sold /month | 3+ |
| Pilot → retainer conversion | ≥ 40% |
| MRR | $500 by day 60, $1,000 by day 90 |
| Month-3 client retention | ≥ 50% |
| Delivery hours per 50 rows | ≤ 3 by month 2 |
| Client-reported usable-row rate | ≥ 80% |

### Vanity metrics — explicitly banned

LinkedIn followers · profile views · newsletter subscribers · "great idea!" replies · waitlist signups · connection count · open rates without replies.

**None of these are permitted in a weekly review.** A compliment is not a purchase. The only signal that counts is money arriving.

---

## Weekly review — five questions, every Sunday

1. How much money came in this week?
2. How many contacts went out, and what was the reply rate?
3. What did a customer or prospect say that contradicted our assumptions?
4. Which assumption above can now be replaced with a measured number?
5. What is the single binding constraint next week — leads, conversations, or delivery hours?

Log the answers in `EXPERIMENTS.md`. A week with no entry is a week that did not happen.
