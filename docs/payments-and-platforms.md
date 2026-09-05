# Getting Paid — Nigeria and Francophone Africa

The single most expensive mistake available here is building a product on a platform
that will happily take customers' money and then refuse to send it to me.

## The Stripe trap — read this first

**Stripe does not support payouts to sellers in Nigeria.** Gumroad, Lemon Squeezy,
Payhip, Sellfy and Podia all rely on Stripe Connect for seller payouts.

The consequence: on those platforms I can create products and *accept* buyer payments,
but I may be unable to withdraw the balance. Money arrives, and sits there.

There are documented workarounds, and one of them circulates widely in indie-creator
communities: **opening a Stripe account under a relative in a supported country.** I am
not doing that. It violates the terms of service, and the account it freezes will be the
one holding my money — with no recourse, because the account was never legitimately mine.
The legitimate routes below work well enough that the risk is not worth taking.

## Rails that actually pay out to me

### Nigeria and diaspora

| Rail | Best for | Rough cost | Notes |
|------|----------|-----------|-------|
| **Selar** | Primary storefront | ~5% + fees | Built for African creators. Paid ₦18bn to 400k creators last year. NGN and USD. Start here. |
| **Paystack / Flutterwave** | My own site | ~1.5% + ₦100 | Cheaper, but I have to build and maintain the storefront |
| **Gumroad → Payoneer or Grey** | International buyers | 10% + payout fees | The documented working route for Nigerian sellers |
| **Lemon Squeezy → PayPal** | International, VAT handled | ~5% + fees | Merchant of record — it handles global sales tax. PayPal payouts reach 200+ countries |

### Francophone West Africa

| Rail | Coverage | Rough cost | Notes |
|------|----------|-----------|-------|
| **Wave** | Senegal, Côte d'Ivoire | ~1% flat | Cheapest in the region. Now past Orange Money in Senegalese transaction volume |
| **Orange Money** | 17 countries, 40M users | varies | The incumbent |
| **MTN MoMo** | 21 countries, 57M users | varies | Widest African footprint |
| **A licensed aggregator** | All of the above | ~1% | One integration covering Orange Money, Wave, MTN MoMo, Free Money and Moov — worth it rather than maintaining each rail |

## What this means in practice

1. **Nigerian market → Selar.** Simplest correct answer, purpose-built, pays out reliably.
2. **Francophone market → mobile money via an aggregator, with Wave prioritised** in
   Senegal and Côte d'Ivoire. Pricing in XOF rather than USD removes a real conversion
   barrier for buyers.
3. **Global buyers → Lemon Squeezy with PayPal payout**, because merchant-of-record
   status means I never have to handle EU/UK VAT registration.
4. **Never build the primary funnel on a rail I have not personally withdrawn from once.**
   Test with a ₦500 product bought by a friend, and withdraw it, before launching anything.

## A note on price anchoring

XOF and NGN pricing is not just a translation of a dollar price. 25,000 XOF (~$40) reads
as a serious, considered purchase to an Abidjan business owner in a way that "$40" does
not. Price in the buyer's currency and their mental math works in my favour.
