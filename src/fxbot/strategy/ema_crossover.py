"""Trend following: EMA crossover with an ATR-scaled stop.

The classic starting strategy, with the two adjustments that matter in FX:

* **The stop is volatility-scaled, not fixed.**  A 20-pip stop is loose on
  EUR/USD in the Tokyo lull and tight on GBP/JPY during the London open.  ATR
  makes the stop mean the same thing in both.
* **Entries are session-filtered.**  Signals fired into thin liquidity pay a
  wide spread to enter and tend to mean-revert; by default this only enters
  during London and New York hours.

This is a demonstration of the framework, not an edge.  Crossover systems are
widely known and whipsaw badly in ranges -- backtest before believing it.
"""

from __future__ import annotations

from ..core.types import Candle, Signal, SignalAction
from .base import Strategy, StrategyContext
from .indicators import ATR, EMA


class EmaCrossover(Strategy):
    """Trend following: EMA crossover with an ATR-scaled stop and target."""

    def __init__(
        self,
        fast: int = 12,
        slow: int = 26,
        atr_period: int = 14,
        stop_atr_multiple: float = 2.0,
        target_atr_multiple: float = 3.0,
        sessions: tuple[str, ...] = ("london", "new_york"),
        name: str | None = None,
    ) -> None:
        super().__init__(name)
        if fast >= slow:
            raise ValueError(f"fast period ({fast}) must be below slow ({slow})")
        self.fast = fast
        self.slow = slow
        self.atr_period = atr_period
        self.stop_atr_multiple = stop_atr_multiple
        self.target_atr_multiple = target_atr_multiple
        self.sessions = sessions
        self.warmup = slow + atr_period
        self.reset()

    def reset(self) -> None:
        self._fast = EMA(self.fast)
        self._slow = EMA(self.slow)
        self._atr = ATR(self.atr_period)
        self._prev_diff: float | None = None

    def on_bar(self, candle: Candle, ctx: StrategyContext) -> Signal:
        self._atr.update_bar(candle.high, candle.low, candle.close)
        fast = self._fast.update(candle.close)
        slow = self._slow.update(candle.close)

        if fast is None or slow is None or not self._atr.ready:
            return self.hold(ctx, "warming up")

        diff = fast - slow
        prev_diff, self._prev_diff = self._prev_diff, diff
        if prev_diff is None:
            return self.hold(ctx, "no prior bar to compare")

        crossed_up = prev_diff <= 0 < diff
        crossed_down = prev_diff >= 0 > diff

        # An opposing cross closes the position wherever it happens; only
        # entries are gated by session, so a stale position is never stranded
        # outside trading hours.
        if ctx.in_position:
            if (ctx.position.is_long and crossed_down) or (
                not ctx.position.is_long and crossed_up
            ):
                return self.exit(ctx, "opposing EMA cross")
            return self.hold(ctx, "trend intact")

        if not (crossed_up or crossed_down):
            return self.hold(ctx, "no cross")

        if self.sessions and not ctx.in_session(*self.sessions):
            return self.hold(ctx, f"cross outside {'/'.join(self.sessions)}")

        stop_pips = ctx.instrument.price_to_pips(self._atr.value * self.stop_atr_multiple)
        target_pips = ctx.instrument.price_to_pips(
            self._atr.value * self.target_atr_multiple
        )
        action = SignalAction.ENTER_LONG if crossed_up else SignalAction.ENTER_SHORT
        return Signal(
            action=action,
            symbol=ctx.instrument.symbol,
            stop_pips=round(stop_pips, 1),
            target_pips=round(target_pips, 1),
            reason=f"EMA{self.fast}/{self.slow} cross {'up' if crossed_up else 'down'}",
        )
