# Village People — Meeting Minutes

### *They held a meeting about your life*

The alarm that didn't ring. The transfer still pending. The message left on read.
None of that was coincidence — **there were minutes taken.**

Describe your bad week and receive the official minutes of the extraordinary
meeting where your village people sat down, deliberated, and passed resolutions
about your life. Attendance list, motions moved and seconded, resolutions
carried, Any Other Business, two signatures and a CONFIDENTIAL stamp.

> **This is satire.** "Village people" is a running Nigerian joke — the imaginary
> culprits behind inexplicable bad luck. This toy takes the joke literally and
> files the paperwork. The committee does not exist and your auntie is probably innocent.

## How it works

You type what went wrong. The app splits it into separate grievances, routes
each to the responsible department — the *Directorate of Academic Sabotage*, the
*Bureau of Vanishing Funds*, the *Unit for Network Failure & Battery Depletion* —
and files the minutes.

```
   "my alarm didn't ring and my transfer is still pending"
                        │
                        ▼
        ┌───────────────────────────────┐
        │ AI (optional): split + tag     │  ← categories only
        └───────────────┬───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │ engine.js: the whole document  │  ← all structure
        │ seeded, deterministic          │
        └───────────────┬───────────────┘
                        ▼
              Official minutes, stamped
```

**The AI never writes the minutes.** It only sorts your sentence into
grievances and tags each with a department. Everything else — the attendance
list, who moved and who seconded, the numbered resolutions, the verdicts — is
generated in [`engine.js`](assets/js/engine.js).

That split is the whole design. The comedy lives in the bureaucratic *form*:
numbered items, movers and seconders, "Carried, with one abstention". A model
left to freestyle abandons that form by the second paragraph and the joke dies.
So the model gets the one job it's actually good at, and the engine keeps the
document straight-faced.

**It works with no API key at all.** A built-in keyword classifier routes
complaints to departments, so a visitor with no key, no network and no patience
still gets a funny document.

## Design notes

- **Seeded, not random.** The same bad week always produces the same minutes.
  A document that reshuffled its attendees on every re-render wouldn't feel like
  a record of anything.
- **Attendees are roles, never names** — *The Aunty Who Asks About Marriage*,
  *The Cousin Nobody Invited*, *Officer-in-Charge of Bad Timing*. This is
  enforced by a unit test. It's what keeps the satire pointed at an invented
  committee rather than at somebody's actual relative.
- **The Chairman always presides and signs.** Also a test — an early version
  drew the Chairman into the room but seated someone else in the presiding
  chair, contradicting the signature block.
- **Your own words are quoted.** Each item files your complaint verbatim as
  "Complaint on file", which is funnier than any paraphrase and needs no rewriting.
- **The page opens on a finished document.** A joke generator that greets you
  with an empty form has to be worked for before it's funny, and most people
  won't do the work.

## Running it

```bash
npm start        # from the repo root, then open /village-people/
npm test         # 14 engine tests
```

No build step, no dependencies, no framework.

## Tech

Vanilla HTML/CSS/JS. The document is drawn natively to `<canvas>` at 2× — the
exported image is the product, so it can't depend on a CDN rasteriser that might
fail on a slow connection mid-demo. Optional AI via Claude (`claude-opus-5`) or
Gemini, bring-your-own-key, stored only in your browser.

## License

[MIT](../LICENSE) · Built by Peace Sossa for the MIVA May Cohort 25 AI Build Challenge.
