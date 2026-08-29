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
- [ ] Entity match confirmed — ambiguous names (Sirius, Swap, Aegis, Sequence) attach to the wrong company easily
- [ ] Company is B2B, 11–200 people, in a target country
- [ ] "Why Now" line contains no fact not present in the source
- [ ] You would send this row yourself
