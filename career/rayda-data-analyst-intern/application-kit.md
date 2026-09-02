# Rayda Data Analyst Intern — Application Kit

Rewritten against the real posting text. Everything here is a draft to edit, not a script to
paste. Replace anything in `[brackets]`. If a sentence isn't true about you, cut it — a founder
at a 27-person company can smell a template.

---

## 1. Cover letter draft

Under 200 words. It deliberately echoes the posting's own phrases — *collecting, cleaning and
organising data*, *translating business questions*, *asset lifecycle* — because whoever screens
this is matching against that text, whether they realise it or not.

> Hi Rayda team,
>
> I'm applying for the Data Analyst Intern role. I'm a 200-level Economics student at Miva Open
> University, so the statistics side of this is my coursework rather than a side interest — and
> the collecting, cleaning and organising part is the work I actually enjoy, because that's where
> you find out whether a number means what people say it means.
>
> To understand what you do, I built a small asset lifecycle dashboard in Looker Studio —
> recovery rate by country, time-to-deploy, true cost per device once repairs are counted, and
> recovered value at disposal. It's here: [LINK]. The dataset is synthetic, but the questions
> are the ones I'd want answered if I ran the fleet.
>
> Two things beyond the basics. I'm fluent in French and English — Beninese-Nigerian — which may
> be useful as Rayda grows across Francophone West Africa. And I already work fully remotely:
> Miva is an online university, so managing my own deadlines without supervision is simply how
> I've studied for two years.
>
> Peace Sossa
> [phone] · peace.launchoperator@gmail.com · [LinkedIn]

**Why it's built this way**
- Line one says what you're applying for. No "I am writing to express my keen interest."
- It mirrors their verbs. Free points at the screening stage.
- The dashboard link is the letter's whole job. Everything else is context for it.
- "The dataset is synthetic" — said plainly, up front. Honesty here costs you nothing and
  protects you completely.
- French comes late here on purpose: the project is the stronger opener now that you have one.
  If you apply *before* the dashboard exists, cut that paragraph and lead with French instead.
- **Note what's missing: no apology for SQL.** The posting says SQL is *an advantage*. Don't
  volunteer a weakness they didn't ask about.

---

## 2. CV lines that pull weight

Same facts, said in the language the reader is scanning for.

**Education**
> BSc Economics (in progress, 200L) — Miva Open University, Nigeria
> Relevant coursework: Statistics, Microeconomics, Macroeconomics, [Econometrics when you reach it]

**Skills** — order this to match the posting's own priority
> Google Sheets / Excel (pivot tables, XLOOKUP, SUMIFS, charting) · Data visualisation
> (Looker Studio) · Statistics · SQL (basic: SELECT, JOIN, GROUP BY) · Languages: English
> (fluent), French (fluent), Korean (beginner)

**Projects** — the section that gets you the interview
> **Asset Lifecycle Analytics** (2026) — Built a Looker Studio dashboard over a synthetic
> device-fleet dataset covering acquisition, deployment, repair, recovery and disposal.
> Measured recovery rate by country, median time-to-deploy, true annual cost per device, and
> value recovered at end of life; wrote a one-page memo on where the money leaks. [LINK]

**What not to do**
- No "References available on request" — it wastes a line.
- No photo, no age, no marital status.
- One page. Two is for people with ten years of experience.

---

## 3. The portfolio project — "Asset Lifecycle Analytics"

**Why this one:** it's a small version of Rayda's own business, in their own words —
*acquire, manage, track and dispose*. And building it in **Looker Studio** closes a stated
"advantage" requirement at the same time. Two birds, one afternoon.

### Build it in about 4–5 hours

**Step 1 — Make the data (60 min).** You don't need real data and shouldn't pretend you have
it. Generate ~300 rows in Google Sheets, one row per device:

| device_id | model | country | purchase_cost_usd | assigned_date | delivered_date | employee_status | return_date | repair_count | repair_cost_usd | disposal_status | resale_value_usd |
|---|---|---|---|---|---|---|---|---|---|---|---|

Countries: Nigeria, Kenya, Ghana, Côte d'Ivoire, Philippines, Brazil. Make some returns late,
some never returned, some repaired twice, some sold on and some scrapped. Realistic messiness
is the point — and cleaning it is literally duty #1 in the posting.

**Step 2 — Answer six questions (2 hrs).** These are the questions an asset lifecycle company
loses money on. The last one exists because *dispose* is in their own description of themselves.

1. **Recovery rate** — of devices assigned to employees who left, what share came back? By country.
2. **Time-to-deploy** — median days from assignment to delivery. Where is it slowest?
3. **True cost per device per year** — purchase amortised + repairs. Which model is actually
   cheapest once repairs count? Often *not* the cheapest to buy — that's your headline finding.
4. **Repair concentration** — do 20% of devices generate 80% of repair cost?
5. **Value at risk** — total book value of unrecovered devices. One number, in dollars.
6. **Recovery at disposal** — what share of purchase cost comes back as resale value, and how
   does that vary by model and by age at retirement?

**Step 3 — Build it in Looker Studio (1 hr).** Connect the Google Sheet directly — it's free,
browser-based, nothing to install, and it's one of the three tools the posting names. Six
tiles: scorecards for the headline numbers, a bar chart for recovery by country, a time series
for time-to-deploy. Nothing 3D, no pie chart with eleven slices. Label the axes. Set sharing to
"anyone with the link can view".

**Step 4 — The one-page memo (1 hr). This is your real differentiator.** Three findings, and
for each: *the number, why it happens, what I'd do about it.* An Economics student who writes
*"recovery in Côte d'Ivoire is 41% against 78% in Nigeria; at $600 a laptop that's $X a year;
I'd test a prepaid return label issued at exit"* is thinking like an owner, not a
button-pusher. That's who gets hired, and it maps straight onto the posting's *"translate
business questions into simple data analyses and insights."*

**Step 5 — Label it honestly.** Put a line at the top of the dashboard and the memo:
*"Synthetic dataset built to model a real asset-lifecycle problem."* Never imply it's real
company data.

### If you want the extra point
Load the same CSV into a free browser SQL tool (DB Fiddle, SQLite Online) and write two or
three of the answers as queries. Screenshot them into the memo. Now "basic knowledge of SQL"
is demonstrated rather than claimed — which is exactly the level they asked for.

---

## 4. Google Sheets — the one hard requirement

*"Familiarity with Excel or Google Sheets"* is the only tool requirement that isn't hedged with
"is an advantage". Make sure these are genuinely automatic before an interview:

- **Pivot tables** — group by country, sum a cost column. Build three from your device data.
- **`XLOOKUP`** (or `VLOOKUP`) — pull a value from another table by matching an ID.
- **`SUMIFS` / `COUNTIFS`** — conditional totals, the workhorse of every business report.
- **`IF` and nested conditions** — flag rows: returned late, never returned, over-repaired.
- **Date maths** — `delivered_date - assigned_date`, then a median of it.
- **Charts** — bar, line, and knowing which to use when.
- **Clean-up habits** — remove duplicates, `TRIM`, split columns, spot blanks.

Building the project above exercises every one of these. That's deliberate — don't study them
separately, just build the thing.

## 5. SQL — a week, an hour a day, and no more

The posting asks for *basic* SQL as an *advantage*. Get to honest-basic and stop; spend the
extra hours on the dashboard instead.

| Day | Focus |
|---|---|
| 1 | `SELECT`, `WHERE`, `ORDER BY`, `LIMIT` |
| 2 | `GROUP BY`, `COUNT`, `SUM`, `AVG`, `HAVING` |
| 3 | `JOIN` — inner and left. The one interviewers test |
| 4 | `CASE WHEN`, date functions, `NULL` handling |
| 5 | CTEs (`WITH … AS`) |
| 6–7 | Rewrite two or three of your project questions as queries |

Free, in-browser, no install: **SQLBolt** (sqlbolt.com), **Mode's SQL Tutorial**
(mode.com/sql-tutorial), **PostgreSQL Exercises** (pgexercises.com).

---

## 6. Likely screening questions

**"Why data analysis?"**
Connect it to Economics, not to a trend. *"Economics taught me to ask whether a number means
what people say it means. Analysis is the same question with better tools."*

**"You don't have work experience — why should we take you?"**
Don't apologise. *"I don't have a job history, so I built the thing instead — here's an asset
lifecycle dashboard and what I'd do about what it shows."* Then send the link.

**"How comfortable are you with SQL?"**
The posting asked for basic, so answer at that level without shrinking. *"Basic — I can select,
filter, group and join, and I've written queries against my own dataset. I'd expect to be
faster within a few weeks on real tables."* Never bluff a level you can't demonstrate live.

**"Do you know Power BI or Tableau?"**
*"I built my project dashboard in Looker Studio. The concepts carry — data source, dimensions,
measures, filters — so I'd expect to pick up Power BI quickly if that's what the team uses."*

**"How would you handle messy data?"**
Give a process, not an adjective: check duplicates, check nulls, check the date range makes
sense, check totals against a known source, then ask whoever owns the system about anything
that still looks wrong. That last step is the one juniors forget and managers love — and it's
duty #5 in the posting, *"data validation and quality checks"*.

**"Can you work full time?"** — **Have your real answer ready before they ask.**
If you can: say so plainly. If you need flex, say it early and without apology: *"I'm a
200-level student at an online university, so my schedule is genuinely flexible — but I want to
be straight with you about it. Is there room to agree hours, or is 40 a week firm?"* Asking in
the first conversation reads as professional. Discovering it after an offer reads as a problem.

**Your questions for them** — always have two:
- *"What would a successful first three months look like for this intern?"*
- *"I saw the role supports an existing Data Analyst — what does that working relationship
  look like day to day?"* (Shows you read the posting properly. Very few candidates do.)

---

## 7. Follow-up message (day 7–10, if no reply)

> Hi [Name], I applied for the Data Analyst Intern role on [date]. While waiting I built a
> small asset lifecycle dashboard — recovery rates by country, true cost per device once
> repairs are counted, and value recovered at disposal: [LINK]. Synthetic data, but the
> questions are real ones. Happy to walk through it if useful. — Peace

One follow-up. If there's no answer after that, move on and reuse the whole kit for the next
application — the dashboard doesn't expire, and every asset-heavy or logistics company in
Nigeria has the same problem.
