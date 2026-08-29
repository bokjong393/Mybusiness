# Infrastructure Setup

Everything needed before the first cold email. **Total cost: ~$25.** Budget is $100, so ~$75 remains.

| Item | Cost | Status |
|---|---:|---|
| Grey account (USD rail) | $0 | ✅ Done |
| Grey virtual VISA card | $5 | ☐ |
| Domain | ~$11/yr | ☐ |
| Google Workspace | ~$7/mo | ☐ |
| SPF · DKIM · DMARC records | $0 | ☐ |
| Warm-up started | $0 | ☐ |

---

## 1. Grey virtual card — the unlock

Grey issues virtual VISA cards: **$4 one-time creation + $1 initial funding**. Create one before anything else.

This matters more than it looks. Ordinary naira debit cards are routinely declined for USD subscriptions because of bank international-spending limits and forex controls. The Grey card is what makes the domain and Workspace purchases actually go through. Create a dedicated card for business subscriptions so spend stays separate.

### KYC consistency — the one rule that protects the rail

Grey's onboarding asks for occupation and freelance platform. Answer both truthfully, and keep the answers consistent with everything downstream.

- **Occupation:** describe the income-generating work — `Freelancer` / `Self-employed`, or free-text `Freelance research analyst`. **Not "Student."** Student status is fine and shouldn't be hidden if asked, but "Student" paired with recurring USD inflows from foreign businesses is the exact pattern that triggers compliance review.
- **Freelance platform:** `None` / `Direct clients` / `Other` until an account actually exists. Never name a platform you can't produce statements for.
- **Downstream consistency:** invoices must say "research services," source-of-funds answers must match, and client payment references should be recognisable. Grey will review at higher volume; the story has to already line up.

**A frozen payment rail kills the business outright — it is the one piece of infrastructure with no fallback.** Treat KYC accuracy as a hard operational requirement, not paperwork.

## 2. Domain

**Rules — each one is a deliverability or credibility decision, not taste:**

- **`.com` first.** `.co` acceptable. **Never** `.xyz`, `.info`, `.biz`, `.online` — these TLDs carry spam reputation that follows your mail.
- **No hyphens, no numbers.** Both read as throwaway and are painful to say on a call.
- **Two words maximum**, spellable on first hearing.
- **Not your personal name.** A personal-name domain signals "one student"; you need "small research firm."
- **Avoid `leads`, `sales`, `marketing` in the domain itself** — filters weight these. `signal`, `brief`, `research`, `intel`, `desk` are clean.
- Check it isn't an existing company's trademark.

**Candidates** (take the first available that passes — do not spend more than 20 minutes here):

`earlysignal` · `signalrow` · `signalbrief` · `signaldesk` · `freshsignal` · `signalsheet` · `firstsignal` · `verifiedsignal` · `northsignal` · `signalledger`

**Where:** Porkbun or Namecheap. Both accept virtual cards without trouble.

**One domain, not two.** Standard cold-email advice is to keep a separate sending domain so a burn doesn't cost the brand. That solves a problem you don't have: it's for people blasting hundreds a day. At 20–30 highly personalized sends a day with real value attached, burn risk is low. Buy the second domain at month 3 if volume passes ~50/day.

## 3. Email host — Google Workspace

~$7/month, usually with a 14-day trial. Zoho is ~$1/month and tempting on this budget, but almost every agency owner you're contacting reads mail in Gmail, and Workspace→Gmail placement is materially better. **The $6 difference buys inbox placement; don't save it.**

## 4. Authentication — the step most people skip, and it is now fatal

Since November 2025, non-compliant mail is **rejected outright** rather than sent to spam — Google and Microsoft issue permanent 550 rejections. As of May 2026 enforcement is fully active across all major providers.

**The gap is enormous: compliant senders average 89% inbox placement; non-compliant senders see 22–34% of mail routed to spam.** Even below 5,000/day, Google requires SPF or DKIM and Yahoo requires both.

Add these three DNS records at your registrar:

```
# SPF — TXT record on root domain
v=spf1 include:_spf.google.com ~all

# DKIM — generate the key in Google Admin
# (Apps → Google Workspace → Gmail → Authenticate email)
# then paste it as a TXT record on:  google._domainkey

# DMARC — TXT record on:  _dmarc
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

Start DMARC at `p=none` (monitor only). Move to `p=quarantine` after a month of clean reports. Verify all three resolve before sending a single cold email — a free MX/DMARC checker will confirm in seconds.

Also required regardless of volume: a **real one-click unsubscribe** and a spam-complaint rate under 0.30%.

## 5. Warm-up — starts the day the domain is bought

The domain is time-critical, not value-critical. It generates zero contacts this week; it exists to start this clock.

| Days | Volume/day |
|---|---:|
| 1–3 | 5 |
| 4–7 | 10 |
| 8–14 | 20 |
| 15+ | 30–50 (ceiling) |

Send warm-up mail to real people who will **reply** — friends, classmates, your own other accounts. Replies are the strongest positive signal a young domain can accumulate. A domain that sends 100 on day one lands in spam, and you will misread a deliverability failure as an offer failure.

**Do not exceed 50/day on one domain, ever.** Stop immediately if bounce rate passes 3%.

## Sources

- [Google & Yahoo Email Authentication Requirements 2026 — PowerDMARC](https://powerdmarc.com/google-and-yahoo-email-authentication-requirements/)
- [Bulk Email Sender Rules for Google, Yahoo, Microsoft & Apple 2026 — PowerDMARC](https://powerdmarc.com/bulk-email-sender-requirements/)
- [Google & Yahoo Sender Requirements for Cold Email 2026 — InboxKit](https://www.inboxkit.com/learn/google-yahoo-sender-requirements-2026)
- [How to Get a Virtual Dollar Card in Nigeria — Grey](https://grey.co/blog/virtual-dollar-card-nigeria)
- [How to Pay for Google Workspace in Nigeria — EverTry](https://evertry.co/blog/how-to-pay-for-google-workspace-in-nigeria/)
