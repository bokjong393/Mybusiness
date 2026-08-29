# METRICS.md — Business KPI Definitions

**Last updated:** 2026-08-29 · **Status:** definitions set, all values currently zero or unmeasured.

Every number below that is not marked MEASURED is a **planning assumption**. Replace it with real
data as soon as the first 100 outreach messages are sent. Assumptions are for building a model,
not for believing.

---

## 1. Acquisition funnel

| Stage | Definition | Planning assumption | Measured |
|---|---|---|---|
| Outreach sent | Personalised connection requests + first messages | 100/week (20/day × 5) | — |
| Acceptance rate | Connection requests accepted | 25–35% | — |
| Reply rate | Replied to the follow-up message | 15–25% of accepted | — |
| Conversation rate | Two or more meaningful exchanges | 60% of replies | — |
| Qualified lead | Matches ICP **and** names a real upcoming need | 40% of conversations | — |
| Call booking rate | Qualified leads who take a call | 50% | — |
| Close rate | Calls that become paying customers | 20–30% | — |

**Weekly model at these assumptions:** 100 outreach → ~30 accepted → ~6 replies → ~4 conversations
→ ~1.5 qualified → ~0.8 calls → **~0.2 customers/week ≈ 1 customer/month.**

That is the honest number, and it is why marketplaces run in parallel for the first 30 days:
they supply buyers who are *already searching*, which collapses the top of this funnel.

⚠️ **The single most important instrumentation task:** log every outreach message in the tracker
from message #1. Without it, a bad reply rate is indistinguishable from a bad offer, and you will
change the wrong thing.

## 2. Revenue metrics

| Metric | Formula | Target |
|---|---|---|
| MRR | Sum of active monthly retainers | $3,000 by month 9 |
| Project revenue | Non-recurring project income in month | — |
| Total monthly revenue | MRR + project revenue | see ladder below |
| AOV (average order value) | Total project revenue ÷ number of projects | Rising: $300 → $900 |
| Effective hourly rate | Revenue ÷ hours worked (incl. selling) | $15 → $30 → $50 |
| Gross margin | (Revenue − direct costs) ÷ revenue | >90% (near-zero COGS) |
| CAC | Hours spent acquiring × notional hourly cost | Track in **hours**, not dollars |
| LTV | AOV × repeat purchases + retainer months × fee | Retainer LTV target: 6+ months |
| Churn | Retainers lost ÷ retainers active, monthly | <10% |

**CAC note:** with a $0 ad budget, CAC is denominated in *founder hours*. If it takes 40 hours of
outreach to win a $300 job, real CAC is 40 hours and the job is unprofitable at scale. This is the
metric that tells you when to raise prices.

## 3. Customers needed to hit each revenue level

Price hypotheses: localization project **$300** · deck rewrite **$400** · research brief **$900** ·
retainer **$900/month**.

| Monthly target | Projects only ($300) | Briefs ($900) | Retainers ($900/mo) | Realistic mix |
|---|---|---|---|---|
| $100 | 1 small job | — | — | 1 small localization job |
| $500 | 2 projects | — | — | 2 projects |
| $1,000 | 3–4 projects | 1 brief | 1 retainer | 1 retainer + 1 small job |
| $3,000 | 10 projects ⚠️ | 3–4 briefs | 3 retainers | 2 retainers + 1 brief + 1 project |
| $5,000 | 17 projects ❌ | 6 briefs | 5 retainers | 3 retainers + 2 briefs |
| $10,000 | ❌ impossible solo | 11 briefs ❌ | 6 retainers + 4 briefs | **Requires higher prices or subcontracted delivery** |

⚠️ = at or beyond solo capacity once selling time is included · ❌ = not achievable solo

## 4. Capacity reality check

- 40 hrs/week ≈ **160 hrs/month**.
- Months 1–3 split: **60% selling / 25% content & samples / 15% delivery** (~24 billable hrs).
- Steady state: **~60% delivery** (~96 billable hrs).
- $3,000/month ÷ 96 hrs = **$31/hour effective** — comfortably achievable.
- $10,000/month ÷ 96 hrs = **$104/hour effective** — requires premium positioning or a team.

**Conclusion: $3,000/month is a pricing and retention problem, not a volume problem.**

## 5. Content metrics (leading indicators only — never treat as revenue)

| Metric | Baseline (2026-08-29, MEASURED) | 90-day target |
|---|---|---|
| Followers | 55 | 400+ |
| Impressions / 7 days | 150 | 3,000+ |
| Profile views / 90 days | 28 | 250+ |
| Search appearances / week | 6 | 60+ |
| **DMs received from content** | ~0 | **3+** |

The last row is the only one that matters. Impressions are vanity; a DM is intent. If followers
grow and DMs do not, the content is entertaining the wrong people.

## 6. Weekly founder review (every Friday, written down)

1. What worked?
2. What failed?
3. What did customers actually **say** — verbatim quotes, not summaries?
4. What did we learn that changes the thesis?
5. What should we stop?
6. What should we double down on?
7. Metrics: outreach sent, replies, calls, revenue, hours spent. Numbers, not impressions.
