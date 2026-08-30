"""Event-driven backtest engine.

The loop enforces the one invariant that separates a useful backtest from a
flattering one: **a signal generated from a closed bar is executed at the next
bar's open.**  Nothing in the strategy layer can reach forward in time, because
by the time an order exists the bar it was decided on is already history.

Per bar, in order:

1. Advance the broker (financing accrues over any rollover crossed).
2. Execute whatever last bar's signal asked for, at this bar's open.
3. Resolve stops and take-profits against this bar's range.
4. Show the completed bar to the strategy and record its intent for next bar.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from ..core.instrument import Instrument
from ..core.types import Candle, Order, Signal, SignalAction, Trade
from ..execution.costs import CostModel
from ..execution.simulated import SimulatedBroker
from ..risk.manager import RiskLimits, RiskManager
from ..risk.sizing import ConversionRates, position_size
from ..strategy.base import Strategy, StrategyContext
from . import metrics as metrics_mod


@dataclass
class _Pending:
    """An intent carried from the bar that produced it to the bar that fills it."""

    signal: Signal
    close_first: bool = False


@dataclass
class BacktestResult:
    metrics: metrics_mod.Metrics
    trades: list[Trade] = field(default_factory=list)
    equity_curve: list[tuple[datetime, float]] = field(default_factory=list)
    rejections: dict[str, int] = field(default_factory=dict)
    strategy: str = ""
    symbol: str = ""
    bars: int = 0

    def report(self) -> str:
        head = f"{self.strategy} on {self.symbol}  ({self.bars:,} bars)"
        body = self.metrics.report()
        if not self.rejections:
            return f"{head}\n{body}"
        lines = [f"{head}\n{body}", "  Risk rejections:"]
        for reason, count in sorted(self.rejections.items(), key=lambda kv: -kv[1]):
            lines.append(f"    {reason:<40} {count:>5}")
        return "\n".join(lines)


def run(
    candles: list[Candle],
    strategy: Strategy,
    instrument: Instrument,
    starting_balance: float = 10_000.0,
    account_currency: str = "USD",
    costs: CostModel | None = None,
    limits: RiskLimits | None = None,
    rates: ConversionRates | None = None,
    close_at_end: bool = True,
) -> BacktestResult:
    """Run ``strategy`` over ``candles`` and return the result."""
    if not candles:
        raise ValueError("no candles to backtest")

    broker = SimulatedBroker(
        instrument=instrument,
        starting_balance=starting_balance,
        account_currency=account_currency,
        costs=costs or CostModel(),
        rates=rates or ConversionRates(),
    )
    risk = RiskManager(limits=limits or RiskLimits())
    risk.start_day(candles[0].time, starting_balance)
    strategy.reset()

    equity_curve: list[tuple[datetime, float]] = []
    rejections: dict[str, int] = {}
    pending: _Pending | None = None
    booked = 0

    def book_new_trades() -> None:
        """Feed newly closed trades to the daily-loss tracker."""
        nonlocal booked
        for trade in broker.trades[booked:]:
            risk.record_realized(trade.pnl)
        booked = len(broker.trades)

    for index, candle in enumerate(candles):
        broker.open_bar(candle)

        # -- 2. execute last bar's intent, at this bar's open ---------------
        if pending is not None:
            signal = pending.signal
            if pending.close_first or signal.action is SignalAction.EXIT:
                broker.close(instrument.symbol, signal.reason or "strategy exit")
                book_new_trades()

            if signal.is_entry:
                account = broker.account()
                side = signal.side
                fill_price = broker.expected_fill(side)
                stop_pips = signal.stop_pips or 0.0
                units = position_size(
                    instrument, account.equity, risk.limits.risk_per_trade,
                    stop_pips, broker.rates, account_currency,
                    max_units=risk.limits.max_units_per_trade,
                ) if stop_pips > 0 else 0

                if units <= 0:
                    _tally(rejections, "sized to zero units")
                else:
                    offset = instrument.pips_to_price(stop_pips) * side.sign
                    order = Order(
                        symbol=instrument.symbol,
                        side=side,
                        units=units,
                        stop_loss=instrument.round_price(fill_price - offset),
                        take_profit=(
                            instrument.round_price(
                                fill_price
                                + instrument.pips_to_price(signal.target_pips) * side.sign
                            )
                            if signal.target_pips
                            else None
                        ),
                        reason=signal.reason,
                    )
                    decision = risk.evaluate(
                        order, instrument, account.equity, fill_price,
                        broker.positions(), broker.rates, candle.time,
                        account_currency, stop_pips,
                    )
                    if decision.approved:
                        broker.submit(order)
                    else:
                        _tally(rejections, decision.reason)
            pending = None

        # -- 3. stops and targets -------------------------------------------
        broker.check_exits(candle)
        book_new_trades()

        account = broker.account()
        risk.observe(candle.time, account.equity)
        equity_curve.append((candle.time, account.equity))

        # -- 4. strategy sees the completed bar -----------------------------
        position = broker.positions().get(instrument.symbol)
        ctx = StrategyContext(
            instrument=instrument, now=candle.time, position=position, bar_index=index
        )
        signal = strategy.on_bar(candle, ctx)
        if signal.action is SignalAction.HOLD:
            continue
        if signal.is_entry and position is not None:
            # A reversal: flatten and re-enter on the next bar.
            pending = _Pending(signal, close_first=True)
        elif signal.action is SignalAction.EXIT and position is None:
            continue
        else:
            pending = _Pending(signal)

    if close_at_end and broker.positions():
        broker.close_all("end of backtest")
        book_new_trades()
        account = broker.account()
        equity_curve.append((candles[-1].time, account.equity))

    return BacktestResult(
        metrics=metrics_mod.compute(equity_curve, broker.trades),
        trades=broker.trades,
        equity_curve=equity_curve,
        rejections=rejections,
        strategy=strategy.describe(),
        symbol=instrument.symbol,
        bars=len(candles),
    )


def _tally(counter: dict[str, int], key: str) -> None:
    counter[key] = counter.get(key, 0) + 1
