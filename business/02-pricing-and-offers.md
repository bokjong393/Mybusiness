# Pricing and offers

> Read this before the launch plan. Getting the price wrong is the most common
> way a good product dies, and it is much harder to raise a price later than to
> start at the right one.

---

## The prices that ship today

These are already live in `public/index.html` (search for `const PRICING`). Change
them there — one object, one place.

| | USD | NGN | XOF (CFA) |
|---|---:|---:|---:|
| **Free** | $0 | ₦0 | 0 |
| **Starter** | $19 | ₦9,900 | 9 900 F |
| **Pro** | $39 | ₦19,900 | 19 900 F |

### These are starting points, not conversions

**Do not compute the local prices from an exchange rate.** They are set by what
the local buyer can pay and will pay, which is a different number. Before you
launch, do this:

1. Check today's real USD→NGN and USD→XOF rates. They move.
2. Ask five actual freelancers in each market: *"What would you pay, once, for a
   tool that writes your client proposals and tells you what to say when someone
   says you're too expensive?"* Do not lead them. Write down the number.
3. Set the local price near the **middle** of what they say, not the top.
4. Round to something that looks deliberate. ₦9,900 reads as priced. ₦9,847
   reads as a currency conversion, which makes people go and check the rate.

**Sanity floor:** never let a local price fall below **$4**, or a heavy user on
that plan costs you more than they paid. See the unit economics in
[`00-business-plan.md`](00-business-plan.md#4-unit-economics--the-only-maths-that-matters).

---

## Why one-time and not a subscription

Subscriptions make more money per customer. They are still the wrong choice here,
for now:

- **Card failure rates in Nigeria and francophone West Africa are brutal.** A
  subscription that silently dies on renewal is a support burden you cannot carry
  while you are studying.
- **Your buyer distrusts recurring charges.** Many have been burned by a "free
  trial" that kept billing. A one-time price removes the biggest objection you
  have to fight.
- **You cannot support a subscription yet.** Subscriptions imply a roadmap, an
  SLA and a reason to keep paying. You have none of those in month one, and
  promising them is how you end up owing strangers work during exam season.

**When to revisit:** at 300+ paying customers, add a **Team** plan at $99 for
five keys, and only then consider a $9/month "Ayoka Plus" with new generators
every month. Never convert existing lifetime buyers to a subscription. You
promised them lifetime. Keep it — it is the whole reason they trusted you.

---

## Why the free tier is three a day, not seven

Three is enough to feel the product work and not enough to run a freelance
business on. That gap is the offer.

| Free tier | What happens |
|---|---|
| 1 a day | Nobody gets to a "wow". They leave and never come back. |
| **3 a day** | **They write one proposal, one follow-up and one outreach — a real day's work — then hit the wall wanting more.** |
| 10 a day | They never need to buy. You pay for their whole business. |

Which three generators are free matters more than the number. **Proposal,
Outreach and Follow-Up are free because they are the top of the funnel** — the
things a freelancer does before they have any money. **Price Defence is paid
because it is the one that makes them money**, and the moment someone says "that's
too expensive" they will pay $19 to know what to say back.

---

## The three offers that will actually sell

### 1. The founding-customer offer (weeks 1–2 only)

> **First 50 customers: Pro at the Starter price, and your name in the credits.**

Why it works: scarcity that is real (you can count to 50), a reason to buy *now*,
and it recruits your first testimonials. Say plainly that the price goes up after
50. Then actually raise it. If you do not, nobody believes your next offer.

### 2. The bundle-with-proof offer (ongoing)

> **Buy Pro, send me the proposal you won with, and get the next tool free
> forever.**

Why it works: your biggest problem in month one is having zero proof. This buys
proof with something that costs you nothing.

### 3. The francophone launch offer (week 3)

> **Ayoka parle français. Première semaine : -40% pour les freelances
> francophones.**

Why it works: it is a genuinely new market announcement, not a discount for its
own sake. Run it once, close it, and never discount francophone pricing again.

---

## What never to discount

- **Never run a "50% off, today only" that is not today only.** Your buyer is a
  freelancer. They watch clients do this to them. They will spot it instantly.
- **Never discount below your $4 floor.** A customer who costs more than they
  paid is worse than no customer.
- **Never discount to close one loud person.** Give them a refund instead. It is
  cheaper than teaching a public audience that your price is negotiable.

---

## Payment providers — pick two

You need one international and one local. Do not build a checkout.

| Provider | Region | Cut | Why |
|---|---|---|---|
| **Gumroad** | Global | ~10% | Fastest to launch. No company needed. Handles VAT. Ugly but it works and it works today. |
| **Lemon Squeezy** | Global | ~5% + 50¢ | Merchant of record — they handle global sales tax for you. Better long-term than Gumroad. |
| **Paystack** | NG, GH, ZA, KE | ~1.5% + ₦100 | Cards, bank transfer, USSD. What Nigerians actually trust. |
| **Flutterwave** | NG + francophone WA | ~1.4% | Best francophone coverage: **mobile money in Benin, Côte d'Ivoire, Senegal**. |

**Recommended starting pair: Gumroad + Paystack.** Move to Lemon Squeezy +
Flutterwave once you have 50 sales and the admin overhead is worth it.

> **Mobile money matters more than cards.** In Benin, Togo and Côte d'Ivoire, MTN
> and Moov mobile money is how people pay for things. Flutterwave covers it.
> Card-only checkout locks out a large part of your best market.

---

## Delivery: what the buyer gets, and when

The moment money lands, they need a key. Two ways to do it:

**Manual (start here — do not automate this on day one)**
1. Payment notification arrives on your phone.
2. Run `node scripts/mint-license.mjs pro` — takes ten seconds.
3. Paste the key into the reply template in
   [`04-operations-runbook.md`](04-operations-runbook.md).
4. Log the sale in your sales sheet.

Manual delivery is fine up to about 20 sales a week, and it forces you to talk to
every early customer — which is worth more than the time it costs.

**Automated (after ~20 sales a week)**
Gumroad, Lemon Squeezy and Paystack all send a webhook on a successful payment.
Point it at a small endpoint that calls `mintLicense()` and emails the key. It is
about 40 lines. Do not write it before you need it.

---

## Raising prices later

You will want to. Do it like this:

1. Announce it two weeks ahead, publicly, with the new price and the date.
2. Anyone who already bought keeps what they bought, forever, at no cost. Say so
   loudly — this is the sentence that makes the announcement land as good news.
3. Raise it. Do not extend the deadline.

Steps 1 and 2 turn a price rise into a launch event, and the two weeks before
the increase will usually be your best sales fortnight of the quarter.
