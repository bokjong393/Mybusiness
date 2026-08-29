# Triage: SDR/BDR Job Sweep → Signal Pool

**Source:** ATS sweep across Greenhouse, Lever, Workable and Ashby (~200 postings).
**Verdict:** roughly **50 usable pool rows** after cuts — about 40% of the 120-row target. Saves ~4 hours of *discovery*. Saves **zero** hours of *verification*, which is most of the work.

---

## The fatal gap: not one row has a date

Every pool row requires a signal date within 30 days. **This list has no dates at all.**

That is not a formatting problem. Without a date you cannot tell a role posted last Tuesday from one posted in March, and several Greenhouse job IDs in the sweep are low-numbered enough to be old. Some postings are certainly filled or closed.

Worse, some links point at **company boards rather than specific postings**, and several carry `?error=true` — meaning the page errored when it was crawled. Those are not sources; they are dead ends. Affected: Breezeway, Hightouch, Honeycomb, Analyst1, Connecteam, Security Compass, Hotmart, CreativeX, HERE, Ada.

**Every surviving row still needs the posting opened, the date read, and the URL copied from your own browser bar.** The sweep gave you candidates, not evidence.

---

## Cut 1 — too big to sell to (drop ~half the list)

An outbound agency cannot sell to a company with a 40-person in-house SDR team. The pool is 11–200 employees.

**Drop:** Notion · Twilio · Box · DoorDash · Webflow · UiPath · Eventbrite · Flexport · New Relic · 1Password · Perplexity · Culture Amp · Verkada · Gorgias · Motive · KnowBe4 · Similarweb · AlphaSense · CB Insights · Starburst · Enova · SpyCloud · Toptal · Veeva · BrightEdge · Canonical · JetBrains · Vonage · Awin · ConnectWise · Greenhouse · Tebra · Muck Rack · Innodata · BrainStation · Melio · Shopmonkey · think-cell · Aceable · AlertMedia · DevRev · SOCi · Mentimeter · Podium · Sensor Tower · CreatorIQ · Checkatrade · Planhat · Wayflyer · Clearco · Procurify · Absorb · Atlan · Easygenerator · Adthena · Restaurant365 · FiscalNote · Loadsmart · Firstup · UpGuard · Nuvei · Genetec · GBG · Jumio · Remote · Eventbrite

**Borderline — check headcount before using:** Hightouch · Cresta · Honeycomb · Galileo · Kargo · Litmus · Levitate · Canary Technologies · DearDoc · Outreach

## Cut 2 — intermediaries hide the actual buyer

Staffing and outsourcing firms recruit *on behalf of* unnamed clients. You cannot cite a signal for a company you can't name.

**Drop as pool rows:** Wing Assistant · Huzzle · Scale Army · Pavago · D2B · SV Academy · Remote People · Avomind · Toogeza · DevSavant · NoGigiddy · Lodgify

## Cut 3 — wrong geography

Agencies in the target set sell into US/UK/CA/AU/W. Europe. **Drop** all LATAM, India, Israel, Philippines, Pakistan, Singapore and Dubai rows.

---

## What survives — ~50 candidates worth verifying

**US (small/mid, mostly NYC · SF · Austin · Boston · Denver · Atlanta):**
Runwise · Eon · Arcana Analytics · Pallet · Sequence · Forus · Formance · NewForm · ModernFi · Axion · Sona · Coral AI · Candid Health · Assured · Assail · Noonlight · Coefficient · Trunk Tools · Archive · Swap · Archera · Wheelhouse · Feathery · Collective · Reducto · Listen Labs · Mithrl · Bland · SafetyKit · Sirius · Perfect Venue · Ascend · Starbridge · Aegis AI · Optro · Flai · Decoda Health · Doxel · Distro · Unison Infrastructure

**UK / Europe (small):**
Super Payments · FirstMind · GoodFit · Growth Kitchen · Orbital · Happl · Adaptive Security · Prismic · Bigblue · Packmatic · Secfix · Clera · Sonar · Sitetracker

**Canada (small):**
FacilityOS · Alternative Payments · Waterworth

---

## The best rows in the entire sweep

Three postings say **"Founding"** — Bigblue (Founding SDR, Berlin), Clera (Founding BDR, SF), Starbridge (Founding BDR, US remote).

A *founding* BDR role means the company has **literally zero outbound team**. They are building the function from nothing, right now, and have nobody running it. That is the strongest possible version of this signal type — better than a funding round, better than a leadership hire.

**Add these searches to the pool method permanently:**
```
site:jobs.ashbyhq.com "founding" ("BDR" OR "SDR")
site:job-boards.greenhouse.io "founding sales development"
site:jobs.lever.co "founding" "sales development"
```

## Bonus: the list contains your customers, not just your inventory

Several entries are **outsourced SDR and lead-gen firms** — which makes them ICP for the target list, not rows for the pool:

| Company | Why it's a prospect |
|---|---|
| **Reveneer** (Boston) | Outsourced SDR firm — squarely the ICP |
| **division50** | Posting "SDR — UK Cold Calling (Remote)" — an outbound agency |
| **SetSales** (London) | Sales-agency shaped; verify |
| **Victory Lap** | GTM consulting + BDR placement |
| **Huzzle** | Places SDRs with client companies — needs supply |

Move these to `templates/target-list.csv`. A firm hiring SDRs to serve *its* clients has exactly the capacity problem this business solves.

---

## Next actions

1. Take the ~50 survivors into the pool sheet, **company names only**.
2. Open each posting. Record the **date**. Drop anything over 30 days or closed.
3. Confirm headcount is 11–200 and the company is B2B.
4. Copy the **real URL** from your browser — never the `utm_source=chatgpt.com` version.
5. Move the five ICP finds to the target list.

**Realistic yield: 30–40 verified rows from ~50 candidates.** That is a third of the pool, and a genuine head start — but the verification is still yours.
