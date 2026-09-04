<div align="center">

# Ayoka

**An AI studio that helps African freelancers win clients, defend their prices, and get paid.**

English and French · Naira, CFA, cedi, shilling, dollar, euro, pound

</div>

---

## What this repository is

A complete, deployable digital-product business — not a demo:

- **A working product.** Eight AI generators that produce client proposals, cold
  outreach, follow-up sequences, price-objection responses, profile rewrites,
  discovery call scripts, work agreements and invoices. Bilingual, currency-aware.
- **A storefront.** Sales page, pricing with regional prices, legal pages, and a
  post-purchase flow.
- **Licensing that works without a database.** HMAC-signed keys you mint from the
  command line after each sale.
- **Spend guardrails.** Per-IP and per-licence daily limits, a global daily token
  budget, and an 8,000-token output ceiling — because every generation costs
  real money.
- **The business itself.** Unit economics, pricing strategy, a 30-day launch
  plan, eight ready-to-post marketing pieces, an operations runbook and the five
  metrics worth tracking. See [`business/`](business/).

No build step. No framework. Two dependencies-worth of complexity, one of them
being the Anthropic SDK.

---

## Quick start

```bash
npm install
cp .env.example .env

# Generate a licence-signing secret and paste it into .env
node scripts/mint-license.mjs --new-secret

# Add your Anthropic API key to .env, then:
npm start          # → http://localhost:3000
```

Then, **before you do anything else**, set a hard spend limit in the
[Anthropic Console](https://console.anthropic.com) → Billing → Limits. Start at
$20. It is the only guardrail a bug in this code cannot defeat.

### Verify it works

```bash
npm run smoke      # one real API call (~$0.05): prints tokens, cost, quality checks
node scripts/test-guardrails.mjs   # rate limits, licence tiers, validation — no API calls
node scripts/test-markdown.mjs     # output rendering + XSS safety — no API calls
```

### Mint a licence after a sale

```bash
node scripts/mint-license.mjs pro                # lifetime Pro key
node scripts/mint-license.mjs starter --days 365 # one-year Starter key
node scripts/mint-license.mjs --check AYK-...    # verify a key a customer sent you
```

---

## Deploying

### Vercel (easiest, free tier is enough to start)

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new). No build settings needed.
3. Add environment variables: `ANTHROPIC_API_KEY`, `LICENSE_SECRET`,
   `DAILY_OUTPUT_TOKEN_BUDGET`, `FREE_RUNS_PER_DAY_PER_IP`,
   `PAID_RUNS_PER_DAY_PER_LICENSE`.
4. Deploy. `api/generate.js` and `api/catalogue.js` become serverless functions;
   `public/` is served statically.

### Anywhere else that runs Node (Render, Railway, Fly, a VPS)

`npm start` runs everything — static site and API — from one process. Set the
same environment variables. This option gives you *better* rate limiting than
serverless, because the counters live in one long-running process instead of
resetting on every cold start.

---

## How it fits together

```
lib/packs.js       The 8 generators: fields, tiers, and the prompt each one builds.
                   Adding a generator is ~40 lines here and nothing else.
lib/prompts.js     The system prompt. Stable by design — see the warning at the top.
lib/handler.js     One host-agnostic request handler: licence check → tier gate →
                   rate limit → budget guard → validation → streaming Claude call.
lib/license.js     Mint and verify HMAC-signed licence keys. No database.
lib/store.js       Daily usage counters. Swap for Redis when volume needs it.

server.js          Standalone Node server (static + API). Runs anywhere.
api/*.js           Thin Vercel adapters over lib/handler.js.

public/            The site: sales page, the app, legal pages. Vanilla everything.
scripts/           Licence minting, live smoke test, two offline test suites.
business/          The business: economics, pricing, launch plan, copy, ops, metrics.
```

**The request path**, end to end: the browser POSTs to `/api/generate` →
`lib/handler.js` verifies the licence, checks the tier, the per-identity rate
limit and the global token budget, validates every field against its definition
in `lib/packs.js` → streams from Claude → newline-delimited JSON back to the
browser, which renders it through a small escape-first Markdown renderer.

---

## Configuration

Every knob lives in `.env` — see [`.env.example`](.env.example) for what each one
does.

| Variable | Default | What it controls |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required |
| `LICENSE_SECRET` | — | Required. **Changing it invalidates every key you have sold.** |
| `ANTHROPIC_MODEL` | `claude-opus-5` | The model |
| `ANTHROPIC_EFFORT` | `medium` | Cost/quality dial. `low` is cheaper; measure before you ship it |
| `DAILY_OUTPUT_TOKEN_BUDGET` | `200000` | Global daily stop (~$5/day at Opus 5 pricing) |
| `FREE_RUNS_PER_DAY_PER_IP` | `3` | Free tier limit |
| `PAID_RUNS_PER_DAY_PER_LICENSE` | `60` | Paid tier limit — this is what keeps "lifetime" affordable |
| `REVOKED_LICENSES` | — | Comma-separated keys to reject (refunds, sharing) |

---

## Before you go live

- [ ] Hard spend limit set in the Anthropic Console
- [ ] Real `LICENSE_SECRET` (not the placeholder), stored somewhere safe
- [ ] Every `[BRACKET]` filled in across `public/legal/*.html`
- [ ] `grep -rn "example.com" public/` returns nothing
- [ ] Real checkout URLs in the `PRICING` object in `public/index.html`
- [ ] Prices set from local willingness to pay, not an exchange rate
      ([why](business/02-pricing-and-offers.md#these-are-starting-points-not-conversions))
- [ ] You have bought your own product, with your own card, end to end
- [ ] `npm run smoke` passes and you have read the output as a customer would

---

## Design decisions worth knowing

**Why the model is never allowed to invent credentials.** A fabricated case study
destroys a freelancer's reputation the first time a client checks. The system
prompt forbids it outright and instead makes the tool say, plainly, that one real
number would convert better. This costs some polish in the output and is worth it.

**Why every response ends with "⚠️ Before you send this".** The draft gets you
85% of the way. The warning section is what stops people sending the other 15%
unread — it is the difference between a tool and a liability.

**Why one-time pricing and daily caps.** Subscriptions fail on card renewals in
this market. A lifetime licence with a 60/day cap is affordable to serve
(see the [unit economics](business/00-business-plan.md#4-unit-economics--the-only-maths-that-matters))
and removes the objection that kills most sales here.

**Why regional pricing.** A flat global price is a tax on being born in the wrong
place. ₦9,900 in Lagos and $19 in London are the same decision for the buyer.

**Why no framework, no build step.** This has to be maintainable by one person
who is also studying full time. Every file can be opened and understood without
a toolchain.

---

## Start here

1. **[`business/00-business-plan.md`](business/00-business-plan.md)** — the model, the maths, the risks
2. **[`business/02-pricing-and-offers.md`](business/02-pricing-and-offers.md)** — set your real prices
3. **[`business/01-launch-plan-30-day.md`](business/01-launch-plan-30-day.md)** — day by day to first sale
4. **[`business/03-marketing-copy-bank.md`](business/03-marketing-copy-bank.md)** — eight posts, ready to send

---

## Licence

Business source. Do what you like with it for your own business; do not resell
the code as a competing product.

**Ayoka does not give legal, tax or financial advice.** The Scope & Agreement and
Invoice generators produce plain-language drafts that need review by a qualified
professional in your jurisdiction.
