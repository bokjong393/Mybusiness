# Rayda Data Analyst Intern — Application Kit

**Rewritten after reading your CV and LinkedIn.** The earlier version of this file assumed you
had no work history, no SQL and no BI tools. All three were wrong. What follows uses what you
actually have.

Companion files: `cv-rayda.md` (the tailored CV) and `linkedin-fixes.md` (profile fixes).

---

## 1. Cover letter draft

Around 200 words. It leads with evidence because you have evidence — no placeholder project, no
hedging.

> Hi Rayda team,
>
> I'm applying for the Data Analyst Intern role. I'm a 200-level Economics student at Miva Open
> University (CGPA 4.53/5.00), and I've been doing a version of this work for the last year and
> a half.
>
> As an independent research analyst I pull financial data from six sources that don't agree
> with each other — the IMF Financial Access Survey via FRED, NIBSS, the Central Bank of
> Nigeria, EFInA and GSMA — clean them into comparable series, verify every figure against its
> primary source, and publish the methodology and limitations alongside the result. My July
> study found that Nigeria's third-place regional rank by mobile money accounts hides the
> lowest per-capita penetration in the region; that only shows up once the series is normalised.
> [LINK, if you have one.]
>
> Alongside that, seventeen months as a remote executive assistant tracking distribution sales
> and expenses, reconciling cash, and delivering the monthly report to the Director — sixteen
> consecutive cycles, on time.
>
> On your tools: Excel and Sheets daily, certified in MySQL and in Tableau and Power BI, and I
> studied SQL databases during my first year at Université d'Abomey-Calavi. I'm also native in
> French and English, which may be useful as Rayda grows across Francophone West Africa.
>
> Peace Sossa
> +234 903 052 5488 · peace.sossa@gmail.com · linkedin.com/in/peacesossa

**Why it's built this way**
- **Paragraph two is the whole letter.** It is Rayda's first listed duty — *"collection,
  cleaning and organisation of data from different business systems"* — described in your own
  real work, with a specific finding attached. Very few interns can write that paragraph.
- **"Sixteen consecutive cycles, on time"** does more work than any adjective. It answers the
  unasked question about a remote hire: will she deliver without being chased?
- **Tools come last and land flat.** No apology, no "I'm still learning" — you hold certificates
  in the exact tools they listed as advantages. State them and move on.
- **Use `peace.sossa@gmail.com`**, not your other address. Match the CV and LinkedIn exactly.
- If the mobile money study isn't publicly linkable, cut the bracket. Don't link something
  half-finished — but see §3, because making it linkable is worth an hour.

---

## 2. What you no longer need to do

The plan in the earlier version had you spending a week learning SQL and an afternoon learning
Looker Studio. Reading your actual documents, both were solving problems you don't have:

| Earlier advice | Reality |
|---|---|
| "SQL is the one thing that decides it" | You have a **Database Management with MySQL** certificate and studied SQL databases at Abomey-Calavi. It's on your CV skills line |
| "Learn Looker Studio to close the visualisation requirement" | You're certified in **Tableau and Power BI** — two of the three tools they name |
| "Build a synthetic dataset, you have no portfolio" | You have **published research** with documented methodology, benchmarks and a limitations section |
| "No work experience — don't apologise for it" | **17 months** of remote work across two roles. The posting asks for 0–1 year; you're at the top of that band |

**What's actually left:** a refresher, a link, and one artefact. That's it — maybe six hours
total, not two weeks.

---

## 3. The three things worth doing

### a) Make the mobile money study linkable — 1 hour, do this first
This is your strongest asset and right now it may be invisible. Publish it where it has a URL:
a LinkedIn article, Substack, Medium, or even a clean PDF in Google Drive set to "anyone with
the link". Then put that link in your CV bullet, your cover letter and your LinkedIn.

A hiring manager who clicks through to sourced, dated analysis with a limitations section has
already made up their mind. Nothing else you build this week beats that.

### b) Turn a certificate into an artefact — 3 hours
You're certified in Power BI and Tableau, but there's nothing anyone can *look at*. Build one
dashboard over the data you already have — your West African financial access figures — and
publish a screenshot or a link.

Four or five tiles is enough:
- Accounts per capita by country, ranked — your headline finding, as a bar chart
- Registered versus active accounts side by side — the distinction you documented
- The trend over time for the three markets you compared
- A scorecard or two for the numbers that matter most
- One note on the page naming your sources and their dates

**Why this beats the synthetic device dataset I suggested earlier:** it's real data you sourced
and verified yourself, it proves the certificate, and it's the same skill Rayda needs — turning
messy multi-source data into something a non-analyst can read. Domain fit is nice; provenance
and rigour are better.

*If you'd rather have something Rayda-shaped as well, the device-fleet version is in the git
history of this file — but do this one first.*

### c) SQL refresher — 2 hours, not a week
You've studied it and you're certified. You just need it fresh enough to write a query on a call
without freezing. Two hours on SQLBolt or PostgreSQL Exercises, focused on:
`SELECT` → `WHERE` → `GROUP BY` → `JOIN` (inner and left) → `CASE WHEN`.

That's the level the posting asked for — *"basic knowledge of SQL is an advantage"* — and you're
already there. Don't over-invest.

---

## 4. Likely screening questions

**"Tell me about yourself."**
Lead with the research, not the studies. *"I'm an Economics undergraduate, and for the past year
and a half I've been doing independent research on West African financial markets — pulling data
from the IMF, the Central Bank of Nigeria, NIBSS and others, cleaning it into comparable series
and publishing with the methodology attached."* Then the degree. Then the VA role for the
reliability story.

**"How comfortable are you with SQL?"**
*"I studied SQL databases in my first year at Abomey-Calavi and I'm certified in MySQL. I'd call
it solid basic — select, filter, group, join. I haven't used it daily, so I'd be a bit slow in
week one and fine by week three."* That's honest, specific, and it beats a confident bluff you
can't back up live.

**"Power BI or Tableau?"**
*"Certified in both. Here's a dashboard I built over my own research data —"* then show it. This
is exactly why §3b is worth three hours.

**"You're a student — can you work full time?"**
Have your real answer ready. If you need flex, say it early and without apology: *"Miva is an
online university, so my schedule is genuinely flexible — but I want to be straight with you.
Is there room to agree hours, or is 40 a week firm?"* Asking in the first conversation is
professional; discovering it after an offer is a problem.

**"You do freelance research — how does that fit with a full-time role?"**
They will see your LinkedIn, so expect this. Decide your answer before the call, and make it a
clean one. *"I've been building research skills independently because there wasn't a role to
build them in. This is the role."* Don't improvise this one.

**"How would you handle messy data?"**
You have the best possible answer and it's already on your CV: check it against the primary
source. *"I verify every figure against its original source before it goes anywhere, and I
document the limitations — for instance, most coverage of Nigerian mobile money conflates
registered and active accounts, which changes the conclusion entirely."* That is duty five of
their posting, answered with a real example.

**Your two questions for them**
- *"What would a successful first three months look like for this intern?"*
- *"I saw the role supports an existing Data Analyst — what does that working relationship look
  like day to day?"* Shows you read the posting properly. Most candidates don't.

---

## 5. Follow-up message (day 7–10, if no reply)

> Hi [Name], I applied for the Data Analyst Intern role on [date]. Since then I've published a
> dashboard over my West African financial access data — accounts per capita across three
> markets, registered versus active, sources dated on the page: [LINK]. Same approach I'd bring
> to product and billing data. Happy to walk through it. — Peace

One follow-up. If there's no reply after that, reuse all of this for the next application —
nothing in it expires.
