# Ayoka — the business

> One page you can actually act on. No hockey-stick projections, no imaginary
> Series A. Just: who pays, why, how much it costs to serve them, and what has
> to be true for this to work.

---

## 1. The one-sentence version

**Ayoka sells African freelancers the words they need to win clients, defend
their prices, and get paid — in English and French — for a one-time price they
can afford.**

---

## 2. Why this business and not another one

Most "AI business" ideas fail on one of three things. Check any idea against
these before you build it:

| Test | Ayoka's answer |
|---|---|
| **Can you reach the buyer for free?** | Yes. Freelancers gather in public: Twitter/X, LinkedIn, Facebook groups, Reddit, Discord servers, WhatsApp communities. No ad budget required. |
| **Do you have an unfair edge?** | Yes. Bilingual EN/FR + West African context. A San Francisco founder will not build the francophone version, and a Paris founder will not price it in naira. |
| **Does it cost you money per user?** | Yes — every generation calls a paid API. This is the thing to control, and §4 is about exactly that. |

The edge is worth being explicit about, because it is the whole moat:

- **Benin is francophone. Nigeria is anglophone.** You are natively across
  both. Every English-only tool loses Senegal, Côte d'Ivoire, Cameroon, Togo,
  Benin, Mali, Burkina Faso, Guinea and francophone Congo. Every French tool
  loses Nigeria, Ghana and Kenya. Ayoka takes both.
- **You are the customer.** A 21-year-old trying to earn from home in Nigeria
  knows exactly why "just charge more" is useless advice — and what a client
  saying "that's above our budget" on WhatsApp actually feels like.
- **Regional pricing is a feature, not a discount.** A flat $39 is a week's
  income in Cotonou and a lunch in London. Charging ₦9,900 there and $19 here is
  the correct business decision *and* it reads as respect.

---

## 3. Who exactly buys this

**Primary — "the stuck freelancer".** 20–32, in Lagos, Cotonou, Accra, Dakar,
Nairobi or Abidjan. Designer, writer, developer, video editor, VA. Earns
$150–$900/month, wants double. Bids on Upwork/Fiverr or finds clients through
Instagram and WhatsApp. Loses work to people who are worse at the job but
better at the email. Buys tools when they cost less than one lost client.

**Secondary — "the francophone freelancer".** Same person in Benin, Togo, Côte
d'Ivoire, Senegal, Cameroon. Badly served by every English tool. Will tell
every other francophone freelancer they know, because nothing else speaks to
them. **This is your highest-leverage segment and your least contested one.**

**Tertiary — "the small agency".** 2–5 people. Buys Pro, uses Scope &
Agreement and Invoice weekly. Highest willingness to pay, lowest volume. Do not
chase them at first; let them find you.

**Explicitly not your customer:** enterprises, anyone needing an integration,
anyone who wants a subscription with a dashboard and SSO. Say no. Politely.

---

## 4. Unit economics — the only maths that matters

This is a per-use-cost business. If you get this wrong, growth bankrupts you.

### What one generation costs you

Each run sends roughly **1,000 input tokens** (system prompt + the user's brief)
and produces **1,000–3,000 output tokens**. At Claude Opus 5 pricing of
**$5 / 1M input** and **$25 / 1M output**:

| | tokens | cost |
|---|---:|---:|
| Input (cached after the first run of the day) | ~1,000 | ~$0.001 |
| Output (typical) | ~2,000 | ~$0.050 |
| **Cost of one generation** | | **≈ $0.05** |
| **Worst case** (hits the 8,000-token ceiling) | | **≈ $0.20** |

> Verify these numbers yourself once you are live — `npm run smoke` prints the
> real token counts from a live call, and the app logs `outputTokens` on every
> run. Do not trust an estimate you did not measure.

### What one customer costs you

| Plan | Price | Daily cap | Realistic use | Lifetime cost to serve |
|---|---:|---:|---|---:|
| Free | 0 | 3/day | ~10 runs before deciding | **≈ $0.50** |
| Starter | $19 | 60/day | ~15 runs/month, 12 months | **≈ $9** |
| Pro | $39 | 60/day | ~25 runs/month, 18 months | **≈ $22** |

**Gross margin: roughly 50–55% on Starter, 45% on Pro.** That is thin for
software and it is the honest number. Three things fix it, in this order:

1. **Prompt caching is already on.** The system prompt is cached, which is why
   input cost is near zero after the first run of the day. Do not add anything
   variable to `lib/prompts.js` — see the warning at the top of that file.
2. **The 8,000-token output ceiling is already set** in `lib/handler.js`. It
   caps your worst case. Do not raise it without re-running these numbers.
3. **`ANTHROPIC_EFFORT` is set to `medium`.** If margins get tight, `low` is the
   next step down — but measure the quality drop on ten real briefs before you
   ship it. Never trade output quality blind; the output *is* the product.

### The number that decides whether "lifetime" is safe

A "lifetime" licence is a bet that the customer's total usage costs less than
what they paid. At ~$0.05 a run, **a Starter licence pays for itself until run
380, and Pro until run 780.** Almost nobody will get there — the median buyer
of a tool like this uses it hard for a month and then occasionally.

But watch it. If your top 5% of users are running 60/day every day, that is
$90/month of cost against a one-time $39. **Your protections, in order:**

- The 60/day cap in `.env` (`PAID_RUNS_PER_DAY_PER_LICENSE`)
- The global daily budget (`DAILY_OUTPUT_TOKEN_BUDGET`)
- **The hard spend limit in your Anthropic Console — the only one that cannot
  be bypassed by a bug in your own code. Set it before you launch.**

---

## 5. Revenue: what "working" looks like

Assume a 3% conversion from free user to paid, which is normal for a tool like
this, and a 60/40 split between Starter and Pro.

| Free users/month | Sales/month | Revenue (USD mix) | API cost | Net |
|---:|---:|---:|---:|---:|
| 200 | 6 | ~$160 | ~$25 | **~$135** |
| 1,000 | 30 | ~$800 | ~$110 | **~$690** |
| 3,000 | 90 | ~$2,400 | ~$320 | **~$2,080** |
| 8,000 | 240 | ~$6,400 | ~$850 | **~$5,550** |

Read that table honestly:

- **The first row is the realistic month one.** Six sales. Roughly $135 in your
  pocket. That is not a failure — that is proof the machine works, and it is
  more than most first businesses ever make.
- **The third row is life-changing money in Nigeria** and it needs 3,000 free
  users a month. That is achievable with consistent organic posting inside 6–12
  months. It is not achievable in three weeks.
- Regional pricing lowers the average sale below $19. That is intentional.
  Volume in a market nobody else serves beats margin in one everybody fights over.

**The milestone that matters is not revenue. It is the first stranger who pays
you.** Everything after that is repetition.

---

## 6. What has to be true (the assumptions to kill fast)

Do not spend six months building. Spend three weeks testing these:

| # | Assumption | How you kill it fast | Kill it if… |
|---|---|---|---|
| 1 | Freelancers feel this pain enough to act | Post the Price Defence output as a free thread. Count saves and DMs. | Fewer than 20 saves on 3 posts |
| 2 | They will pay, not just praise | Put the buy button up on day one, before you feel ready | 300 free users, 0 sales |
| 3 | Francophone demand is real | Post the same thread in French in 3 FR groups | Engagement under half the English version |
| 4 | Output is genuinely good | Give 10 free Pro keys, ask each "did you send it?" | Fewer than 5 sent it unedited-ish |
| 5 | Payments actually clear locally | Buy your own product with your own card | Anything fails |

**Assumption 2 is the one everybody avoids.** Put the price up on day one. Free
praise is not a business.

---

## 7. Honest risks

| Risk | Severity | What you do about it |
|---|---|---|
| **API cost spike from abuse** | High | Console spend limit + daily budget + rate limits. Already built. Set the Console limit. |
| **Nobody converts** | High | Test assumption 2 in week one, not month three. If free-to-paid is under 1% after 500 users, the price or the free tier is wrong — change one, not both. |
| **A big player ships this free** | Medium | Likely, eventually — in English. They will not do francophone West Africa with local payment rails. Lean harder into the thing they will not copy. |
| **Model prices or terms change** | Medium | `ANTHROPIC_MODEL` is one env var. Keep "lifetime" honest by capping daily runs, which you already do. |
| **You burn out** | **Highest** | This is the real one. You are studying full time. Ship in evenings, batch your posting on Sundays, and treat month one as six sales — not six thousand. A business that survives your exams beats one that does not. |

---

## 8. Where this goes if it works

Do not build any of this until Ayoka has 100 paying customers. Written here so
you stop thinking about it and go sell.

1. **More generators** — case study writer, testimonial requester, rate-increase
   letter. Each one is ~40 lines in `lib/packs.js`.
2. **Ayoka for agencies** — same tool, team keys, $99. The Pro buyers will ask.
3. **The course** — "How to win clients as an African freelancer". The tool is
   the lead magnet; the course is the margin. This is where the real money is,
   and Ayoka is what earns you the right to sell it.
4. **Templates marketplace** — other freelancers sell their proposal templates
   through you; you take 30%.

**Next:** [`02-pricing-and-offers.md`](02-pricing-and-offers.md) to set your
real prices, then [`01-launch-plan-30-day.md`](01-launch-plan-30-day.md) to ship.
