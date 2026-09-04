# Operations runbook

> What to do when something happens. Keep this open in a tab for the first
> month.

---

## Daily (5 minutes)

- [ ] Check the Anthropic Console spend. Is it tracking where you expect?
- [ ] Deliver any licence keys from overnight sales (target: within 1 hour).
- [ ] Reply to every DM, comment and email. Same day, every day.

## Weekly (30 minutes, Sunday)

- [ ] Fill in the metrics row — see [`05-metrics.md`](05-metrics.md).
- [ ] Read the week's support emails. Any complaint said twice becomes this
      week's fix.
- [ ] Write next week's posts in one sitting and schedule them.
- [ ] Reconcile: sales recorded = licence keys issued. If they disagree, find
      out why today.

---

## A sale comes in

1. Payment notification arrives.
2. Mint the key:
   ```bash
   node scripts/mint-license.mjs pro      # or: starter
   ```
3. Reply to the buyer within the hour with the template below.
4. Log it in your sales sheet (columns in the next section).

### The delivery email

> **Subject:** Your Ayoka licence key
>
> Hi [NAME],
>
> Thank you — genuinely. You're customer number [N].
>
> Your key:
>
> **AYK-XX-XXXXXXXX-XXXXXXXXXX**
>
> To use it: open [YOUR-DOMAIN]/app, click **🔑 Licence** at the top right,
> paste the key, hit Save. That's it — the device remembers it.
>
> One suggestion on where to start. Don't pick the most interesting tool, pick
> the one that gets you money this week:
>
> - Client gone quiet → **Follow-Up Sequence**
> - Someone said you're too expensive → **Price Defence**
> - Invoice overdue → **Invoice & Payment Chase**
> - Nothing in the pipeline → **Profile Rewrite**, then **Cold Outreach** daily
>
> If anything is confusing or wrong, reply to this email. It comes straight to
> me and I answer everything.
>
> — Peace

---

## Your sales sheet

One spreadsheet, seven columns. Do not use a CRM.

| Date | Name | Email | Plan | Amount | Currency | Licence key |
|---|---|---|---|---|---|---|

**You need this for three reasons:** re-issuing lost keys, revoking on refund,
and tax. Back it up somewhere that is not your laptop.

---

## Someone lost their key

1. Find their email in the sales sheet.
2. Send the same key back. Do **not** mint a new one — that leaves an
   unrevokable extra key in circulation.
3. If they are not in the sheet, ask for the payment receipt or the transaction
   ID before issuing anything.

## Someone wants a refund

1. Refund it. Within 14 days, no questions — that is the published policy and
   arguing costs more than the money.
2. Revoke the key: add it to the `REVOKED_LICENSES` env var on your host as a
   comma-separated list, then redeploy.
   ```
   REVOKED_LICENSES=AYK-P0-ABCD1234-EFGH567890,AYK-S0-...
   ```
3. Note it in the sales sheet.
4. Ask one question, kindly: *"What didn't work?"* Their answer is worth more
   than the refund cost you.

## Someone is sharing their key publicly

1. Revoke it (above).
2. Email them once: the key was shared, it has been revoked, and you will issue
   a replacement if they confirm they will not share it again.
3. If it happens twice, no replacement. Keep the money — that is what the terms
   say.

---

## Something is broken

### "The site is down"
1. `curl https://YOUR-DOMAIN/api/health` — it reports whether the key and
   licence secret are set, plus today's usage.
2. Check your host's status page.
3. Check the Anthropic Console for a suspended key or exhausted spend limit.

### "It says Ayoka has hit its daily capacity"
Your `DAILY_OUTPUT_TOKEN_BUDGET` is spent. Either:
- **Real demand** — raise it, and raise the Console spend limit in step with it.
- **Abuse** — check `/api/health` for a single identity with a large run count,
  and lower `FREE_RUNS_PER_DAY_PER_IP`.

### "My licence key doesn't work"
| They see | Cause | Fix |
|---|---|---|
| "does not look right" | Typo or partial paste | Ask for a screenshot |
| "is not valid" | Wrong `LICENSE_SECRET`, or a forged key | Verify: `node scripts/mint-license.mjs --check AYK-...` |
| "has expired" | Time-limited key | Mint a new one if they are entitled |
| "has been revoked" | On the denylist | Check the sheet — refunded or shared? |

> **The failure that breaks every key at once:** changing `LICENSE_SECRET`
> after you have sold licences. Every key you have ever issued stops working.
> If you must rotate it, re-mint and re-send a key to every customer in the
> sheet first.

### "The output is bad"
Ask for the exact input they used. Reproduce it locally. If it is genuinely
bad, it is a prompt problem — fix `lib/packs.js` or `lib/prompts.js`, run
`npm run smoke`, redeploy. Then email the person who reported it and tell them
it is fixed. That customer becomes an advocate.

---

## The money side

**Keep separate:** business income and personal money, from the first naira.
Even a separate bank app account. It makes tax season survivable and it makes
you take the business seriously.

**Set aside for tax from every sale.** The rate depends on your country and
your registration status. **Ask a local accountant — do not guess, and do not
take a rate from the internet.** Setting aside 20% and being told later you
owed 10% is a good outcome. The reverse is not.

**Registration.** You can sell as an individual through Gumroad or Paystack to
start. As revenue grows, registering a business (CAC in Nigeria) gets you a
business bank account, better payment rates, and protection. Ask an accountant
when monthly revenue passes roughly ₦200,000.

**Keep:** every payment receipt, every payout statement, and your Anthropic
invoices (a deductible business expense in most places).

---

## What to do when you get overwhelmed

You are studying full time. This will happen. The order in which things get
dropped:

1. **Never drop:** delivering keys, refunds, and replying to paying customers.
2. **Drop first:** new features. Nobody has ever churned over a missing feature
   they did not know existed.
3. **Drop second:** posting. A quiet fortnight costs you growth, not the business.
4. **Drop third:** everything else.

Put a line in the site footer if you need to: *"Support replies take 2–3 days
during exams."* Customers are people. They understand. What they do not forgive
is silence.
