# fxbot

A spot FX trading bot: event-driven backtesting, paper trading against a live
feed, and real-money execution that is switched off by default and takes three
deliberate steps to enable.

Built around OANDA's v20 API. The core has no third-party runtime dependencies
— for something that runs unattended against money, the standard library is a
smaller attack surface and a shorter list of things that can break at 3am.

---

## Read this first

**This bot ships no edge.** The included strategies — an EMA crossover, a
Donchian breakout, and a session-windowed liquidity sweep — are demonstrations
of the framework. The first two are textbook and whipsaw in ranging markets;
the third encodes a methodology taught publicly on YouTube and has not been
validated on real data by anyone here. None of them is a reason to expect
profit. What the project actually gives you is the surrounding
machinery: correct pip arithmetic, honest cost modelling, position sizing that
respects a risk budget, and a backtest that will not lie to you about
look-ahead. Bring your own hypothesis; use this to test it properly.

**Most retail FX accounts lose money.** Brokers publish the figure and it
generally sits between 65% and 80%. Automation does not change that — it just
removes the hesitation that sometimes saves a discretionary trader. Paper trade
for months before you consider anything else, and never risk money you need.

---

## Quick start

```bash
git clone https://github.com/bokjong393/Mybusiness.git && cd Mybusiness
pip install -e ".[dev]"

fxbot demo                 # synthetic backtest, no credentials required
fxbot strategies           # what's available and with which parameters
fxbot plan --stop 5        # what a stop/target plan must achieve to break even
pytest                     # 319 tests
```

`demo` generates plausible-but-fake candles and runs a full backtest through
them. It proves the machinery works. It proves nothing about any strategy — the
synthetic series has no news, no fat tails, and whatever trend the generator
was asked for.

### With real data

Get a free OANDA practice account and a personal API token, then:

```bash
cp .env.example .env        # fill in OANDA_API_TOKEN and OANDA_ACCOUNT_ID
set -a && source .env && set +a

fxbot fetch --symbol EUR_USD --granularity H1 --years 3
fxbot backtest --csv data/EUR_USD_H1.csv --strategy ema_crossover --trades
fxbot paper --config config/default.yaml --dry-run   # log intent, send nothing
fxbot paper --config config/default.yaml             # practice account, real feed
```

---

## Check the arithmetic before the chart

`fxbot plan` answers the question a backtest cannot: given a stop and a
scale-out ladder, **how often must each outcome occur for this to break even?**
It charges the spread properly, which matters enormously at tight stops.

```bash
fxbot plan --stop 5 --scale 3:0.5 --target 10
```

Three results worth knowing before adopting any tight-stop plan:

| | |
|---|---|
| **The spread is a tax on your risk** | A 5-pip stop with a 1.2-pip round trip spends 24% of its risk on cost before the trade does anything. At 3 pips it is 40%. |
| **Tight stops force large positions** | 1% risk on a 5-pip stop is 2.0 standard lots — 43% of a $10k account as margin at 50:1, and 72% at 30:1. At 3 pips it needs 120% and the broker rejects it. |
| **Scale-out plans make a promise** | 50% at 3R with the rest to 10R needs price to reach 3R on ~50% of trades to break even, if the 10R tail never pays. |

None of that depends on a backtest, a strategy, or an opinion. It is arithmetic,
and it disqualifies a lot of plans in about ten seconds.

---

## Find out which rule is actually deciding

Checklist systems are taught as an ordered sequence, and encoding one as nested
`if` statements throws away the most useful diagnostic there is: **where in the
sequence setups die.** `strategy/checklist.py` records, for every step, how many
evaluations reached it and how many passed:

```
  step                         reached    passed   rejected
  ---------------------------------------------------------
  window · Session window      119,600     9,701      91.9%
  budget · Trade budget          9,701     9,385       3.3%
  warmup · Timeframes ready      9,385     9,385       0.0%
  bias · Structure               9,385     9,385       0.0%
  align · Alignment              9,385     4,798      48.9%
  sweep · Liquidity sweep        4,798     2,555      46.7%
  zone · Location                2,555        52      98.0%
  risk · Risk band                  52        14      73.1%
```

Read it as a funnel. A step passing everything is switched off; a step killing
99% is the whole game. This one immediately exposed a bug — `Location` was
rejecting setups where price was trading *inside* a zone, which is the case the
rule exists for. Tightening any other step would have changed nothing.

Steps are declared as data (`ENTRY_STEPS`), so a differently-named framework
maps onto them by editing one tuple and the funnel then reads in its own words.

---

## Why FX needs its own bot

Most "trading bot" scaffolding is written for equities or crypto and quietly
breaks on currencies. The specifics this project gets right:

**A pip is not a fixed value.** It is 0.0001 for most pairs and 0.01 for
JPY-quoted ones — plus HUF, KRW and a few others that break a naive `if
"JPY" in symbol` check. `core/instrument.py` owns this and nothing else
re-derives it.

**A pip is not worth $10.** That figure is true for a standard lot of a
USD-quoted pair and nothing else. A pip of USD/JPY at 150.00 is worth
1,000 JPY, which is about $6.67 — sizing it as $10 puts on 50% more risk than
intended. `risk/sizing.py` converts through the quote currency every time, and
triangulates through USD/EUR/GBP when there is no direct pair.

**The week has a shape.** FX opens Sunday 17:00 New York and closes Friday
17:00 New York. Positions held over the close reopen on Sunday wherever the
market feels like — straight through your stop. The simulator models that gap
explicitly.

**Carry is charged at rollover, and Wednesday is triple.** Spot settles T+2, so
the Wednesday 17:00 rollover moves the value date across the weekend and
charges three days' financing. On a multi-week carry position this is not a
rounding error.

**Liquidity is not constant.** The London/New York overlap has the tightest
spreads of the day; the late-New-York-to-Tokyo lull has the widest. Both
strategies filter entries by session, and the backtest widens the spread
outside liquid hours.

---

## How a trade actually happens

```
Candle ──▶ Strategy ──▶ Signal ──▶ RiskManager ──▶ Order ──▶ Broker ──▶ Fill
           (indicators)  (pips)     (sizing +       (units)   (sim or
                                     limits)                   OANDA)
```

The separation is the point:

- **Strategies decide direction and stop distance, in pips.** They never see
  the account balance and never choose a size. Changing risk policy therefore
  never means editing a strategy.
- **The risk layer turns pips into units** and holds a veto. Every order passes
  `RiskManager.evaluate` before a broker sees it.
- **Brokers share one interface.** `SimulatedBroker` and `OandaBroker`
  implement the same methods, so moving from backtest to paper to live is a
  configuration change, not a code path.

---

## The backtest will not flatter you

Four choices, each of which makes results worse and reality closer:

| | |
|---|---|
| **No look-ahead** | A signal from a closed bar executes at the **next** bar's open. The engine enforces the ordering; a strategy cannot trade a price it has just seen. There is a test that runs a deliberately clairvoyant strategy to prove the loophole is shut. |
| **Gaps beat stops** | If a bar opens through your stop, you fill at the open, not the stop. A 20-pip stop can and does cost 100 pips. |
| **Stop before target** | When one bar's range covers both levels, the simulator assumes the stop hit first. Without tick data the order is unknowable, so it resolves against you. |
| **Costs are charged** | Entries cross the spread, which widens outside London/New York. Slippage is applied. Swap accrues at every rollover crossed. |
| **Higher timeframes lag** | An H1 bar is only visible to a strategy once the following bar opens. On a finished chart the 08:00–09:00 bar is drawn in full; at 08:05 it does not exist yet. |

Cost assumptions live in `config/default.yaml` and default to typical retail
spreads, not institutional ones. If your broker is worse, raise them — a
strategy whose edge disappears under a 1.5-pip spread was never viable.

Reported metrics: total return, CAGR, max drawdown and its duration, Sharpe,
Sortino, Calmar, profit factor, expectancy in currency, pips **and R**, win
rate, the **break-even win rate** your payoff ratio implies, max consecutive
losses, and a breakdown of how positions actually exited. Reading the achieved
win rate against the break-even rate is the fastest read on whether an edge
exists at all.
Annualisation uses the FX week (24×5, ≈6,240 hours/year), not the 252-day
equity convention.

---

## Risk controls

Configured in YAML, enforced on every order, and fail-closed:

| Limit | Default | What it does |
|---|---|---|
| `risk_per_trade` | 1% | Size so that being stopped out costs exactly this. Rounds down, never up. |
| `max_daily_loss` | 3% | Halts trading for the day. Resets at the 17:00 NY rollover, so "today" matches your broker statement. |
| `max_open_positions` | 3 | Concurrent position cap. |
| `max_margin_utilisation` | 20% | Ceiling on equity committed as margin. |
| `max_units_per_trade` | 500,000 | Absolute size cap, independent of the risk maths. |
| `min_equity` | 100 | Stop trading below this. |
| `require_stop_loss` | true | Reject any order without a stop. |

There is also a manual kill switch (`RiskManager.halt`), and orders are refused
outright when the market is closed.

---

## Live trading is off, and takes three keys to turn on

`fxbot live` refuses to start unless **all** of the following are true:

1. `environment: live` in the config file
2. `allow_live: true` in the same file
3. `FXBOT_ALLOW_LIVE=I_UNDERSTAND_THE_RISK` in the environment

Then it asks you to type `trade live` at the prompt, and prints a banner on
every start. Credentials are read only from the environment, never from a
config file, so configs stay safe to commit.

This is deliberate friction. A stray edit, a copied config, or a wrong `--env`
flag cannot on its own move real money. `config/live.yaml` ships with halved
risk and a tighter daily loss limit, and the same config runs unchanged on
`fxbot paper` — run it there for weeks first.

`--dry-run` works in both modes: full decision loop, orders logged instead of
sent.

---

## Layout

```
src/fxbot/
├── core/
│   ├── instrument.py   Pip size, precision, unit rounding
│   ├── types.py        Candle, Quote, Signal, Order, Position, Trade
│   ├── clock.py        Market hours, sessions, rollover, triple swap
│   └── resample.py     Multi-timeframe aggregation without look-ahead
├── data/
│   ├── oanda.py        Historical candles, paginated
│   ├── csv_source.py   Vendor CSVs (rejects naive timestamps)
│   └── synthetic.py    Fake candles for tests and demos
├── strategy/
│   ├── indicators.py   Streaming SMA/EMA/ATR/RSI/Donchian
│   ├── structure.py    Swings, BOS/CHOCH, supply-demand zones, sweeps
│   ├── checklist.py    Ordered entry rules with a conversion funnel
│   ├── ema_crossover.py
│   ├── donchian_breakout.py
│   └── session_sweep.py    Multi-timeframe London session model
├── analysis/
│   └── expectancy.py   What a stop and scale-out plan must achieve
├── risk/
│   ├── sizing.py       Pip value, conversion, position size, margin
│   └── manager.py      Limits, daily loss, kill switch
├── execution/
│   ├── simulated.py    Backtest fills: spread, gaps, financing
│   ├── oanda.py        Practice and live, gated
│   └── costs.py        Spread, slippage and swap models
├── backtest/           Event loop and metrics
├── engine/live.py      The live polling loop
└── cli.py
```

### Writing a strategy

```python
from fxbot.core.types import Signal, SignalAction
from fxbot.strategy.base import Strategy
from fxbot.strategy.indicators import ATR, RSI


class MeanReversion(Strategy):
    def __init__(self, period=14, oversold=30):
        super().__init__()
        self.period, self.oversold = period, oversold
        self.warmup = period * 2
        self.reset()

    def reset(self):
        self._rsi = RSI(self.period)
        self._atr = ATR(14)

    def on_bar(self, candle, ctx):
        self._atr.update_bar(candle.high, candle.low, candle.close)
        rsi = self._rsi.update(candle.close)
        if rsi is None or not self._atr.ready:
            return self.hold(ctx, "warming up")

        if ctx.in_position:
            return self.exit(ctx, "mean reverted") if rsi > 50 else self.hold(ctx)

        if rsi < self.oversold and ctx.in_session("london", "new_york"):
            return Signal(
                SignalAction.ENTER_LONG, ctx.instrument.symbol,
                stop_pips=ctx.instrument.price_to_pips(self._atr.value * 2),
                reason=f"RSI {rsi:.0f}",
            )
        return self.hold(ctx)
```

Register it in `strategy/__init__.py` and it is available to the CLI and config
files. Return stop distances in **pips** and let the risk layer size the trade.

---

## Testing

```bash
pytest                        # 319 tests
pytest -k "sizing or clock"   # the FX-specific arithmetic
pytest -k "structure"         # swings, BOS, sweeps
pytest -k "checklist"         # the entry funnel
ruff check src tests
```

The suite concentrates on the things that are expensive to get wrong: pip
valuation across pair types and account currencies, the FX calendar and the
Wednesday triple swap, gap-through-stop behaviour, the risk gate, the live
interlocks, and a dedicated look-ahead test.

---

## Known limitations

- **One position per symbol.** No pyramiding, scaling in, or hedged books.
  Scaling *out* is supported (partial exits in R, optional breakeven move).
- **One instrument per running bot.** Run several processes for a portfolio;
  the daily-loss limit is then per-process, not per-account.
- **Bar-close decisions only.** No tick-level logic, no intrabar stop
  trailing.
- **Polling, not streaming.** OANDA offers a price stream; this uses REST
  polling, which is simpler and sufficient at H1 but adds latency on M1.
- **Swap rates default to zero.** Fill in `swap_pips` from your broker, or any
  carry-holding backtest will flatter itself.
- **No slippage model for news.** A fixed pip assumption; real slippage around
  NFP or a central bank decision is far worse.

## Licence

MIT.
