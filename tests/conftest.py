from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from fxbot.core.instrument import Instrument
from fxbot.core.types import Candle
from fxbot.execution.costs import CostModel
from fxbot.risk.sizing import ConversionRates

NY = ZoneInfo("America/New_York")
UTC = UTC


def ny(year, month, day, hour, minute=0):
    """A New York-local timestamp, which is how the FX day is defined."""
    return datetime(year, month, day, hour, minute, tzinfo=NY)


@pytest.fixture
def eurusd():
    return Instrument.parse("EUR_USD")


@pytest.fixture
def usdjpy():
    return Instrument.parse("USD_JPY")


@pytest.fixture
def rates():
    r = ConversionRates()
    r.update_many({"EUR_USD": 1.0850, "USD_JPY": 150.00, "GBP_USD": 1.2700})
    return r


@pytest.fixture
def zero_costs():
    return CostModel(spread_pips={}, fallback_spread_pips=0.0, slippage_pips=0.0,
                     illiquid_multiplier=1.0)


def bars(prices, start=None, step_hours=1, spread=0.0, highs=None, lows=None):
    """Build a candle series from a list of closes, during London hours."""
    start = start or datetime(2024, 1, 2, 13, 0, tzinfo=UTC)  # 08:00 NY, liquid
    out = []
    for i, close in enumerate(prices):
        open_ = prices[i - 1] if i else close
        hi = highs[i] if highs else max(open_, close) + spread
        lo = lows[i] if lows else min(open_, close) - spread
        out.append(Candle(
            time=start + timedelta(hours=step_hours * i),
            open=open_, high=hi, low=lo, close=close, volume=1000.0,
        ))
    return out
