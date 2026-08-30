"""Pre-trade risk checks and the kill switch.

Every order passes through :meth:`RiskManager.evaluate` before it reaches a
broker.  The checks are deliberately blunt and fail closed: a rejection costs
one missed trade, a missed rejection can cost the account.

The daily loss limit resets on the 17:00 New York rollover rather than at
midnight, so "today" means the same thing here as it does on the broker's
statement.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from ..core.clock import NY, ROLLOVER_HOUR, is_market_open
from ..core.instrument import Instrument
from ..core.types import Order, Position
from .sizing import ConversionRates, margin_required, risk_of


@dataclass(frozen=True)
class RiskLimits:
    """Hard bounds on what the bot is allowed to do."""

    risk_per_trade: float = 0.01           # fraction of equity risked per trade
    max_daily_loss: float = 0.03           # fraction of start-of-day equity
    max_open_positions: int = 3
    max_positions_per_symbol: int = 1
    max_margin_utilisation: float = 0.20   # fraction of equity committed as margin
    max_units_per_trade: int = 500_000
    min_equity: float = 100.0              # stop trading below this
    require_stop_loss: bool = True
    trade_only_when_open: bool = True

    def __post_init__(self) -> None:
        if not 0 < self.risk_per_trade < 1:
            raise ValueError("risk_per_trade must be in (0, 1)")
        if not 0 < self.max_daily_loss < 1:
            raise ValueError("max_daily_loss must be in (0, 1)")
        if self.max_open_positions < 1:
            raise ValueError("max_open_positions must be at least 1")


@dataclass(frozen=True)
class RiskDecision:
    approved: bool
    reason: str = ""

    def __bool__(self) -> bool:
        return self.approved


APPROVED = RiskDecision(True, "ok")


@dataclass
class RiskManager:
    limits: RiskLimits = field(default_factory=RiskLimits)
    _day_key: tuple[int, int, int] | None = field(default=None, repr=False)
    _day_start_equity: float = field(default=0.0, repr=False)
    _day_realized: float = field(default=0.0, repr=False)
    _halted: bool = field(default=False, repr=False)
    _halt_reason: str = field(default="", repr=False)

    # -- trading-day bookkeeping -----------------------------------------

    @staticmethod
    def _trading_day(moment: datetime) -> tuple[int, int, int]:
        """The FX trading date, which begins at 17:00 New York."""
        local = moment.astimezone(NY)
        if local.hour >= ROLLOVER_HOUR:
            local = local.replace(hour=0) + timedelta(days=1)
        return (local.year, local.month, local.day)

    def start_day(self, moment: datetime, equity: float) -> None:
        """Roll bookkeeping into a new trading day, clearing the loss halt."""
        self._day_key = self._trading_day(moment)
        self._day_start_equity = equity
        self._day_realized = 0.0
        if self._halt_reason.startswith("daily loss"):
            self._halted = False
            self._halt_reason = ""

    def observe(self, moment: datetime, equity: float) -> None:
        """Call once per bar/tick so the day boundary is noticed promptly."""
        key = self._trading_day(moment)
        if self._day_key != key:
            self.start_day(moment, equity)

    def record_realized(self, pnl: float) -> None:
        """Book a closed trade's P&L against today's loss budget."""
        self._day_realized += pnl
        if self._day_start_equity > 0:
            loss_budget = -self._day_start_equity * self.limits.max_daily_loss
            if self._day_realized <= loss_budget:
                self.halt(
                    f"daily loss limit hit: {self._day_realized:.2f} "
                    f"<= {loss_budget:.2f}"
                )

    # -- kill switch ------------------------------------------------------

    def halt(self, reason: str) -> None:
        self._halted = True
        self._halt_reason = reason

    def resume(self) -> None:
        self._halted = False
        self._halt_reason = ""

    @property
    def halted(self) -> bool:
        return self._halted

    @property
    def halt_reason(self) -> str:
        return self._halt_reason

    @property
    def daily_pnl(self) -> float:
        return self._day_realized

    # -- the gate ---------------------------------------------------------

    def evaluate(
        self,
        order: Order,
        instrument: Instrument,
        equity: float,
        price: float,
        positions: dict[str, Position],
        rates: ConversionRates,
        moment: datetime,
        account_ccy: str = "USD",
        stop_pips: float | None = None,
    ) -> RiskDecision:
        """Approve or reject an order. Rejections carry a human-readable reason."""
        if self._halted:
            return RiskDecision(False, f"halted: {self._halt_reason}")

        if order.units == 0:
            return RiskDecision(False, "zero units")

        if equity < self.limits.min_equity:
            return RiskDecision(
                False, f"equity {equity:.2f} below floor {self.limits.min_equity:.2f}"
            )

        if self.limits.trade_only_when_open and not is_market_open(moment):
            return RiskDecision(False, "market closed")

        if self.limits.require_stop_loss and order.stop_loss is None:
            return RiskDecision(False, "order has no stop loss")

        if abs(order.units) > self.limits.max_units_per_trade:
            return RiskDecision(
                False,
                f"size {abs(order.units):,} exceeds per-trade cap "
                f"{self.limits.max_units_per_trade:,}",
            )

        existing = positions.get(order.symbol)
        if existing is not None and self.limits.max_positions_per_symbol <= 1:
            return RiskDecision(False, f"already holding {order.symbol}")

        if existing is None and len(positions) >= self.limits.max_open_positions:
            return RiskDecision(
                False,
                f"at position cap ({len(positions)}/{self.limits.max_open_positions})",
            )

        # Risk actually carried by this order, checked against the budget with a
        # small tolerance for rounding in the sizing step.
        if stop_pips is not None and stop_pips > 0:
            trade_risk = risk_of(instrument, order.units, stop_pips, rates, account_ccy)
            budget = equity * self.limits.risk_per_trade
            if trade_risk > budget * 1.01:
                return RiskDecision(
                    False,
                    f"trade risk {trade_risk:.2f} exceeds budget {budget:.2f}",
                )

        committed = sum(
            margin_required(instrument, p.units, price, rates, account_ccy)
            for p in positions.values()
        )
        incoming = margin_required(instrument, order.units, price, rates, account_ccy)
        cap = equity * self.limits.max_margin_utilisation
        if committed + incoming > cap:
            return RiskDecision(
                False,
                f"margin {committed + incoming:.2f} would exceed cap {cap:.2f}",
            )

        return APPROVED
