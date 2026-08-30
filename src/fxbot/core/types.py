"""Domain types shared by the data, strategy, risk and execution layers."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum


class Side(StrEnum):
    BUY = "buy"
    SELL = "sell"

    @property
    def sign(self) -> int:
        """+1 for long, -1 for short -- lets P&L math drop the branch."""
        return 1 if self is Side.BUY else -1

    @property
    def opposite(self) -> Side:
        return Side.SELL if self is Side.BUY else Side.BUY


class OrderType(StrEnum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"


class TimeInForce(StrEnum):
    FOK = "FOK"  # fill-or-kill, OANDA's default for market orders
    IOC = "IOC"
    GTC = "GTC"


@dataclass(frozen=True)
class Candle:
    """One OHLC bar.

    ``bid_close``/``ask_close`` carry the two-sided quote when the feed
    supplies it.  FX has no central tape, so the spread is a real and
    time-varying cost; a backtest that only sees mid prices will overstate
    returns.  When a feed gives mid-only data these stay ``None`` and the
    execution layer applies a modelled spread instead.
    """

    time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0
    complete: bool = True
    bid_close: float | None = None
    ask_close: float | None = None

    @property
    def spread(self) -> float | None:
        if self.bid_close is None or self.ask_close is None:
            return None
        return self.ask_close - self.bid_close

    @property
    def range(self) -> float:
        return self.high - self.low


@dataclass(frozen=True)
class Quote:
    """A two-sided price at a point in time."""

    time: datetime
    bid: float
    ask: float

    @property
    def mid(self) -> float:
        return (self.bid + self.ask) / 2.0

    @property
    def spread(self) -> float:
        return self.ask - self.bid

    def price_for(self, side: Side) -> float:
        """The price you actually transact at: buy the ask, sell the bid."""
        return self.ask if side is Side.BUY else self.bid


class SignalAction(StrEnum):
    ENTER_LONG = "enter_long"
    ENTER_SHORT = "enter_short"
    EXIT = "exit"
    HOLD = "hold"


@dataclass(frozen=True)
class Signal:
    """A strategy's intent, expressed in pips rather than prices.

    Strategies deliberately do not size positions -- they say "enter long with
    a 25 pip stop", and the risk layer decides how many units that is worth.
    """

    action: SignalAction
    symbol: str
    stop_pips: float | None = None
    target_pips: float | None = None
    reason: str = ""
    confidence: float = 1.0

    @property
    def is_entry(self) -> bool:
        return self.action in (SignalAction.ENTER_LONG, SignalAction.ENTER_SHORT)

    @property
    def side(self) -> Side | None:
        if self.action is SignalAction.ENTER_LONG:
            return Side.BUY
        if self.action is SignalAction.ENTER_SHORT:
            return Side.SELL
        return None


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


@dataclass
class Order:
    symbol: str
    side: Side
    units: int
    order_type: OrderType = OrderType.MARKET
    limit_price: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    time_in_force: TimeInForce = TimeInForce.FOK
    client_id: str = field(default_factory=_new_id)
    reason: str = ""


@dataclass
class Fill:
    order_id: str
    symbol: str
    side: Side
    units: int
    price: float
    time: datetime
    spread_cost: float = 0.0
    commission: float = 0.0

    @property
    def transaction_cost(self) -> float:
        return self.spread_cost + self.commission


@dataclass
class Position:
    """An open position.  ``units`` is signed: positive long, negative short."""

    symbol: str
    units: int
    entry_price: float
    entry_time: datetime
    stop_loss: float | None = None
    take_profit: float | None = None
    financing: float = 0.0
    #: Spread + slippage paid on entry, in account currency. Recorded for
    #: reporting only -- it is already embedded in ``entry_price``, so
    #: subtracting it from P&L again would double-charge the spread.
    entry_cost: float = 0.0
    #: Commission, which unlike the spread is a separate debit from balance.
    commission: float = 0.0

    @property
    def side(self) -> Side:
        return Side.BUY if self.units > 0 else Side.SELL

    @property
    def is_long(self) -> bool:
        return self.units > 0

    def unrealized_quote(self, current_price: float) -> float:
        """Mark-to-market P&L in the *quote* currency, before financing."""
        return (current_price - self.entry_price) * self.units


@dataclass
class Trade:
    """A round-trip, recorded when a position closes."""

    symbol: str
    side: Side
    units: int
    entry_time: datetime
    entry_price: float
    exit_time: datetime
    exit_price: float
    pnl: float           # account currency, net of costs
    pips: float
    costs: float = 0.0
    financing: float = 0.0
    exit_reason: str = ""

    @property
    def is_win(self) -> bool:
        return self.pnl > 0

    @property
    def duration_hours(self) -> float:
        return (self.exit_time - self.entry_time).total_seconds() / 3600.0
