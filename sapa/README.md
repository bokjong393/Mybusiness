# SAPA

### Nigeria's Personal Financial Survival Simulator

**How far is Sapa from you — and can you survive when it comes?**

Most finance apps tell you how much you've spent. **SAPA tells you how long your money
can survive.** Enter a few numbers, get your financial runway, then play a month of real
decisions and see whether you can push your Sapa date further away.

> "Sapa" is Nigerian slang for being suddenly, comprehensively broke.

---

## What's in it

| | |
|---|---|
| **Sapa Meter** | A day-by-day cash simulation that estimates the date your money runs out. |
| **Battle Royale** | A 30-day survival game: 10 decisions drawn from a 26-event deck, each with deterministic financial consequences. |
| **Sapa Lab** | Stress-test five scenarios — cost of living up 20%, a ₦30,000 emergency, a spending cut — against your own numbers. |
| **Survival Report** | A downloadable, shareable 1080×1350 result card. |
| **Sapa Analytics** | First-party usage tracking that counts people without identifying them. |

## The rule everything else follows

**AI never calculates anything.**

Every naira value, runway, Sapa date, score and shock impact is computed by a pure
day-by-day simulation in [`src/lib/sapaEngine.js`](src/lib/sapaEngine.js). The model —
when it is switched on at all — is given a risk band and a day count, and is explicitly
forbidden from emitting a number. It writes three short strings.

```
        Your numbers                      Risk band + day count
             │                                     │
             ▼                                     ▼
   ┌───────────────────┐                 ┌──────────────────┐
   │   sapaEngine.js   │ ───────────────▶│  AI (optional)   │
   │  pure simulation  │                 │  describes only  │
   └─────────┬─────────┘                 └────────┬─────────┘
             │                                    │
             ▼                                    ▼
      Every figure shown              The wording around them
```

The app ships with AI **off**. A bank of 54 local commentary lines, written per risk
band, is the default experience — not a degraded fallback.

### How the simulation works

```
dailyBurn = weeklySpending / 7
balance   = currentCash

for each day, up to 365 (hard max 730):
    balance -= dailyBurn
    balance += any income scheduled that day
    balance -= any expense scheduled that day
    first day the balance hits zero → your Sapa date
```

Order within the day is deliberate: spend, then receive, then pay. Income landing on the
day you would have run out rescues that day — which is how a real bank balance behaves.

One subtlety worth knowing: repeated subtraction of a non-terminating daily burn leaves
floating-point residue. ₦70,000 at ₦10,000/week is *exactly* 49 days, but subtracting
₦1,428.571… forty-nine times ends on +1.4e-11 rather than zero, which would report the
Sapa date a day late. Anything under a millionth of a naira is treated as depleted.

### Risk bands

| Runway | Level |
|---|---|
| 60+ days | 🟢 Sapa cannot see you |
| 31–59 | 🟢 Soft life territory |
| 15–30 | 🟡 Sapa has your number |
| 8–14 | 🟠 Sapa is on the way |
| 3–7 | 🔴 Sapa is outside |
| 0–2 | ☠️ Sapa has entered the compound |

## Privacy architecture

This app asks people for financial information, so the design assumption is that it
should hold none of it.

- **Your money never leaves your browser.** Balance, spending, dates and results live in
  memory and `localStorage` only.
- **Analytics receives bands, never figures.** `₦85,342` becomes `"50000-100000"`. A
  15-day runway becomes `"15-30"`. Bands are deliberately wide enough not to be reversible.
- **Identity is a random string.** A `visitor_…` ID in `localStorage`. No fingerprinting,
  nothing derived from the device, no cross-site identifier.
- **Names are optional, always.** Skip and you are `Anonymous Survivor` forever.
- **Never collected:** BVN, account numbers, card details, passwords, location, phone, email.
- **Challenge links carry a day count and nothing else.**
- **Reset wipes everything**, including the random ID — see `/#/privacy`.

### Security model

The browser holds only the Supabase **anon** key, and it cannot read the `visitors` table
at all. Row Level Security is enabled with no permissive policy for the anon role, so
direct table access is denied. All writes go through `SECURITY DEFINER` database
functions that write narrowly:

- `sapa_touch_visitor` — upsert + count a visit; never overwrites a stored name with null
- `sapa_bump_counter` — the column name is **whitelisted in a `CASE`**, not interpolated
- `sapa_track_event` — insert only
- `sapa_public_stats` — aggregate totals only, no per-visitor rows

Admin reads (`sapa_admin_stats`, `sapa_admin_visitors`, `sapa_admin_activity`) re-check
`auth.role() = 'authenticated'` **inside the function**, because `SECURITY DEFINER`
otherwise bypasses RLS. Execute is revoked from `anon` as well — two independent locks.

`/admin` is gated by Supabase Auth, **not** by a password compared in frontend code. A
password constant in a public bundle is theatre: anyone can read it and call the database
directly.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 53 tests
npm run build
```

The app is **fully functional with no configuration at all** — analytics simply no-ops
and the homepage usage counter hides itself.

### Optional: analytics

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/policies.sql`](supabase/policies.sql).
3. Authentication → Users → add one admin user. Then Authentication → Providers →
   **disable public sign-ups**, so `/admin` cannot be self-registered.
4. Set the environment variables below and rebuild.

### Optional: AI commentary

Deploy [`api/prophecy.js`](api/prophecy.js) as a serverless function, set
`ANTHROPIC_API_KEY` **server-side**, and set `VITE_AI_ENABLED=true`.

On a static host there is no serverless route, so the flag stays `false` and the app never
fires a request that cannot succeed.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | client | Anon key — safe to expose, constrained by RLS |
| `VITE_AI_ENABLED` | client | `true` only where `api/prophecy.js` is deployed |
| `ANTHROPIC_API_KEY` | **server only** | AI key. Never prefix with `VITE_` |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Not used by this app; never expose it |

Anything prefixed `VITE_` is **inlined into the public bundle**. Secrets must never carry
that prefix. `.env.local` is gitignored; `.env.example` documents the shape.

## Testing

```bash
npm test
```

53 tests across three suites, run in CI on every push:

- **Financial engine** — zero cash, zero spending, negative balance, future income and
  expense, income landing on the day money runs out, the 365-day bound and 730-day hard
  cap, shock symmetry, formatted-string input, purity (no input mutation), risk
  classification across every day count from 0 to 400, and that bands are not reversible.
- **Battle engine** — deck integrity, seeded reproducibility, that the battle baseline
  *matches the Meter forecast for the same scenario* (otherwise players are asked to beat
  a different number from the one they were shown), score clamping, and that 40 full
  playthroughs never produce a `NaN`.
- **Analytics** — stable anonymous IDs, one visit per session rather than per page load,
  name sanitisation and length capping, and that every analytics call resolves rather than
  throwing when the backend is absent or storage is blocked.

## Deployment

Builds to static files; no server required for the core app.

**Vercel** — framework preset Vite, `npm run build`, output `dist`. The `api/` directory
becomes serverless functions automatically.

**GitHub Pages** — built by the workflow at the repository root with
`BASE_PATH=/Mybusiness/sapa/`. Routing uses `HashRouter`, so deep links and refreshes work
on a static host with no rewrite rules and no 404 page.

## Admin dashboard

`/#/admin` — not linked from the public UI.

Shows unique survivors, total visits, returning users and rate, per-feature counts, and
derived engagement metrics (battle completion rate, share rate, Meter→Battle conversion,
average visits per user). Below that: a named-visitor table, a recent activity feed, and
Today / 7-day / 30-day / All-time filters.

**Numbers are real or absent.** If analytics is unconfigured, the dashboard says so
plainly and the public counter renders nothing. Nothing in this project fabricates a usage
figure — the whole point of the dashboard is to be evidence.

## Disclaimer

Entertainment and education. Not financial advice, not a prediction, and not affiliated
with any bank or government agency. "Current national condition" is a joke, not data.
Game metrics (discipline, risk management, impulse control) are game metrics — not an
assessment of anyone's real finances.

## Licence

[MIT](../LICENSE) · Built by Peace Sossa for the MIVA May Cohort 25 AI Build Challenge.
