"""Streaming aggregation of candles into higher timeframes.

Multi-timeframe strategies are where look-ahead bias hides most successfully.
The trap: on a finished chart, the H1 bar covering 08:00-09:00 is drawn in
full, so a rule like "enter when the M1 breaks the H1 bar's low" looks
perfectly reasonable -- while at 08:05 that H1 bar does not exist yet and its
low is still unknown.

This resampler makes that mistake impossible. A higher-timeframe bar is emitted
only once a bar from the *following* bucket has arrived, so anything a strategy
reads from it is genuinely historical.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from ..data.base import granularity_seconds
from .types import Candle


def bucket_start(moment: datetime, seconds: int) -> datetime:
    """Floor a timestamp to the start of its bucket.

    Daily and above are anchored to 17:00 New York, the FX day boundary --
    aligning them to UTC midnight would split every trading day in two.
    """
    if seconds >= 86400:
        from .clock import NY, ROLLOVER_HOUR

        local = moment.astimezone(NY)
        anchored = local.replace(hour=ROLLOVER_HOUR, minute=0, second=0, microsecond=0)
        if local.hour < ROLLOVER_HOUR:
            anchored -= timedelta(days=1)
        return anchored.astimezone(moment.tzinfo)

    epoch = int(moment.timestamp())
    return datetime.fromtimestamp(epoch - (epoch % seconds), tz=moment.tzinfo)


@dataclass
class Resampler:
    """Aggregates lower-timeframe candles into one higher timeframe."""

    granularity: str
    completed: list[Candle] = field(default_factory=list)
    keep: int = 500
    _seconds: int = field(default=0, repr=False)
    _bucket: datetime | None = field(default=None, repr=False)
    _open: float = field(default=0.0, repr=False)
    _high: float = field(default=0.0, repr=False)
    _low: float = field(default=0.0, repr=False)
    _close: float = field(default=0.0, repr=False)
    _volume: float = field(default=0.0, repr=False)

    def __post_init__(self) -> None:
        self._seconds = granularity_seconds(self.granularity)

    def update(self, candle: Candle) -> Candle | None:
        """Feed a lower-timeframe bar; return a higher-timeframe bar if one closed."""
        bucket = bucket_start(candle.time, self._seconds)
        finished: Candle | None = None

        if self._bucket is None:
            self._start(bucket, candle)
        elif bucket != self._bucket:
            finished = self._emit()
            self._start(bucket, candle)
        else:
            self._high = max(self._high, candle.high)
            self._low = min(self._low, candle.low)
            self._close = candle.close
            self._volume += candle.volume
        return finished

    def _start(self, bucket: datetime, candle: Candle) -> None:
        self._bucket = bucket
        self._open, self._high = candle.open, candle.high
        self._low, self._close = candle.low, candle.close
        self._volume = candle.volume

    def _emit(self) -> Candle:
        bar = Candle(
            time=self._bucket, open=self._open, high=self._high,
            low=self._low, close=self._close, volume=self._volume, complete=True,
        )
        self.completed.append(bar)
        if len(self.completed) > self.keep:
            del self.completed[: len(self.completed) - self.keep]
        return bar

    @property
    def last(self) -> Candle | None:
        """The most recently *completed* higher-timeframe bar."""
        return self.completed[-1] if self.completed else None

    @property
    def ready(self) -> bool:
        return bool(self.completed)

    def reset(self) -> None:
        self.completed.clear()
        self._bucket = None
