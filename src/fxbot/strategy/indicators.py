"""Streaming technical indicators.

Each indicator is a small stateful object fed one value at a time.  That shape
is deliberate: the same instance drives both the backtest and the live loop, so
a strategy cannot accidentally behave differently in the two.  A vectorised
implementation over a whole array is faster, but it makes look-ahead bias easy
to write and hard to see.

``value`` is ``None`` until enough data has arrived, so callers must check for
readiness rather than trusting a zero.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field


class Indicator:
    """Base class: feed with :meth:`update`, read :attr:`value`."""

    value: float | None = None

    @property
    def ready(self) -> bool:
        return self.value is not None

    def update(self, x: float) -> float | None:  # pragma: no cover - interface
        raise NotImplementedError


@dataclass
class SMA(Indicator):
    period: int
    _window: deque[float] = field(default_factory=deque, repr=False)
    _total: float = field(default=0.0, repr=False)
    value: float | None = None

    def __post_init__(self) -> None:
        if self.period < 1:
            raise ValueError("period must be >= 1")

    def update(self, x: float) -> float | None:
        self._window.append(x)
        self._total += x
        if len(self._window) > self.period:
            self._total -= self._window.popleft()
        if len(self._window) == self.period:
            self.value = self._total / self.period
        return self.value


@dataclass
class EMA(Indicator):
    """Exponential moving average, seeded with an SMA of the first ``period``.

    Seeding matters: starting the recursion from the first price makes the
    early values track that one print, and a crossover strategy will trade the
    artefact.
    """

    period: int
    value: float | None = None
    _seed: list[float] = field(default_factory=list, repr=False)

    def __post_init__(self) -> None:
        if self.period < 1:
            raise ValueError("period must be >= 1")
        self.alpha = 2.0 / (self.period + 1.0)

    def update(self, x: float) -> float | None:
        if self.value is None:
            self._seed.append(x)
            if len(self._seed) == self.period:
                self.value = sum(self._seed) / self.period
            return self.value
        self.value += self.alpha * (x - self.value)
        return self.value


@dataclass
class ATR(Indicator):
    """Average true range via Wilder's smoothing, in price units.

    True range includes the gap from the previous close, which is what makes it
    the right stop basis in FX: the Sunday open regularly gaps past anything
    derived from the intraday high-low alone.
    """

    period: int = 14
    value: float | None = None
    _prev_close: float | None = field(default=None, repr=False)
    _seed: list[float] = field(default_factory=list, repr=False)

    def update_bar(self, high: float, low: float, close: float) -> float | None:
        if self._prev_close is None:
            true_range = high - low
        else:
            true_range = max(
                high - low,
                abs(high - self._prev_close),
                abs(low - self._prev_close),
            )
        self._prev_close = close

        if self.value is None:
            self._seed.append(true_range)
            if len(self._seed) == self.period:
                self.value = sum(self._seed) / self.period
        else:
            # Wilder: equivalent to an EMA with alpha = 1/period.
            self.value = (self.value * (self.period - 1) + true_range) / self.period
        return self.value

    def update(self, x: float) -> float | None:
        """Degenerate close-only update, for completeness."""
        return self.update_bar(x, x, x)


@dataclass
class RSI(Indicator):
    period: int = 14
    value: float | None = None
    _prev: float | None = field(default=None, repr=False)
    _avg_gain: float | None = field(default=None, repr=False)
    _avg_loss: float | None = field(default=None, repr=False)
    _gains: list[float] = field(default_factory=list, repr=False)
    _losses: list[float] = field(default_factory=list, repr=False)

    def update(self, x: float) -> float | None:
        if self._prev is None:
            self._prev = x
            return None
        change = x - self._prev
        self._prev = x
        gain, loss = max(change, 0.0), max(-change, 0.0)

        if self._avg_gain is None:
            self._gains.append(gain)
            self._losses.append(loss)
            if len(self._gains) < self.period:
                return None
            self._avg_gain = sum(self._gains) / self.period
            self._avg_loss = sum(self._losses) / self.period
        else:
            self._avg_gain = (self._avg_gain * (self.period - 1) + gain) / self.period
            self._avg_loss = (self._avg_loss * (self.period - 1) + loss) / self.period

        if self._avg_loss == 0:
            self.value = 100.0
        else:
            rs = self._avg_gain / self._avg_loss
            self.value = 100.0 - (100.0 / (1.0 + rs))
        return self.value


@dataclass
class Donchian:
    """Rolling high/low channel over the last ``period`` *completed* bars."""

    period: int = 20
    _highs: deque[float] = field(default_factory=deque, repr=False)
    _lows: deque[float] = field(default_factory=deque, repr=False)
    upper: float | None = None
    lower: float | None = None

    @property
    def ready(self) -> bool:
        return self.upper is not None

    @property
    def middle(self) -> float | None:
        if self.upper is None or self.lower is None:
            return None
        return (self.upper + self.lower) / 2.0

    def update_bar(self, high: float, low: float) -> None:
        if len(self._highs) == self.period:
            self.upper = max(self._highs)
            self.lower = min(self._lows)
        self._highs.append(high)
        self._lows.append(low)
        if len(self._highs) > self.period:
            self._highs.popleft()
            self._lows.popleft()
