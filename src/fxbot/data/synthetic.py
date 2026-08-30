"""Synthetic FX candles, for tests and for trying the bot without an API key.

The generator is a random walk with a configurable drift and volatility, run
only during market hours so that weekend gaps appear where they really do.
It produces *plausible* data, not realistic data: no fat tails, no news, no
volatility clustering.  Use it to exercise the machinery, never to judge a
strategy.
"""

from __future__ import annotations

import random
from datetime import UTC, datetime, timedelta

from ..core.clock import is_market_open, next_market_open
from ..core.instrument import Instrument
from ..core.types import Candle
from .base import granularity_seconds

#: AR(1) persistence of the momentum term.
MOMENTUM_DECAY = 0.90


def generate(
    symbol: str = "EUR_USD",
    granularity: str = "H1",
    bars: int = 2000,
    start: datetime | None = None,
    start_price: float = 1.0850,
    annual_volatility: float = 0.08,
    annual_drift: float = 0.0,
    trend_strength: float = 0.0,
    seed: int | None = 42,
) -> list[Candle]:
    """Generate ``bars`` candles of plausible FX price action.

    ``trend_strength`` adds autocorrelated momentum, which gives trend
    strategies something to find; at 0 the series is a pure random walk.  Keep
    it small -- because the momentum term is persistent, its contribution to
    cumulative variance is amplified by roughly ``(1+rho)/(1-rho)``, so values
    much above ~0.1 produce moves no currency pair has ever made.
    """
    rng = random.Random(seed)
    instrument = Instrument.parse(symbol)
    step = timedelta(seconds=granularity_seconds(granularity))

    when = start or datetime(2024, 1, 1, tzinfo=UTC)
    if not is_market_open(when):
        when = next_market_open(when)

    # Per-bar volatility from an annualised figure, over FX trading hours.
    bars_per_year = 6240.0 * 3600.0 / step.total_seconds()
    sigma = annual_volatility / (bars_per_year ** 0.5)
    mu = annual_drift / bars_per_year

    price = start_price
    momentum = 0.0
    out: list[Candle] = []

    while len(out) < bars:
        if not is_market_open(when):
            when = next_market_open(when)
            continue

        momentum = momentum * MOMENTUM_DECAY + rng.gauss(0.0, 1.0) * trend_strength
        shock = rng.gauss(mu, sigma) + momentum * sigma
        open_ = price
        close = open_ * (1.0 + shock)
        # Wick size scales with the bar's own move, as real bars do.
        wick = abs(close - open_) * rng.uniform(0.3, 1.5) + open_ * sigma * 0.3
        high = max(open_, close) + wick * rng.uniform(0.0, 1.0)
        low = min(open_, close) - wick * rng.uniform(0.0, 1.0)

        out.append(
            Candle(
                time=when,
                open=instrument.round_price(open_),
                high=instrument.round_price(high),
                low=instrument.round_price(low),
                close=instrument.round_price(close),
                volume=float(rng.randint(500, 5000)),
            )
        )
        price = close
        when = when + step

    return out
