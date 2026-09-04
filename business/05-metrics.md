# Metrics

> Five numbers. Once a week. Ten minutes.
>
> The temptation is to track everything, build a dashboard, and feel productive.
> That is procrastination with a spreadsheet. These five tell you everything you
> can act on.

---

## The five

| # | Number | Where it comes from | Why it matters |
|---|---|---|---|
| 1 | **Visitors** | Host analytics (Vercel gives this free) | Is anyone arriving? |
| 2 | **Generations** | `GET /api/health` → `usage.totalRuns` | Is anyone actually *using* it? |
| 3 | **Sales** | Your sales sheet | The only number that is real |
| 4 | **API cost** | Anthropic Console | What it costs to serve them |
| 5 | **Replies to your posts** | Count them by hand | Whether your message is landing |

### The one ratio that matters

**Sales ÷ people who ran at least one generation.**

Under 1% → the product or the price is wrong.
1–3% → normal. Keep going.
Over 5% → you are underpriced. Raise it.

Do not compute conversion from *visitors* — that measures your headline, not
your product, and it will mislead you for months.

---

## The weekly table

Copy this into a spreadsheet. Fill one row every Sunday. Never skip a week,
even a bad one — **especially** a bad one.

| Week | Visitors | Generations | Sales | Revenue | API cost | Net | Best post |
|---|---:|---:|---:|---:|---:|---:|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |

---

## What each number is telling you

**Visitors flat, generations flat** → nobody is arriving. Marketing problem.
Change where you post, not what you built.

**Visitors up, generations flat** → they arrive and leave. The landing page is
not convincing. Rewrite the headline using the exact words from your day-14
notes.

**Generations up, sales flat** → they use it and do not buy. Either the free
tier is too generous (drop to 2/day) or the price is wrong (test $12). **Change
one thing, wait a week, measure.** Changing both teaches you nothing.

**Sales up, API cost rising faster than revenue** → check `/api/health` for a
single identity burning runs, and re-read the unit economics in
[`00-business-plan.md`](00-business-plan.md).

**Everything flat for three straight weeks** → the assumption you have not
tested is that your buyer feels this pain enough to pay. Go back to
[`00-business-plan.md` §6](00-business-plan.md#6-what-has-to-be-true-the-assumptions-to-kill-fast)
and kill it properly instead of posting harder.

---

## What NOT to track

- **Followers.** A thousand followers who never buy is a hobby.
- **Impressions.** They measure the algorithm, not your business.
- **Time on site.** You cannot act on it.
- **Anything requiring a tracking script.** You promised no third-party
  analytics in your privacy policy. Keep that promise — it is also a selling
  point.

---

## The milestones worth celebrating

| Milestone | What it proves |
|---|---|
| **First stranger uses it** | The thing exists and works |
| **First stranger pays** | Somebody values it more than money. This is the hard one — everything after is repetition |
| **First francophone sale** | The moat is real |
| **10 sales** | Not luck |
| **First unprompted testimonial** | It genuinely helped someone |
| **Revenue > API cost for a full month** | It is a business, not a project |
| **100 sales** | Now you may think about what is next |

Mark the second one properly. Most people who start never reach it.
