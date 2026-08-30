"""A simulated FX broker for backtesting and dry runs.

Realism choices worth knowing about, because each one makes results *worse*
than a naive simulator and each one reflects something that actually happens:

* **No look-ahead.**  Orders submitted after a bar closes fill at the *next*
  bar's open, never at the close the strategy just saw.  The engine enforces
  the ordering; this class simply fills at whatever the current bar's execution
  price is.
* **Two-sided prices.**  Entries and exits cross the spread, which widens
  outside London/New York hours.
* **Gaps beat stops.**  If a bar opens through the stop -- the Sunday open, a
  central bank surprise -- the fill is at the open, not the stop level.  This
  is the single biggest source of "my backtest said I'd never lose more than
  20 pips" disappointment.
* **Stop before target.**  When a bar's range covers both the stop and the
  take-profit, the simulator assumes the stop hit first.  Without tick data the
  order is unknowable, so it resolves pessimistically.
* **Financing accrues.**  Swap is charged at each rollover crossed, tripled on
  Wednesdays.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from ..core.clock import financing_days, in_session
from ..core.instrument import Instrument
from ..core.types import Candle, Fill, Order, Position, Side, Trade
from ..risk.sizing import ConversionRates, margin_required
from .base import Account, Broker, BrokerError
from .costs import CostModel


@dataclass
class SimulatedBroker(Broker):
    """Fills orders against candle data with explicit cost assumptions."""

    instrument: Instrument
    starting_balance: float = 10_000.0
    account_currency: str = "USD"
    costs: CostModel = field(default_factory=CostModel)
    rates: ConversionRates = field(default_factory=ConversionRates)

    _balance: float = field(init=False, default=0.0)
    _positions: dict[str, Position] = field(init=False, default_factory=dict)
    _bar: Candle | None = field(init=False, default=None)
    _prev_bar_time: datetime | None = field(init=False, default=None)
    _trades: list[Trade] = field(init=False, default_factory=list)
    _fills: list[Fill] = field(init=False, default_factory=list)

    def __post_init__(self) -> None:
        self._balance = self.starting_balance
        # A USD account trading EUR_USD still needs the quote->account rate;
        # seed it from the first bar if the caller supplied nothing.
        self._seeded = False

    # -- interface --------------------------------------------------------

    def account(self) -> Account:
        unrealized = sum(self._unrealized_account(p) for p in self._positions.values())
        equity = self._balance + unrealized
        margin = sum(
            margin_required(
                self.instrument, p.units, self._mid(), self.rates, self.account_currency
            )
            for p in self._positions.values()
        )
        return Account(
            currency=self.account_currency,
            balance=self._balance,
            equity=equity,
            margin_used=margin,
            unrealized=unrealized,
        )

    def positions(self) -> dict[str, Position]:
        return dict(self._positions)

    @property
    def trades(self) -> list[Trade]:
        return list(self._trades)

    @property
    def fills(self) -> list[Fill]:
        return list(self._fills)

    # -- bar lifecycle ----------------------------------------------------

    def open_bar(self, candle: Candle) -> None:
        """Advance to a new bar: accrue financing, then allow fills at its open."""
        if self._prev_bar_time is not None and self._positions:
            self._accrue_financing(self._prev_bar_time, candle.time)
        self._bar = candle
        self._prev_bar_time = candle.time
        self._seed_rates(candle)

    def check_exits(self, candle: Candle) -> list[Trade]:
        """Resolve stops, scale-outs and take-profits against this bar's range."""
        closed: list[Trade] = []
        for symbol, position in list(self._positions.items()):
            exit_price, reason = self._exit_trigger(position, candle)
            if exit_price is not None:
                closed.append(self._close_at(symbol, exit_price, candle.time, reason))
                continue
            # Only reached when the bar did not stop the position out, so a bar
            # covering both the stop and a partial target never scales out.
            self._check_scale_outs(position, candle)
        return closed

    def _check_scale_outs(self, position: Position, candle: Candle) -> None:
        """Fill any partial targets this bar reached."""
        if not position.scale_targets:
            return
        half = self.costs.half_spread_price(self.instrument, self._liquid(candle.time))
        adjust = -half if position.is_long else half
        high, low = candle.high + adjust, candle.low + adjust

        remaining: list[tuple[float, float]] = []
        for price, fraction in position.scale_targets:
            reached = high >= price if position.is_long else low <= price
            if reached and abs(position.units) > 0:
                self._reduce_at(position, price, fraction, candle.time)
            else:
                remaining.append((price, fraction))
        position.scale_targets = remaining

    def _reduce_at(
        self, position: Position, price: float, fraction: float, when: datetime
    ) -> None:
        """Bank a partial exit, leaving the rest of the position running."""
        units = int(position.initial_units * fraction)
        # Never close more than is actually left.
        if abs(units) > abs(position.units):
            units = position.units
        if units == 0:
            return

        pnl_quote = (price - position.entry_price) * units
        banked = self._to_account(pnl_quote)
        self._balance += banked
        position.realized += banked
        position.units -= units
        position.scale_outs += 1

        if position.breakeven_after_scale:
            position.stop_loss = position.entry_price

    def _exit_trigger(
        self, position: Position, candle: Candle
    ) -> tuple[float | None, str]:
        """Return the fill price and reason if this bar takes the position out.

        Levels are compared against bid/ask-adjusted prices: a long is stopped
        when the *bid* trades through the stop, since that is what closes it.
        """
        half = self.costs.half_spread_price(self.instrument, self._liquid(candle.time))
        long = position.is_long
        # Prices at which a long exits (bid = mid - half) or a short exits
        # (ask = mid + half).
        adjust = -half if long else half
        open_, high, low = (
            candle.open + adjust,
            candle.high + adjust,
            candle.low + adjust,
        )

        stop, target = position.stop_loss, position.take_profit

        # 1. A gap through the stop at the open fills at the open, not the stop.
        if stop is not None:
            if long and open_ <= stop:
                return open_, "stop (gap)"
            if not long and open_ >= stop:
                return open_, "stop (gap)"
        if target is not None:
            if long and open_ >= target:
                return open_, "target (gap)"
            if not long and open_ <= target:
                return open_, "target (gap)"

        # 2. Intrabar. Stop is checked first: without ticks, assume the worst.
        if stop is not None:
            if long and low <= stop:
                return stop, "stop"
            if not long and high >= stop:
                return stop, "stop"
        if target is not None:
            if long and high >= target:
                return target, "target"
            if not long and low <= target:
                return target, "target"

        return None, ""

    # -- orders -----------------------------------------------------------

    def expected_fill(self, side: Side) -> float:
        """The exact price :meth:`submit` would fill at on the current bar.

        Exposed so the engine can size a position and place its stop against
        the real entry price rather than an estimate of it.
        """
        if self._bar is None:
            raise BrokerError("no current bar")
        half = self.costs.half_spread_price(self.instrument, self._liquid(self._bar.time))
        slip = self.costs.slippage_price(self.instrument)
        mid = self._bar.open
        price = mid + half + slip if side is Side.BUY else mid - half - slip
        return self.instrument.round_price(price)

    def submit(self, order: Order) -> Fill:
        if self._bar is None:
            raise BrokerError("no current bar; call open_bar() before submitting")
        if order.units == 0:
            raise BrokerError("cannot submit a zero-unit order")
        if order.symbol != self.instrument.symbol:
            raise BrokerError(
                f"order symbol {order.symbol} does not match broker instrument "
                f"{self.instrument.symbol}"
            )
        if order.symbol in self._positions:
            raise BrokerError(
                f"already holding {order.symbol}; close it before opening another "
                "(this simulator models one position per symbol)"
            )

        candle = self._bar
        liquid = self._liquid(candle.time)
        half = self.costs.half_spread_price(self.instrument, liquid)
        slip = self.costs.slippage_price(self.instrument)
        # Orders fill at this bar's open; the engine only submits on the bar
        # *after* the signal, so the strategy never trades a price it has seen.
        price = self.expected_fill(order.side)

        units = abs(order.units) * order.side.sign
        spread_cost = self._to_account(abs(units) * (half + slip))
        commission = self.costs.commission(
            abs(units) * self.rates.rate(self.instrument.base, self.account_currency)
            if self._can_convert(self.instrument.base)
            else abs(units) * price
        )
        self._balance -= commission

        self._positions[order.symbol] = Position(
            symbol=order.symbol,
            units=units,
            entry_price=price,
            entry_time=candle.time,
            stop_loss=order.stop_loss,
            take_profit=order.take_profit,
            entry_cost=spread_cost,
            commission=commission,
            initial_units=units,
            risk_price=abs(price - order.stop_loss) if order.stop_loss else 0.0,
            scale_targets=list(order.scale_targets),
            breakeven_after_scale=order.breakeven_after_scale,
        )
        fill = Fill(
            order_id=order.client_id,
            symbol=order.symbol,
            side=order.side,
            units=units,
            price=price,
            time=candle.time,
            spread_cost=spread_cost,
            commission=commission,
        )
        self._fills.append(fill)
        return fill

    def close(self, symbol: str, reason: str = "") -> Trade | None:
        position = self._positions.get(symbol)
        if position is None or self._bar is None:
            return None
        candle = self._bar
        half = self.costs.half_spread_price(self.instrument, self._liquid(candle.time))
        slip = self.costs.slippage_price(self.instrument)
        # Closing a long sells the bid; closing a short buys the ask.
        mid = candle.open
        price = mid - half - slip if position.is_long else mid + half + slip
        return self._close_at(symbol, self.instrument.round_price(price), candle.time, reason)

    def _close_at(
        self, symbol: str, price: float, when: datetime, reason: str
    ) -> Trade:
        position = self._positions.pop(symbol)
        pnl_quote = position.unrealized_quote(price)
        # The spread is already inside entry_price and this exit price, so it
        # must not be subtracted again; commission was debited at entry.
        gross = self._to_account(pnl_quote) + position.financing
        self._balance += gross
        pnl = gross + position.realized - position.commission

        trade = Trade(
            symbol=symbol,
            side=position.side,
            units=abs(position.initial_units),
            entry_time=position.entry_time,
            entry_price=position.entry_price,
            exit_time=when,
            exit_price=price,
            pnl=pnl,
            pips=self.instrument.price_to_pips(
                (price - position.entry_price) * (1 if position.is_long else -1)
            ),
            costs=position.entry_cost + position.commission,
            financing=position.financing,
            exit_reason=reason,
            r_multiple=pnl / risk if (risk := self._risk_amount(position)) > 0 else 0.0,
            scale_outs=position.scale_outs,
        )
        self._trades.append(trade)
        return trade

    # -- internals --------------------------------------------------------

    def _accrue_financing(self, start: datetime, end: datetime) -> None:
        days = financing_days(start, end)
        if days == 0:
            return
        for position in self._positions.values():
            swap_pips = self.costs.swap_for(position.symbol, position.is_long)
            if swap_pips == 0:
                continue
            amount = self._to_account(
                abs(position.units) * self.instrument.pips_to_price(swap_pips) * days
            )
            position.financing += amount

    def _liquid(self, when: datetime) -> bool:
        return in_session(when, "london", "new_york")

    def _mid(self) -> float:
        return self._bar.close if self._bar is not None else 0.0

    def _can_convert(self, ccy: str) -> bool:
        try:
            self.rates.rate(ccy, self.account_currency)
            return True
        except LookupError:
            return False

    def _seed_rates(self, candle: Candle) -> None:
        """Register this pair's own rate so quote->account conversion works."""
        self.rates.update(self.instrument.symbol, candle.close)
        if not self._seeded and not self._can_convert(self.instrument.quote):
            raise BrokerError(
                f"cannot value {self.instrument.quote} in {self.account_currency}: "
                f"supply a rate (e.g. rates.update('{self.instrument.quote}_"
                f"{self.account_currency}', ...)) before running"
            )
        self._seeded = True

    def _to_account(self, quote_amount: float) -> float:
        return self.rates.convert(quote_amount, self.instrument.quote, self.account_currency)

    def _risk_amount(self, position: Position) -> float:
        """One R in account currency: what a full stop-out was set to cost."""
        if position.risk_price <= 0:
            return 0.0
        return self._to_account(abs(position.initial_units) * position.risk_price)

    def _unrealized_account(self, position: Position) -> float:
        # No entry_cost term: it is already reflected in entry_price.
        return (
            self._to_account(position.unrealized_quote(self._mid()))
            + position.financing
            + position.realized
        )
