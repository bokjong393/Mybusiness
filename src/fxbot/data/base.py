"""Candle sources."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

from ..core.types import Candle

#: Granularity -> seconds. Mirrors OANDA's naming.
GRANULARITIES: dict[str, int] = {
    "M1": 60, "M5": 300, "M15": 900, "M30": 1800,
    "H1": 3600, "H4": 14400, "D": 86400, "W": 604800,
}


def granularity_seconds(granularity: str) -> int:
    try:
        return GRANULARITIES[granularity.upper()]
    except KeyError:
        raise ValueError(
            f"unknown granularity {granularity!r}; known: {sorted(GRANULARITIES)}"
        ) from None


class CandleSource(ABC):
    @abstractmethod
    def fetch(
        self,
        symbol: str,
        granularity: str,
        start: datetime | None = None,
        end: datetime | None = None,
        count: int | None = None,
    ) -> list[Candle]:
        """Return completed candles in ascending time order."""


def validate(candles: list[Candle], symbol: str = "") -> list[str]:
    """Sanity-check a candle series, returning human-readable problems.

    Bad history is the most common cause of a backtest that cannot be
    reproduced live, and it is usually invisible until someone looks.
    """
    problems: list[str] = []
    if not candles:
        return [f"{symbol}: no candles"]

    for i, c in enumerate(candles):
        if c.high < c.low:
            problems.append(f"bar {i} @ {c.time}: high {c.high} below low {c.low}")
        if not (c.low <= c.open <= c.high):
            problems.append(f"bar {i} @ {c.time}: open {c.open} outside [{c.low}, {c.high}]")
        if not (c.low <= c.close <= c.high):
            problems.append(f"bar {i} @ {c.time}: close {c.close} outside [{c.low}, {c.high}]")
        if c.time.tzinfo is None:
            problems.append(f"bar {i}: naive timestamp {c.time}")

    out_of_order = [
        i for i, (a, b) in enumerate(zip(candles, candles[1:], strict=False))
        if b.time <= a.time
    ]
    if out_of_order:
        problems.append(
            f"{len(out_of_order)} non-increasing timestamp(s), first at bar {out_of_order[0]}"
        )
    return problems
