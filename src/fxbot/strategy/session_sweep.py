"""Session-windowed liquidity sweep -- a testable encoding of a documented model.

This implements the publicly described mechanics of Waqar Asim's London
scalping approach, combined with the liquidity/inducement vocabulary taught by
channels such as Inter Equity Trading. As documented, the model is:

* **EURUSD and GBPUSD**, in two one-hour windows: 08:00-09:00 and 14:00-15:00
  London time.
* **H1** for supply and demand zones, **M15** for trend confirmation, **M1**
  for execution.
* Entry is a break of structure on M1, then an *inducement* -- a sweep back
  into a lower-timeframe zone -- expected to continue.
* Stops of **3-7 pips**, because the average London session move is 15-20 pips.
* Take profit **50% at 3R, 50% at 10R**.

Nothing here is an endorsement. It is written so the rules can be measured
rather than believed, and it is deliberately faithful, including the parts that
the cost model will punish. Two things you should expect the backtest to show:

1. **A 5-pip stop is mostly spread.** At a 0.8 pip EURUSD spread plus slippage,
   roughly a quarter of the risk is gone before the trade does anything. The
   ``r_multiple`` column reports this honestly.
2. **10R on a 5-pip stop is a 50-pip run inside a session that averages 15-20
   pips of range.** That target should be expected to fill rarely; whether the
   rare fill pays for the misses is exactly the question a backtest answers.

Run it, read ``breakeven_win_rate`` against the achieved win rate, and let the
gap decide.
"""

from __future__ import annotations

from datetime import time as clock_time
from zoneinfo import ZoneInfo

from ..core.resample import Resampler
from ..core.types import Candle, Signal, SignalAction
from .base import Strategy, StrategyContext
from .checklist import Checklist, Step
from .structure import Direction, InducementDetector, MarketStructure, ZoneTracker

LONDON = ZoneInfo("Europe/London")

#: The two windows, in London local time, as documented.
DEFAULT_WINDOWS: tuple[tuple[str, str], ...] = (("08:00", "09:00"), ("14:00", "15:00"))

#: The entry sequence, in the order it is evaluated. Declared as data so the
#: funnel reads in the same words as the rules, and so a differently-named
#: framework can be mapped onto it by editing this one tuple.
ENTRY_STEPS: tuple[Step, ...] = (
    Step("window", "Session window", "outside session window"),
    Step("budget", "Trade budget", "window trade limit reached"),
    Step("warmup", "Timeframes ready", "higher timeframes still warming up"),
    Step("bias", "Structure", "no M1 structure yet"),
    Step("align", "Alignment", "M15 disagrees with M1"),
    Step("sweep", "Liquidity sweep", "no inducement sweep"),
    Step("zone", "Location", "not at an H1 zone"),
    Step("risk", "Risk band", "stop outside the permitted band"),
)


def _parse(hhmm: str) -> clock_time:
    hour, _, minute = hhmm.partition(":")
    return clock_time(int(hour), int(minute or 0))


class SessionSweep(Strategy):
    """Break of structure, then a liquidity sweep, inside a London window."""

    def __init__(
        self,
        windows: tuple[tuple[str, str], ...] = DEFAULT_WINDOWS,
        htf: str = "H1",
        mtf: str = "M15",
        swing_confirm: int = 2,
        stop_mode: str = "structural",     # structural | fixed
        stop_buffer_pips: float = 1.0,
        min_stop_pips: float = 3.0,
        max_stop_pips: float = 7.0,
        fixed_stop_pips: float = 5.0,
        scale_out: tuple[tuple[float, float], ...] = ((3.0, 0.5),),
        target_r: float = 10.0,
        breakeven_after_scale: bool = True,
        require_htf_zone: bool = True,
        require_mtf_alignment: bool = True,
        max_trades_per_window: int = 1,
        max_hold_bars: int = 120,
        name: str | None = None,
    ) -> None:
        super().__init__(name)
        if stop_mode not in ("structural", "fixed"):
            raise ValueError("stop_mode must be 'structural' or 'fixed'")
        if min_stop_pips > max_stop_pips:
            raise ValueError("min_stop_pips cannot exceed max_stop_pips")
        if target_r <= max(( m for m, _ in scale_out), default=0.0):
            raise ValueError("target_r must be beyond the last scale-out level")

        self.windows = tuple((_parse(a), _parse(b)) for a, b in windows)
        self.htf, self.mtf = htf, mtf
        self.swing_confirm = swing_confirm
        self.stop_mode = stop_mode
        self.stop_buffer_pips = stop_buffer_pips
        self.min_stop_pips, self.max_stop_pips = min_stop_pips, max_stop_pips
        self.fixed_stop_pips = fixed_stop_pips
        self.scale_out = scale_out
        self.target_r = target_r
        self.breakeven_after_scale = breakeven_after_scale
        self.require_htf_zone = require_htf_zone
        self.require_mtf_alignment = require_mtf_alignment
        self.max_trades_per_window = max_trades_per_window
        self.max_hold_bars = max_hold_bars
        # M1 execution needs the H1 zones to exist first: roughly a day of bars.
        self.warmup = 60 * 24
        self.reset()

    def reset(self) -> None:
        #: Records how far each bar gets through the entry sequence. Read
        #: ``checklist.funnel()`` after a backtest to see which step is
        #: actually deciding whether this strategy trades.
        self.checklist = Checklist(steps=ENTRY_STEPS)
        self._htf = Resampler(self.htf)
        self._mtf = Resampler(self.mtf)
        self._htf_structure = MarketStructure(confirm=self.swing_confirm)
        self._mtf_structure = MarketStructure(confirm=self.swing_confirm)
        self._ltf_structure = MarketStructure(confirm=self.swing_confirm)
        self._zones = ZoneTracker()
        self._inducement = InducementDetector(max_bars_since=3)
        self._window_key: tuple | None = None
        self._trades_this_window = 0
        self._bars_held = 0

    # -- helpers ----------------------------------------------------------

    @property
    def skips(self) -> dict[str, int]:
        """Rejections per step, keyed by the reason shown to the caller."""
        return {
            step.detail: rejected
            for step in ENTRY_STEPS
            if (rejected := self.checklist.reached.get(step.key, 0)
                - self.checklist.passed.get(step.key, 0)) > 0
        }

    def funnel(self) -> str:
        """How far bars get through the entry sequence."""
        return self.checklist.funnel()

    def _active_window(self, candle: Candle) -> tuple | None:
        """The window this bar falls in, keyed by date so it resets daily."""
        local = candle.time.astimezone(LONDON)
        for index, (start, end) in enumerate(self.windows):
            if start <= local.time() < end:
                return (local.date(), index)
        return None

    def _mtf_bias(self) -> Direction | None:
        return self._mtf_structure.direction

    # -- the decision -----------------------------------------------------

    def on_bar(self, candle: Candle, ctx: StrategyContext) -> Signal:
        # 1. Higher timeframes advance only on completed bars, so nothing read
        #    from them can include the bar being traded.
        if (htf_bar := self._htf.update(candle)) is not None:
            event = self._htf_structure.update(htf_bar)
            self._zones.update(htf_bar, event)
        if (mtf_bar := self._mtf.update(candle)) is not None:
            self._mtf_structure.update(mtf_bar)

        ltf_break = self._ltf_structure.update(candle)
        sweep = self._inducement.update(candle, self._ltf_structure.swings)

        # 2. Manage an open position before considering anything new.
        if ctx.in_position:
            self._bars_held += 1
            if self._bars_held >= self.max_hold_bars:
                return self.exit(ctx, "max hold reached")
            # A structure break against the position ends the idea early.
            if ltf_break is not None and not ltf_break.is_choch:
                against = (
                    ltf_break.direction is Direction.DOWN
                    if ctx.position.is_long
                    else ltf_break.direction is Direction.UP
                )
                if against:
                    return self.exit(ctx, "structure broke against position")
            return self.hold(ctx, "in position")

        self._bars_held = 0

        # 3. The entry sequence, evaluated in order. Every bar that gets this
        #    far is one evaluation, so the funnel counts real opportunities
        #    rather than only the ones that nearly worked.
        run = self.checklist.run()

        window = self._active_window(candle)
        if not run.check("window", window is not None):
            return self.hold(ctx, run.failure)
        if window != self._window_key:
            self._window_key = window
            self._trades_this_window = 0
        if not run.check("budget", self._trades_this_window < self.max_trades_per_window):
            return self.hold(ctx, run.failure)
        if not run.check("warmup", self._htf.ready and self._mtf.ready):
            return self.hold(ctx, run.failure)

        bias = self._ltf_structure.direction
        if not run.check("bias", bias is not None):
            return self.hold(ctx, run.failure)
        aligned = not self.require_mtf_alignment or self._mtf_bias() in (None, bias)
        if not run.check("align", aligned):
            return self.hold(ctx, run.failure)

        swept = sweep is bias or self._inducement.recent_sweep(bias)
        if not run.check("sweep", swept):
            return self.hold(ctx, run.failure)

        zone = self._zones.nearest(candle.close, is_demand=bias is Direction.UP)
        at_zone = not self.require_htf_zone or (zone is not None and zone.touched_by(candle))
        if not run.check("zone", at_zone):
            return self.hold(ctx, run.failure)

        stop_pips = self._stop_distance(candle, ctx, bias)
        if not run.check("risk", stop_pips is not None):
            return self.hold(
                ctx, f"stop outside {self.min_stop_pips}-{self.max_stop_pips} pips"
            )

        run.complete()
        self._trades_this_window += 1
        return Signal(
            action=SignalAction.ENTER_LONG if bias is Direction.UP else SignalAction.ENTER_SHORT,
            symbol=ctx.instrument.symbol,
            stop_pips=round(stop_pips, 1),
            target_pips=round(stop_pips * self.target_r, 1),
            scale_out=self.scale_out,
            breakeven_after_scale=self.breakeven_after_scale,
            reason=f"{bias.value} sweep at H1 zone",
        )

    def _stop_distance(
        self, candle: Candle, ctx: StrategyContext, bias: Direction
    ) -> float | None:
        """Pips from entry to the stop, or None if that falls outside the band."""
        if self.stop_mode == "fixed":
            return self.fixed_stop_pips

        # Structural: beyond the level the sweep just reached into.
        extreme = candle.low if bias is Direction.UP else candle.high
        distance = abs(candle.close - extreme)
        pips = ctx.instrument.price_to_pips(distance) + self.stop_buffer_pips
        if not self.min_stop_pips <= pips <= self.max_stop_pips:
            return None
        return pips
