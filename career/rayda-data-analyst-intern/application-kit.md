# Rayda Data Analyst Intern — Application Kit

Everything here is a draft to edit, not a script to paste. Replace anything in `[brackets]`.
If a sentence isn't true about you, cut it — a startup founder can smell a template.

---

## 1. Cover letter draft

Keep it under 200 words. At a 27-person company the CEO or a founder may read this personally.

> Hi Rayda team,
>
> I'm applying for the Data Analyst Intern role. I'm a 200-level Economics student at Miva
> Open University, where statistics and econometrics are my core coursework rather than a
> side interest — so cleaning messy data and asking whether a number actually means anything
> is what I train on daily.
>
> Two things I'd bring beyond the basics. First, I'm fluent in French and English —
> Beninese-Nigerian — which may be useful as Rayda grows across Francophone West Africa.
> Second, I already work fully remotely: Miva is an online university, so managing my own
> schedule and deadlines without supervision is simply how I've studied for two years.
>
> To understand the problem you actually solve, I built a small analysis of device lifecycle
> data — recovery rates, time-to-deploy and repair cost per device. It's here: [LINK].
>
> I'm comfortable in spreadsheets and I'm working through SQL now [or: "I write SQL — joins,
> aggregations and CTEs"]. I'd like to learn the rest on real data, with people who'll tell
> me when I'm wrong.
>
> Peace Sossa
> [phone] · peace.launchoperator@gmail.com · [LinkedIn]

**Notes on why it's written this way**
- Line 1 says what you're applying for. No "I am writing to express my keen interest."
- French comes *early*, framed as useful to them, not as a fact about you.
- The project link is the whole letter's job. Everything else is context for it.
- The last line ("tell me when I'm wrong") signals coachability, which is what people
  actually hire interns for.
- **Only claim SQL fluency once it's true.** Say the honest version and they'll respect it;
  claim it and fail a live query, and it's over.

---

## 2. CV lines that pull weight

Reframe what you already have. None of this is invention — it's the same facts, said in the
language the reader is scanning for.

**Education**
> BSc Economics (in progress, 200L) — Miva Open University, Nigeria
> Relevant coursework: Statistics, Microeconomics, Macroeconomics, [Econometrics when you reach it]

**Skills** — order matters; lead with what the posting asked for
> Statistics · SQL (JOIN, GROUP BY, CTEs) · Google Sheets / Excel (pivot tables, lookups,
> charting) · Data visualisation · Languages: English (fluent), French (fluent), Korean (beginner)

**Projects** — this section is what gets you the interview
> **Device Lifecycle Analytics** (2026) — Built and analysed a device-fleet dataset covering
> assignment, return, repair and loss. Measured recovery rate by country, median time-to-deploy,
> and annual cost per device; wrote a one-page memo on where the money leaks. [Sheets/GitHub link]

**What not to do**
- No "References available on request" — it wastes a line.
- No photo, no age, no marital status. Not for a startup with a US entity.
- One page. Two is for people with ten years of experience.

---

## 3. The portfolio project — "Device Lifecycle Analytics"

**Why this one:** it is a small version of Rayda's own business problem. Anyone can submit a
Titanic dataset notebook. Almost nobody submits an analysis of *the thing the company sells*.

### Build it in about 4–6 hours

**Step 1 — Make the data (60 min).** You do not need real data and you should not pretend you
have it. Generate ~300 rows in Google Sheets, one row per device:

| device_id | model | country | assigned_date | employee_status | return_date | repair_count | repair_cost_usd | purchase_cost_usd |
|---|---|---|---|---|---|---|---|---|

Countries: Nigeria, Kenya, Ghana, Côte d'Ivoire, Philippines, Brazil. Make some returns late,
some never returned, some repaired twice. Realistic messiness is the point.

**Step 2 — Answer five questions (2 hrs).** These are the questions an IT-ops company loses
money on:

1. **Recovery rate** — of devices assigned to employees who left, what % came back? By country.
2. **Time-to-deploy** — median days from assignment to delivery. Where is it slowest?
3. **Cost per device per year** — purchase amortised + repairs. Which model is actually cheapest
   once repairs are counted? (Often *not* the cheapest to buy — that's your headline finding.)
4. **Repair concentration** — do 20% of devices generate 80% of repair cost?
5. **Value at risk** — total book value of unrecovered devices. One number, in dollars.

**Step 3 — Five charts (1 hr).** Bar chart for recovery by country. Line for time-to-deploy by
month. Nothing 3D, no pie charts with eleven slices. Label the axes.

**Step 4 — The one-page memo (1 hr). This is your real differentiator.** Three findings, and
for each one: *the number, why it happens, what I'd do about it.* An Economics student who
writes "recovery in Côte d'Ivoire is 41% versus 78% in Nigeria; at $600 a laptop that's $X a
year; I'd test a return-shipping prepaid label at exit" is thinking like an owner, not a
button-pusher. That is the person who gets hired.

**Step 5 — Publish.** Google Sheet set to "anyone with the link can view" is completely fine.
GitHub repo with a README is better. It must be a URL you can paste.

**Label it honestly** at the top: *"Synthetic dataset built to model a real device-lifecycle
problem."* Never imply it's real company data. Honesty here costs you nothing and protects
you completely.

### If you want the SQL version too
Load the same CSV into a free browser tool (DB Fiddle, SQLite Online) and write the five
answers as queries instead of formulas. Screenshot them into the README. Now you have
demonstrated SQL rather than claimed it.

---

## 4. The SQL sprint — one week, an hour a day

Free, no installation, works on a laptop or phone browser:

| Day | Focus |
|---|---|
| 1 | `SELECT`, `WHERE`, `ORDER BY`, `LIMIT` — SQLBolt lessons 1–6 |
| 2 | `GROUP BY`, `COUNT`, `SUM`, `AVG`, `HAVING` |
| 3 | `JOIN` — inner and left. This is the one interviewers test |
| 4 | `CASE WHEN`, date functions, `NULL` handling |
| 5 | CTEs (`WITH ... AS`) — how real analysts write readable queries |
| 6 | Window functions: `ROW_NUMBER()`, `RANK()`, running totals |
| 7 | Rewrite your five project questions as SQL queries |

Resources: **SQLBolt** (sqlbolt.com), **Mode SQL Tutorial** (mode.com/sql-tutorial),
**PostgreSQL Exercises** (pgexercises.com). All free, all in-browser.

By day 7 you can honestly say "I write SQL." Not "expert" — nobody believes an intern is.

---

## 5. Likely screening questions

**"Why data analysis?"**
Connect it to Economics, not to a trend. *"Economics taught me to ask whether a number means
what people say it means. Analysis is the same question with better tools."*

**"You don't have work experience — why should we take you?"**
Don't apologise. *"I don't have a job history, so I built the thing instead — here's an
analysis of device recovery rates and what I'd do about them."* Then send the link.

**"Do you know Segment / PostHog / Customer.io?"**
*"Not yet. I understand what each one is for — Segment collects events, PostHog analyses
product usage, Customer.io sends lifecycle messages — and I'd expect to be useful on them in
a couple of weeks."* Confident, honest, specific. Never bluff a tool.

**"What's a JOIN?"** — Be ready to say it in one sentence *and* write one.
*"It combines rows from two tables on a matching column. A LEFT JOIN keeps every row from the
left table even when there's no match — I use it when I don't want to silently drop records."*

**"How would you handle messy data?"**
Give a process, not an adjective: check for duplicates, check nulls, check the date range makes
sense, check totals against a known source, then ask whoever owns the system about anything
that still looks wrong. That last step is the one juniors forget and managers love.

**Your questions for them** — always have two:
- *"What would a successful first three months look like for this intern?"*
- *"Is there an existing data person I'd be learning from, or am I the first?"*
  (The answer changes the job enormously. Ask it.)

---

## 6. Follow-up message (send day 7–10 if no reply)

> Hi [Name], I applied for the Data Analyst Intern role on [date]. While waiting I put
> together a short analysis of device lifecycle data — recovery rates by country, cost per
> device once repairs are counted, and where the value leaks: [LINK]. Happy to walk through
> it if useful. — Peace

One follow-up. If there's no answer after that, move on and reuse the whole kit for the next
application — the project doesn't expire.
