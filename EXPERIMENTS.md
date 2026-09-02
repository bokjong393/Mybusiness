# EXPERIMENTS.md — Experiment Log

Every experiment gets a written hypothesis **before** it runs and a verdict **after**. A hypothesis written afterwards is a rationalization.

**Format rule:** state what result would prove you wrong, before you start.

---

## E1 — Proof-first outreach to B2B agencies *(status: **RUNNING** — started 2026-08-30)*

**Hypothesis:** Small B2B agencies will reply at ≥5% to a cold message containing 3 free, verified, cited buying signals, and ≥1 in 200 will pay $147 for a 50-row pack.

**Falsifier:** 200 contacts, 5+ conversations, 0 payments → agencies do not value this enough to buy it.

**Method:** 200 contacts over 30 days across LinkedIn and email. 3 free rows each, never repeated. Follow-up on day 3 and day 7.

**Thresholds:** ≥10 replies · ≥5 conversations · ≥3 serious leads · **≥1 payment**

| Metric | Target | Actual |
|---|---:|---:|
| Contacts | 200 | **36** |
| Replies | 10 | 0 |
| **Connections accepted** | — | **6** |
| Reply rate | 5% | — *(n too small to read)* |
| Conversations | 5 | 0 |
| Serious leads | 3 | 0 |
| Paid | 1 | 0 |
| Revenue | $147 | $0 |

### Log

| Date | Sent | Cumulative | Channel | Note |
|---|---:|---:|---|---|
| 2026-08-30 | 3 | 3 | LinkedIn | **First outreach.** ThynkGrowth (IN), Danish Lead Co (DK), LeadLeadBangBang (FR) — all Smartlead partners, all pass the meetings test. Sample: Eon / Runwise / Archive. Xavier approached in French. |
| 2026-08-30 | — | 3 | LinkedIn | **First connection accepted — Faraz Ahmed, ThynkGrowth.** Sample delivered with the 57-posting stale-rate finding as the hook. No price quoted deliberately (price-sensitivity test: India-based, so our cost arbitrage is neutralised — if he asks price after seeing the work, quality is what sells). |

| 2026-08-30 | 10 | **13** | LinkedIn | Batch 2 sent: Cold Labs (tailored signal-supply opener), the three francophone agencies in French (Reachly, SalesGent, Grow Surely), plus Top of Funnel, Kale Acquisition, Leadinate, ProspectUp, frontBrick, Vision Media. |

| 2026-08-31 | 10 | **23** | LinkedIn | Batch 3 — first 20 complete. Variant A to seven generalists, Variant B (Runwise only) to BuildingReach and Brokr Leads, Variant C (conceding opener) to ColdIQ. |

| 2026-08-31 | — | 23 | LinkedIn | **Second acceptance — Dimitar Petkov, LeadHaste.** Acceptance rate 2/23 (~9%). LeadHaste publishes on cold-email deliverability, so the opener referenced their own subject matter before the stale-rate finding. |

| 2026-09-01 | 13 | **36** | LinkedIn | Batch 4. Audience-pitch variant to Lead Gen Jay and Revenue Boost; standard to eleven others. Romain Osman (Five Element) and Nate Calhoun (Inbox Accelerator) not locatable on LinkedIn — blocked pending a channel switch. |

| 2026-09-01 | — | 36 | LinkedIn | **Three more acceptances** — Ericson Dalusong (Lead Assassin), Kenny Saad (Vision Media), Huzaifa Majeed (UpscaleB2B). Acceptance 5/36 (~14%), more than double the ~6% reading a few hours earlier. **Confirms acceptance rate lags by days and must not be judged same-day.** |

| 2026-09-02 | — | 36 | LinkedIn | Sixth acceptance — Cesar Espino (Leadify). Acceptance 6/36 (17%), up from ~6% two days earlier. Six samples now delivered, still 0 replies; the day-3 follow-up round is the first real test of the message. |

**Pipeline state:** 23 contacted · 40 queued (was: 13 contacted · 9 queued (Spring Drive, ScaleSprint, Newlead, Digital Creativs, BuildingReach, LeadHaste, Kinetyca, Brokr Leads, Leadgrove) · 1 blocked (ColdIQ, needs correct LinkedIn URL).

**Expected replies at n=13:** 0.65–1.0 at the 5–8% benchmark. **One reply is on-model. Zero is also on-model.** Neither outcome carries information yet.

**Follow-ups due:** 2026-09-02 (day 3) · 2026-09-06 (day 7) · 2026-09-20 (fresh signals, no pitch)

**Do not read anything into the first 60 contacts.** At n=3 a zero reply rate carries no information — the benchmark reply rate is 5–8%, so the expected number of replies from 3 contacts is roughly 0.2. Silence here is the most likely outcome even if the message is excellent. The diagnostic thresholds in `plans/VALIDATION.md` only become meaningful from ~150 contacts.

**Verdict:** *(pending)*
**What we learned:** *(pending)*

---

## E2 — Channel split: LinkedIn vs cold email *(status: not started)*

**Hypothesis:** LinkedIn will out-reply cold email by ≥3 percentage points, because visible identity offsets the location trust penalty.

**Falsifier:** email matches or beats LinkedIn over 100 contacts each → the trust penalty is not channel-dependent, and we should optimize for volume instead.

**Method:** 100 contacts through each, identical offer, tracked separately.

**Why it matters:** determines where every future hour of outreach goes.

**Verdict:** *(pending)*

---

## E3 — Price test: $147 vs $197 *(status: not started, run at day 31)*

**Hypothesis:** Close rate will not drop materially between $147 and $197 — the barrier is trust, not price.

**Falsifier:** close rate halves at $197 → price is a real constraint and the ladder must be rebuilt.

**Method:** all new prospects from day 31 quoted $197. Compare close rate to the day 1–30 cohort.

**Verdict:** *(pending)*

---

## E4 — Sample size: 3 rows vs 10 rows *(status: not started)*

**Hypothesis:** 10 free rows converts to conversation at more than 2× the rate of 3 rows, justifying the extra research time on warm prospects only.

**Falsifier:** conversion is flat → keep 3 rows and spend the saved hours on volume.

**Verdict:** *(pending)*

---

## E5 — Plan B probe: bid/tender monitoring *(status: not started, run at day 61)*

**Hypothesis:** SMB contractors will pay $250/month for a human-qualified weekly tender shortlist, at a higher retention rate than agency prospect research.

**Falsifier:** 30 contacts, 0 paying clients → Plan B is not a viable migration and we commit to scaling Plan A.

**Verdict:** *(pending)*

---

## Backlog

- Does adding a suggested opening line per row raise the retainer conversion rate?
- Does a redacted public sample file outperform a testimonial in cold outreach?
- Do recruiters (Plan C) reply at a higher rate than agencies to the same mechanic?
- Does stating "based in Nigeria" up front help or hurt reply rates? *(Uncomfortable to test, but the answer is worth knowing — assumption is currently untested in both directions.)*
