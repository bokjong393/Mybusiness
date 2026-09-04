# The 30-day launch

> Written for someone with a full university course load. Every task fits in
> **60–90 minutes**, most in far less. Weekends carry the heavy work; weekdays
> are 20 minutes of posting and replying.
>
> **The goal of day 30 is not ₦1,000,000. It is one stranger paying you money.**
> Everything else is repetition of that one event.

---

## Before day 1 — the two things that block everything

**A. Set a hard spend limit in the Anthropic Console.** Console → Billing →
Limits. Set it to an amount you could lose without it hurting — **$20 for
month one.** This is the only protection that cannot be defeated by a bug in
your own code. Do not skip it. Do not do it "later".

**B. Decide your public name.** You are selling to people who buy from people.
Post as Peace, a 21-year-old economics student in Nigeria building a tool for
freelancers like her. That story is an asset no competitor can copy — and it is
true, which means you never have to maintain a fiction.

---

## Week 1 — get it live and ugly

Perfect is the enemy of shipped. This week ends with a live URL you can send to
a stranger.

| Day | Task | Time |
|---|---|---|
| **1** | Anthropic key + Console spend limit. `cp .env.example .env`, fill it in, `node scripts/mint-license.mjs --new-secret`. Run `npm start`, open `localhost:3000`, use it. | 60 min |
| **2** | `npm run smoke` — one real call. Read the output as a *customer*, not a builder. If it is not good, fix `lib/prompts.js` now; everything downstream depends on this. | 45 min |
| **3** | Deploy. Vercel free tier: push to GitHub, import, add the env vars, done. Buy a domain (~$12) — `ayoka.app`, `useayoka.com`, `ayoka.africa`. | 90 min |
| **4** | Fill in every `[BRACKET]` in the three legal pages. Set the real contact email. Replace `hello@example.com` everywhere (`grep -rn "example.com" public/`). | 60 min |
| **5** | Gumroad + Paystack products. Put the real checkout URLs into `PRICING` in `public/index.html`. **Buy your own product with your own card.** Fix whatever breaks. | 90 min |
| **6** | Use Ayoka on your own life. Write a real proposal for real work. This is where you find the embarrassing bugs. | 60 min |
| **7** | Give 10 free Pro keys to 10 freelancers you can actually reach. Ask one question: **"Did you send it, or did you rewrite it?"** | 60 min |

**End of week 1:** live site, working payment, ten people using it.
**Sales so far: 0.** That is correct.

---

## Week 2 — find out if anyone cares

Do not build. Post.

| Day | Task | Time |
|---|---|---|
| **8** | Write down every objection from the 10 testers. Fix only the ones mentioned twice or more. | 60 min |
| **9** | Post #1 — the build-in-public opener. Copy in [`03-marketing-copy-bank.md`](03-marketing-copy-bank.md). X/Twitter + LinkedIn. | 30 min |
| **10** | Post #2 — the value thread. Give away a full Price Defence output for free, no link. Prove it works before asking for money. | 45 min |
| **11** | Join 5 communities where your buyer already is (see the list below). Introduce yourself. **Post nothing promotional.** Answer two questions. | 45 min |
| **12** | Post #3 — the before/after. A real bad proposal beside the Ayoka rewrite. This one converts best. | 45 min |
| **13** | DM 20 freelancers whose work you genuinely like. Not a pitch — a question: *"What's the hardest part of getting a client to say yes?"* | 60 min |
| **14** | Read every reply. Write the three most common answers on paper. That is your marketing copy for the rest of the year. | 45 min |

**End of week 2:** 3 posts out, 20 conversations, and you know what your market
says its problem is — in its own words.

---

## Week 3 — open the francophone door

This is your unfair advantage. Nobody else in this market can do this week.

| Day | Task | Time |
|---|---|---|
| **15** | Switch the app to French and run all 8 generators. Read them as a francophone freelancer. Fix anything stiff in `lib/prompts.js`. | 90 min |
| **16** | Post #4 — in French, in 3 francophone freelance groups (Benin, Côte d'Ivoire, Senegal). Announce the launch offer. | 45 min |
| **17** | Post #5 — the founding-customer offer, English. First 50 get Pro at Starter price. Give a real deadline. | 30 min |
| **18** | Reply to everything. Every comment, every DM, same day. In week three, response speed *is* the marketing. | 45 min |
| **19** | Post #6 — the story post. Why you built it. 21, economics student, watched people undercharge. This is the one that gets shared. | 45 min |
| **20** | First customers should be landing. Deliver keys within an hour. Ask each: *"What made you decide to buy?"* | 45 min |
| **21** | **Rest.** Actually rest. A business that survives your degree beats one that does not. | — |

**End of week 3:** first sales. Realistically **2–8**. If it is zero, that is
data, not failure — go to the troubleshooting table below.

---

## Week 4 — do more of whatever worked

| Day | Task | Time |
|---|---|---|
| **22** | Look at your numbers. Which post drove the most visits? Which generator gets used most? | 45 min |
| **23** | Write post #7 as a copy of your best-performing post, different example. Repeating what worked is the whole job. | 45 min |
| **24** | Ask every paying customer for one sentence you can quote. Put the first three on the landing page. | 60 min |
| **25** | Fix the single most common complaint. Only one. | 60 min |
| **26** | Post #8 — the results post. "Ayoka is 3 weeks old. X people used it, Y bought it, here's what I learned." Transparency sells. | 45 min |
| **27** | Close the founding offer. Raise the price. Announce it. Do not extend. | 30 min |
| **28** | Reach out to one person with an audience of freelancers. Offer a free Pro key and an honest opinion. No affiliate ask yet. | 45 min |
| **29** | Write your month-two plan on one page. Only what worked in month one. | 60 min |
| **30** | Add up what you earned. Pay yourself something, however small. **You built and launched a business at 21.** | — |

---

## Where your buyers actually are

Do not spread across all of these. Pick **three** and be genuinely present.

**Anglophone**
- X/Twitter — Nigerian tech and freelance community. Highest leverage per hour.
- LinkedIn — where freelancers pretend to be professional. Long posts do well.
- Reddit — r/freelance, r/Upwork, r/forhire. Extremely allergic to promotion; be useful first.
- Facebook groups — "Freelancers in Nigeria", "Nigerian Creatives". Underrated: this is where the buyers who are not on X live.
- WhatsApp communities — hardest to enter, highest conversion. One warm intro is worth 500 impressions.

**Francophone (less crowded — go here)**
- Facebook — "Freelances Bénin", "Freelance Côte d'Ivoire", "Entrepreneurs Sénégal"
- LinkedIn francophone West Africa
- Local Discord and Telegram dev/design groups

**A rule that will save you:** in every community, give ten times before you ask
once. Post a full Ayoka output for free, unbranded, that solves someone's actual
posted problem. People will ask what you used. *That* is your opening.

---

## When it does not work

| What you see | What it means | What to change |
|---|---|---|
| Traffic, no sign-ups | The landing page is not landing | Rewrite the headline around the exact words from your day-14 notes |
| Sign-ups, no purchases | Free tier too generous, or price wrong | Drop free to 2/day *or* cut Starter to $12 — **change one, wait a week, measure** |
| People buy, then go quiet | The output is not good enough | Go back to `lib/prompts.js`. This is a product problem, not a marketing one |
| Nothing at all, anywhere | You are posting where your buyer is not | Change communities, not the product |
| Francophone posts beat English 2:1 | **Your real market is francophone** | Go all in. Nobody else is there |

---

## The three ways this actually dies

1. **You keep building instead of selling.** Adding a ninth generator feels like
   progress and is not. If you have not sold anything, do not open the code.
2. **You launch once and stop.** One post is not a launch. The eighth post is
   where it usually starts working. Almost everyone quits at four.
3. **You burn out in exam season.** Put your degree first. Ayoka does not expire.
   A quiet month is survivable; dropping a semester is not.
