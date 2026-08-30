# Building the Signal Pool — 120 Rows

**What this is:** a reusable inventory of companies showing a live signal that they need outbound help. You research it **once**, then hand three rows to each agency you contact.

**Why it exists:** researching three unique prospects per agency from scratch costs ~30 minutes each — 100 hours across 200 agencies. Impossible. Build the pool once (12 hours) and per-agency cost drops to **3–4 minutes**. This is the single mechanic that makes proof-first outreach possible at volume.

**Budget: 12 hours. Target: 120 rows.**

---

## Who goes in the pool

The pool is not agencies. **The pool is the agencies' potential clients** — companies an outbound agency would want to sell to. When you send three rows to an agency, you're saying: *here are three companies you could win this week.*

Criteria for a pool company:

- **B2B** — sells to other businesses, not consumers
- **11–200 employees** — big enough for budget, small enough to outsource
- **US / UK / Canada / Australia / Western Europe**
- **Shows a live signal** that they are investing in sales or growth
- **Signal is under 30 days old**

## What counts as a signal — and what doesn't

| ✅ A signal | ❌ Not a signal |
|---|---|
| Posted an SDR role 6 days ago | "They're in a growing industry" |
| Raised a Series A on 14 August | Raised a round in 2023 |
| New VP Sales started this month | Has a VP Sales |
| Added Outreach.io to their stack | Uses HubSpot (like everyone) |
| Announced expansion into Germany | Has international customers |

**The test: could you write "this happened on [date], here's the link"?** If not, it isn't a signal — it's a description, and descriptions are what everyone else is selling.

---

## A live Apply button is NOT a fresh signal

**The single most important finding of the first verification pass** (57 candidates, 2026-08-29): a large share of live ATS postings are evergreen, re-posted, or re-syndicated. Sampled examples: Pallet's SDR traced to 11 June · Sona's "founding BDR" to February · **Packmatic's to May 2025 — fifteen months open and still accepting applications.**

ATS pages stay live for months and third-party boards refresh them, which resets the *apparent* date without a new requisition existing.

**This is the commercial core of the business.** Every competitor selling "companies hiring SDRs" checks whether the Apply button works. That means they ship majority-stale data and do not know it. Finding the *first-publication* date is the work no one else does.

**Therefore: never use the date a job board displays.** Cross-check first publication against an independent index before recording it.

## The `Days Open` column — turn the reject pile into a second product

A role open four months is not a dead row. **A company that has been trying to hire an SDR since May and still hasn't is a *better* agency prospect than one that posted last Tuesday** — they attempted to build outbound in-house, it failed, and outsourcing is now the obvious move.

| Days open | Segment | Line for the agency |
|---:|---|---|
| 0–30 | Building now | "They're staffing outbound this month" |
| 31–90 | Struggling to fill | "This has been open two months" |
| 90+ | **Failed to hire in-house** | **"Open since May and still unfilled — this is your call to make"** |

Record `Days Open` on every row. It costs nothing once the first-posted date is known, and no competitor has it.

**Freshness rule (revised):** admit any currently-live role whose first publication is within **90 days**, and always disclose `Days Open`. Reserve the strict 30-day gate for rows sold as "new this month." Under-admitting on a 30-day rule cost 55% of the first sweep for no commercial gain.

---

## The five signal types, with sources

Work them in this order — the first is the fastest and most abundant.

### 1. Hiring an SDR / BDR / growth role — target 60 rows

The strongest and easiest signal. A company hiring its **first** SDR is the best row you can produce: they are building outbound and have nobody running it yet.

**Sources — public ATS boards are indexable and free:**
```
site:boards.greenhouse.io "sales development representative"
site:jobs.lever.co "sales development"
site:apply.workable.com "SDR"
site:jobs.ashbyhq.com "business development representative"
```
Plus LinkedIn Jobs filtered to **past week**, and Indeed.

**Check for "first hire":** search the company on LinkedIn — if nobody currently holds an SDR title, note it. That detail turns a good row into a great one.

### 2. Recently funded — target 30 rows

New capital means new hiring and a growth mandate. Seed to Series B is the sweet spot; later rounds build in-house.

**Sources:** TechCrunch, Axios Pro Rata, Fortune Term Sheet, StrictlyVC, EU-Startups, Crunchbase free tier. Filter to the last 30 days.

### 3. New sales leadership — target 20 rows

**The highest-intent signal on this list.** New VPs of Sales and CROs buy things in their first 90 days — it is how they demonstrate impact.

**Sources:** LinkedIn company page → People tab → recently added. Company announcement posts. Google:
```
"joins as VP of Sales" OR "appointed Chief Revenue Officer" 2026
```

### 4. Tech stack change — target 5 rows

Adopting a sales tool means investing in outbound.

**Sources:** BuiltWith free lookup, the Wappalyzer extension, and job postings naming specific tools ("experience with Outreach, Salesloft, Clay").

### 5. Expansion / new market — target 5 rows

**Sources:** press releases, company blogs, LinkedIn company posts, job postings in a new country.

---

## The workflow — AI drafts, you verify

Four steps. **Steps 2 and 4 are yours and cannot be delegated** — they are what the client is paying for.

### Step 1 — AI: shape the search *(assist)*

> I'm looking for B2B companies, 11–200 employees, in the US/UK/Canada/Australia, that have posted a Sales Development Representative role in the last 30 days. Give me 15 search queries — Google site: operators for Greenhouse, Lever, Workable and Ashby boards, plus LinkedIn Jobs filter combinations — that would surface these. Vary the job title wording.

### Step 2 — YOU: open the source and verify *(never automate)*

For every candidate:
- [ ] Open the actual job posting / article / announcement
- [ ] Confirm the **date** — within 30 days, no exceptions
- [ ] Confirm the company still exists and hasn't been acquired
- [ ] Copy the **real URL from your browser bar**
- [ ] Confirm headcount and B2B fit

> ### The one rule that protects everything
> **Never use a URL an AI gave you.** Language models generate plausible, non-existent links and describe funding rounds that closed two years ago with total confidence. Every source URL in your sheet must be one **you** opened in a browser.
>
> A single dead link in a sample kills the deal and the referral chain behind it. Verification is not a step in the product — **it is the product.**

### Step 3 — AI: draft the "Why Now" line *(assist)*

> Here is a verified signal: [company] posted a Senior SDR role on [date], and nobody currently holds an SDR title there. Write one sentence a lead-gen agency could paste into a cold email explaining why this company is worth contacting now. Plain, specific, no hype, under 25 words. Don't add any facts I didn't give you.

### Step 4 — YOU: final read *(never automate)*

Read the sheet as the buyer. **Delete any row you wouldn't personally send to a stranger.** A 40-row sheet with no weak rows beats a 50-row sheet with ten.

---

## Time blocks

| Block | Hours | Output |
|---|---:|---|
| 1 | 4 | 60 rows from SDR job postings |
| 2 | 3 | 30 rows from funding announcements |
| 3 | 3 | 20 rows from leadership changes |
| 4 | 2 | 10 rows from tech/expansion + full QA pass |

**Revised after the first verification pass.** Yield from candidate to verified row is roughly 45–50% once headcount checks are batched, so **~110 candidates screened produces ~50 verified rows**: about **9 hours for the first pack, ~6 once systematized** — roughly double the original estimate. Log your actual rate; it sets the delivery economics.

## Assigning rows to agencies

- **3 rows per agency**, matched to their stated niche — a fintech-focused agency gets fintech rows
- **Never send the same row to two agencies.** 120 rows = 40 agencies covered
- Log which rows went where in `templates/target-list.csv`
- Rebuild the pool weekly; **signals expire at 30 days** and a stale row is worse than no row

## Quality gate — before any row leaves

- [ ] First-publication date established — **not** the date a job board displays
- [ ] `Days Open` recorded
- [ ] Currently live, and first published within 90 days
- [ ] Source URL opened by you, in your browser
- [ ] **Primary ATS link** (greenhouse / lever / ashby / workable / company careers page) — never an aggregator. `startups.gallery`, `builtin`, `sonara.ai`, `careerbeacon` and similar are secondary and fail this gate
- [ ] **Entity match confirmed** — see below
- [ ] LinkedIn **band** recorded, and **associated-employee count** recorded when it contradicts the band

### Entity ambiguity is the error that will cost you a client

In a 20-company headcount check, **8 had LinkedIn name collisions**: Sequence (four pages), Axion (`axion-ray` vs `axionhq` vs Axion Ventures), Assured (NYC healthcare vs Palo Alto claims), Coefficient (vs CoEfficient Labs, Coefficient Marketing), NewForm (vs New Form Entertainment), Coral AI, Pallet, Sirius.

Attaching the wrong company's headcount to a row is **invisible until the client checks** — and then it destroys the one thing you sell. Confirm the match against the job posting itself: does the company description on LinkedIn match the product described in the vacancy? Record an `Entity Risk` flag of Low / Medium / High on every row.

### Dating standard: claim the floor, never a precision you cannot defend

Greenhouse and Ashby job pages **do not display a posted date**. Any specific date therefore comes from an aggregator and is second-hand.

**Rule: record the earliest date you can evidence, name the source, and phrase it as a floor** — "open since at least 14 Aug (source: X)" — never as an exact posting date. `Days Open` becomes "at least N".

This is still far beyond any competitor, who quotes whatever a board displays. And a claim stated as a floor cannot be falsified by a client who finds an earlier date; a claim stated as exact can.

Free ways to push the floor earlier: LinkedIn Jobs "posted N days ago" · a date-restricted Google search for the exact title plus company · comparing job IDs within the same company board, which run roughly chronologically.

### First entity error caught in production — 2026-08-29

The very first row shipped for primary-link verification failed this gate. The row profiled **Eon.io** (cloud backup, `linkedin.com/company/eon-io`, 51–200, NY). The supplied posting was `eonhealth.bamboohr.com` — **Eon Health**, an unrelated healthcare company.

Every attribute on the row was correct *for a different company*. Nothing about the row looked wrong; only opening the link exposed it.

**A BambooHR/Greenhouse/Lever subdomain is the company's own name.** Read it before accepting the link: `eonhealth` ≠ `eon-io`. Cost when caught here: ten minutes. Cost when caught by a client: the account and its referrals.

### Band vs associated-employee count

LinkedIn shows two different numbers and they disagree. Forus: band 51–200, **217** associated. Sona: band 51–200, **242** associated.

**Rule: gate on the band, but record both, and disclose the mismatch on the row.** If a client opens a company you called "51–200" and counts 242 employees, you have lost the credibility argument even though the band was accurate. Volunteering the discrepancy wins it back — and volunteering inconvenient detail is precisely the product.
- [ ] Company is B2B, 11–200 people, in a target country
- [ ] "Why Now" line contains no fact not present in the source
- [ ] You would send this row yourself
