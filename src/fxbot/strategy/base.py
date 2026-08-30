"""Strategy interface.

A strategy answers one question per bar: given everything up to and including
this candle, what do I want to do?  It expresses that as a :class:`Signal` in
*pips*, and stops there.  It never sees the account balance, never chooses a
position size, and never places an order -- the risk layer owns those, so that
changing risk policy does not mean editing every strategy.

Strategies are fed only completed candles, in order, exactly once each.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime

from ..core.clock import active_sessions, in_session
from ..core.instrument import Instrument
from ..core.types import Candle, Position, Signal, SignalAction


@dataclass(frozen=True)
class StrategyContext:
    """What a strategy is allowed to know at decision time."""

    instrument: Instrument
    now: datetime
    position: Position | None = None
    bar_index: int = 0

    @property
    def in_position(self) -> bool:
        return self.position is not None

    @property
    def sessions(self) -> tuple[str, ...]:
        return active_sessions(self.now)

    def in_session(self, *names: str) -> bool:
        return in_session(self.now, *names)


class Strategy(ABC):
    """Base class for all strategies."""

    #: Bars of history needed before signals are meaningful.
    warmup: int = 0

    def __init__(self, name: str | None = None) -> None:
        self.name = name or self.__class__.__name__

    @abstractmethod
    def on_bar(self, candle: Candle, ctx: StrategyContext) -> Signal:
        """Return the intent for this bar."""

    def hold(self, ctx: StrategyContext, reason: str = "") -> Signal:
        return Signal(SignalAction.HOLD, ctx.instrument.symbol, reason=reason)

    def exit(self, ctx: StrategyContext, reason: str = "") -> Signal:
        return Signal(SignalAction.EXIT, ctx.instrument.symbol, reason=reason)

    def reset(self) -> None:  # noqa: B027 - optional hook, not abstract
        """Clear indicator state. Called between backtest runs.

        Stateless strategies need not override this.
        """

    def describe(self) -> str:
        params = {
            k: v for k, v in vars(self).items()
            if not k.startswith("_") and isinstance(v, (int, float, str, bool, tuple))
        }
        body = ", ".join(f"{k}={v}" for k, v in params.items() if k != "name")
        return f"{self.name}({body})"
