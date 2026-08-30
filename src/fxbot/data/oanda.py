"""Candles from OANDA v20.

Incomplete candles are dropped by default.  The bar currently forming has a
close that keeps changing, and a strategy that sees it will appear to predict
moves it merely watched happen -- the most common way a live loop behaves
differently from its own backtest.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from ..core.types import Candle
from ..oanda_api import OandaClient, parse_time
from .base import CandleSource, granularity_seconds

MAX_PER_REQUEST = 5000


def to_candle(raw: dict) -> Candle:
    """Convert one OANDA candle dictionary into a :class:`Candle`."""
    mid = raw.get("mid") or raw.get("bid") or raw.get("ask")
    if mid is None:
        raise ValueError(f"candle has no price data: {raw}")

    bid_close = float(raw["bid"]["c"]) if "bid" in raw else None
    ask_close = float(raw["ask"]["c"]) if "ask" in raw else None
    return Candle(
        time=parse_time(raw["time"]),
        open=float(mid["o"]),
        high=float(mid["h"]),
        low=float(mid["l"]),
        close=float(mid["c"]),
        volume=float(raw.get("volume", 0)),
        complete=bool(raw.get("complete", True)),
        bid_close=bid_close,
        ask_close=ask_close,
    )


class OandaSource(CandleSource):
    """Fetch historical candles, paginating over long ranges."""

    def __init__(self, client: OandaClient, include_incomplete: bool = False) -> None:
        self.client = client
        self.include_incomplete = include_incomplete

    def fetch(
        self,
        symbol: str,
        granularity: str = "H1",
        start: datetime | None = None,
        end: datetime | None = None,
        count: int | None = None,
    ) -> list[Candle]:
        symbol = symbol.replace("/", "_").upper()

        if start is None:
            raw = self.client.candles(symbol, granularity, count=count or 500)
            return self._clean(raw)

        end = end or datetime.now(UTC)
        step = timedelta(seconds=granularity_seconds(granularity))
        out: list[Candle] = []
        cursor = start
        seen: set[datetime] = set()

        while cursor < end:
            window_end = min(cursor + step * MAX_PER_REQUEST, end)
            batch = self._clean(
                self.client.candles(symbol, granularity, start=cursor, end=window_end)
            )
            fresh = [c for c in batch if c.time not in seen]
            if not fresh:
                # No progress: either a data hole or the end of history. Jump the
                # window forward so a quiet stretch cannot spin forever.
                cursor = window_end
                if cursor >= end:
                    break
                continue
            out.extend(fresh)
            seen.update(c.time for c in fresh)
            cursor = max(fresh[-1].time + step, cursor + step)
            if count and len(out) >= count:
                break

        out.sort(key=lambda c: c.time)
        return out[-count:] if count else out

    def _clean(self, raw: list[dict]) -> list[Candle]:
        candles = [to_candle(r) for r in raw]
        if not self.include_incomplete:
            candles = [c for c in candles if c.complete]
        return candles

    def latest_complete(self, symbol: str, granularity: str, lookback: int = 200) -> list[Candle]:
        """The most recent ``lookback`` completed candles -- the live loop's feed."""
        return self.fetch(symbol, granularity, count=lookback)
