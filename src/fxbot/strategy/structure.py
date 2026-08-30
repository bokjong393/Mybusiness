"""Market-structure primitives: swings, break of structure, inducement, zones.

These are the building blocks of the "smart money" / liquidity vocabulary that
the strategies in this package are built from. Everything here is defined
mechanically, because a rule you cannot code is a rule you cannot test, and a
rule you cannot test is an opinion.

The honest constraint that shapes every definition below: **a swing is only
knowable after the fact.** A high is a swing high once ``confirm`` bars have
printed to its right without exceeding it -- so the detector reports it
``confirm`` bars late. Marking swings on a finished chart, where the right-hand
side is already visible, is what makes these concepts look far more precise in
a video than they are in real time. Nothing here is allowed that lag-free.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum

from ..core.types import Candle


class Direction(StrEnum):
    UP = "up"
    DOWN = "down"

    @property
    def opposite(self) -> Direction:
        return Direction.DOWN if self is Direction.UP else Direction.UP


@dataclass(frozen=True)
class Swing:
    """A confirmed swing point."""

    time: datetime
    price: float
    is_high: bool
    bar_index: int

    @property
    def kind(self) -> str:
        return "high" if self.is_high else "low"


@dataclass
class SwingDetector:
    """Fractal swing detection with a fixed confirmation window.

    A bar is a swing high when its high exceeds the highs of ``confirm`` bars
    on each side. Bars are emitted only once the right-hand side has printed,
    so the detector is deliberately ``confirm`` bars behind the market.
    """

    confirm: int = 2
    highs: list[Swing] = field(default_factory=list)
    lows: list[Swing] = field(default_factory=list)
    _window: deque[tuple[int, Candle]] = field(default_factory=deque, repr=False)
    _index: int = field(default=0, repr=False)

    def __post_init__(self) -> None:
        if self.confirm < 1:
            raise ValueError("confirm must be at least 1 bar")
        self._span = self.confirm * 2 + 1

    def update(self, candle: Candle) -> list[Swing]:
        """Feed one bar; return any swings confirmed by it."""
        self._window.append((self._index, candle))
        self._index += 1
        if len(self._window) > self._span:
            self._window.popleft()
        if len(self._window) < self._span:
            return []

        pivot_index, pivot = self._window[self.confirm]
        left = [c for _, c in list(self._window)[: self.confirm]]
        right = [c for _, c in list(self._window)[self.confirm + 1:]]
        found: list[Swing] = []

        # Strict on the left, non-strict on the right: a later equal high does
        # not invalidate the pivot, which matches how equal highs are read as a
        # liquidity pool rather than as two separate swings.
        if all(pivot.high > c.high for c in left) and all(pivot.high >= c.high for c in right):
            swing = Swing(pivot.time, pivot.high, True, pivot_index)
            self.highs.append(swing)
            found.append(swing)
        if all(pivot.low < c.low for c in left) and all(pivot.low <= c.low for c in right):
            swing = Swing(pivot.time, pivot.low, False, pivot_index)
            self.lows.append(swing)
            found.append(swing)
        return found

    @property
    def last_high(self) -> Swing | None:
        return self.highs[-1] if self.highs else None

    @property
    def last_low(self) -> Swing | None:
        return self.lows[-1] if self.lows else None

    def recent_highs(self, n: int = 3) -> list[Swing]:
        return self.highs[-n:]

    def recent_lows(self, n: int = 3) -> list[Swing]:
        return self.lows[-n:]

    def reset(self) -> None:
        self.highs.clear()
        self.lows.clear()
        self._window.clear()
        self._index = 0


@dataclass(frozen=True)
class StructureBreak:
    """A close beyond a prior swing.

    ``is_choch`` marks a break against the prevailing direction -- a change of
    character -- as opposed to a continuation break of structure.
    """

    time: datetime
    direction: Direction
    level: float
    price: float
    is_choch: bool

    @property
    def label(self) -> str:
        return "CHOCH" if self.is_choch else "BOS"


@dataclass
class MarketStructure:
    """Tracks swings and reports breaks of structure.

    A break requires a *close* beyond the level, not a wick through it. Wick
    breaks are how a sweep is distinguished from a genuine break, and that
    distinction is the whole basis of the inducement idea.
    """

    confirm: int = 2
    swings: SwingDetector = field(default_factory=SwingDetector)
    direction: Direction | None = None
    breaks: list[StructureBreak] = field(default_factory=list)
    _broken_high: float | None = field(default=None, repr=False)
    _broken_low: float | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.swings = SwingDetector(confirm=self.confirm)

    def update(self, candle: Candle) -> StructureBreak | None:
        """Feed one bar; return a structure break if this bar caused one."""
        self.swings.update(candle)

        event: StructureBreak | None = None
        high = self.swings.last_high
        low = self.swings.last_low

        if high is not None and candle.close > high.price and self._broken_high != high.price:
            is_choch = self.direction is Direction.DOWN
            event = StructureBreak(candle.time, Direction.UP, high.price, candle.close, is_choch)
            self._broken_high = high.price
            self.direction = Direction.UP
        elif low is not None and candle.close < low.price and self._broken_low != low.price:
            is_choch = self.direction is Direction.UP
            event = StructureBreak(candle.time, Direction.DOWN, low.price, candle.close, is_choch)
            self._broken_low = low.price
            self.direction = Direction.DOWN

        if event is not None:
            self.breaks.append(event)
        return event

    @property
    def last_break(self) -> StructureBreak | None:
        return self.breaks[-1] if self.breaks else None

    def reset(self) -> None:
        self.swings.reset()
        self.direction = None
        self.breaks.clear()
        self._broken_high = None
        self._broken_low = None


@dataclass
class Zone:
    """A supply or demand zone (an "order block").

    Defined as the last opposing candle before the impulse that broke
    structure: the final down-candle before an up-move is where the buying is
    presumed to have happened.
    """

    top: float
    bottom: float
    time: datetime
    is_demand: bool
    created_index: int = 0
    touches: int = 0
    broken: bool = False

    @property
    def height(self) -> float:
        return self.top - self.bottom

    @property
    def mid(self) -> float:
        return (self.top + self.bottom) / 2.0

    def contains(self, price: float) -> bool:
        return self.bottom <= price <= self.top

    def touched_by(self, candle: Candle) -> bool:
        """True if this bar traded into the zone."""
        return candle.low <= self.top and candle.high >= self.bottom

    def invalidated_by(self, candle: Candle) -> bool:
        """True if this bar closed through the zone, killing it."""
        return candle.close < self.bottom if self.is_demand else candle.close > self.top


@dataclass
class ZoneTracker:
    """Finds supply/demand zones from structure breaks and ages them out.

    A zone is created when a structure break happens, by walking back to the
    last candle that opposed the breaking impulse. Zones are removed once price
    closes through them, or after ``max_age`` bars, because a level nobody has
    respected in two hundred bars is not a level.
    """

    max_zones: int = 8
    max_age: int = 500
    zones: list[Zone] = field(default_factory=list)
    _history: deque[Candle] = field(default_factory=deque, repr=False)
    _index: int = field(default=0, repr=False)

    def update(self, candle: Candle, event: StructureBreak | None) -> Zone | None:
        """Feed a bar and any structure break it produced."""
        self._history.append(candle)
        if len(self._history) > 60:
            self._history.popleft()
        self._index += 1

        for zone in self.zones:
            if zone.touched_by(candle):
                zone.touches += 1
            if zone.invalidated_by(candle):
                zone.broken = True
        self.zones = [
            z for z in self.zones
            if not z.broken and self._index - z.created_index <= self.max_age
        ]

        created = self._zone_from(event) if event is not None else None
        if created is not None:
            self.zones.append(created)
            self.zones = self.zones[-self.max_zones:]
        return created

    def _zone_from(self, event: StructureBreak) -> Zone | None:
        """Walk back to the last candle opposing the impulse that broke structure."""
        bullish = event.direction is Direction.UP
        history = list(self._history)
        # Skip the breaking bar itself, then find the last opposing candle.
        for candle in reversed(history[:-1]):
            is_opposing = candle.close < candle.open if bullish else candle.close > candle.open
            if is_opposing:
                return Zone(
                    top=candle.high, bottom=candle.low, time=candle.time,
                    is_demand=bullish, created_index=self._index,
                )
        return None

    def nearest(self, price: float, is_demand: bool) -> Zone | None:
        """The closest live zone of the given type that price can still trade into.

        A demand zone stays relevant while price is at or above its floor --
        which includes price being *inside* it, the canonical "reacting at the
        zone" case. Only a zone price has dropped entirely below is discarded,
        and one of those is usually already marked broken.
        """
        candidates = [
            z for z in self.zones
            if z.is_demand is is_demand
            and (price >= z.bottom if is_demand else price <= z.top)
        ]
        if not candidates:
            return None
        return min(candidates, key=lambda z: abs(price - z.mid))

    def reset(self) -> None:
        self.zones.clear()
        self._history.clear()
        self._index = 0


@dataclass
class InducementDetector:
    """Detects a liquidity sweep: a wick through a swing that closes back inside.

    This is the mechanical core of "inducement". Retail stops rest just beyond
    an obvious swing; price reaches through to fill them and closes back on the
    other side. Encoded as: the bar's *wick* exceeds the level while its
    *close* does not -- which is precisely what separates a sweep from a break.

    ``lookback`` bounds how stale a swept level may be, and ``max_bars_since``
    bounds how long the signal stays valid after the sweep.
    """

    lookback: int = 20
    max_bars_since: int = 5
    swept_low: Swing | None = None
    swept_high: Swing | None = None
    _bars_since_low: int = field(default=999, repr=False)
    _bars_since_high: int = field(default=999, repr=False)

    def update(self, candle: Candle, swings: SwingDetector) -> Direction | None:
        """Feed a bar; return the direction the sweep implies, if any."""
        self._bars_since_low += 1
        self._bars_since_high += 1
        found: Direction | None = None

        for low in reversed(swings.recent_lows(self.lookback)):
            if candle.low < low.price <= candle.close:
                # Wicked below a swing low but closed back above it: sell-side
                # liquidity taken, which is a bullish sweep.
                self.swept_low = low
                self._bars_since_low = 0
                found = Direction.UP
                break

        for high in reversed(swings.recent_highs(self.lookback)):
            if candle.high > high.price >= candle.close:
                self.swept_high = high
                self._bars_since_high = 0
                found = Direction.DOWN if found is None else None
                break

        return found

    def recent_sweep(self, direction: Direction) -> bool:
        """True if a sweep in this direction happened within the valid window."""
        bars = self._bars_since_low if direction is Direction.UP else self._bars_since_high
        return bars <= self.max_bars_since

    def reset(self) -> None:
        self.swept_low = self.swept_high = None
        self._bars_since_low = self._bars_since_high = 999
