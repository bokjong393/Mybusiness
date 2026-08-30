"""Breakout: Donchian channel with a trailing mid-channel exit.

Enters when price closes beyond the high or low of the preceding ``entry``
bars, stops at an ATR multiple, and exits when price closes back through the
opposite side of a shorter channel.  The channel is built from *completed*
bars only, so the breakout level is never contaminated by the bar being tested.
"""

from __future__ import annotations

from ..core.types import Candle, Signal, SignalAction
from .base import Strategy, StrategyContext
from .indicators import ATR, Donchian


class DonchianBreakout(Strategy):
    """Breakout: N-bar Donchian channel, exiting on a shorter opposing channel."""

    def __init__(
        self,
        entry: int = 20,
        exit_channel: int = 10,
        atr_period: int = 14,
        stop_atr_multiple: float = 2.0,
        sessions: tuple[str, ...] = ("london", "new_york"),
        name: str | None = None,
    ) -> None:
        super().__init__(name)
        if exit_channel >= entry:
            raise ValueError("exit_channel must be shorter than entry channel")
        self.entry = entry
        self.exit_channel = exit_channel
        self.atr_period = atr_period
        self.stop_atr_multiple = stop_atr_multiple
        self.sessions = sessions
        self.warmup = entry + atr_period
        self.reset()

    def reset(self) -> None:
        self._entry = Donchian(self.entry)
        self._exit = Donchian(self.exit_channel)
        self._atr = ATR(self.atr_period)

    def on_bar(self, candle: Candle, ctx: StrategyContext) -> Signal:
        entry_ch, exit_ch = self._entry, self._exit
        # Read the channel before updating it, so levels come from prior bars.
        upper, lower = entry_ch.upper, entry_ch.lower
        exit_upper, exit_lower = exit_ch.upper, exit_ch.lower

        self._atr.update_bar(candle.high, candle.low, candle.close)
        entry_ch.update_bar(candle.high, candle.low)
        exit_ch.update_bar(candle.high, candle.low)

        if upper is None or lower is None or not self._atr.ready:
            return self.hold(ctx, "warming up")

        if ctx.in_position:
            if exit_lower is not None and ctx.position.is_long and candle.close < exit_lower:
                return self.exit(ctx, f"close below {self.exit_channel}-bar low")
            if exit_upper is not None and not ctx.position.is_long and candle.close > exit_upper:
                return self.exit(ctx, f"close above {self.exit_channel}-bar high")
            return self.hold(ctx, "channel intact")

        broke_up = candle.close > upper
        broke_down = candle.close < lower
        if not (broke_up or broke_down):
            return self.hold(ctx, "inside channel")

        if self.sessions and not ctx.in_session(*self.sessions):
            return self.hold(ctx, f"breakout outside {'/'.join(self.sessions)}")

        stop_pips = ctx.instrument.price_to_pips(self._atr.value * self.stop_atr_multiple)
        return Signal(
            action=SignalAction.ENTER_LONG if broke_up else SignalAction.ENTER_SHORT,
            symbol=ctx.instrument.symbol,
            stop_pips=round(stop_pips, 1),
            reason=f"{self.entry}-bar {'high' if broke_up else 'low'} breakout",
        )
