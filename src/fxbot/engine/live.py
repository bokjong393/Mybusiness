"""The live trading loop, used for both practice and (gated) live accounts.

Structurally identical to the backtest: warm the strategy on history, then on
each newly *completed* candle ask for a signal, size it, run it past the risk
manager, and send it.  Differences that only exist because the world is real:

* **Warmup on start.**  Indicators are replayed over history before the first
  live decision, so a restart does not trade a half-formed EMA.
* **Idempotence across restarts.**  The last processed candle time is persisted,
  so a crash-and-restart cannot act on the same bar twice.
* **Broker truth wins.**  Positions are read back from the broker each cycle
  rather than tracked locally: a stop that filled while the bot was asleep has
  already changed the account, and local state would be a lie.
* **It stops when the market does.**  Outside trading hours it idles instead of
  hammering the API.
"""

from __future__ import annotations

import json
import signal
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from ..config import Config
from ..core.clock import is_market_open, next_market_open
from ..core.instrument import Instrument
from ..core.types import Candle, Order, SignalAction
from ..data.oanda import OandaSource
from ..execution.base import Broker, BrokerError
from ..execution.oanda import OandaBroker
from ..risk.manager import RiskManager
from ..risk.sizing import ConversionRates, position_size
from ..strategy import build as build_strategy
from ..strategy.base import Strategy, StrategyContext


@dataclass
class LiveState:
    """The little that must survive a restart."""

    last_candle_time: str | None = None
    trades_today: int = 0
    day_key: str | None = None

    @classmethod
    def load(cls, path: Path) -> LiveState:
        if not path.exists():
            return cls()
        try:
            return cls(**json.loads(path.read_text()))
        except (ValueError, TypeError) as exc:
            print(f"[warn] ignoring unreadable state file {path}: {exc}")
            return cls()

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(json.dumps(self.__dict__, indent=2))
        tmp.replace(path)  # atomic: a crash mid-write cannot corrupt state


@dataclass
class LiveTrader:
    config: Config
    broker: Broker
    source: OandaSource
    strategy: Strategy
    instrument: Instrument
    risk: RiskManager
    rates: ConversionRates = field(default_factory=ConversionRates)
    dry_run: bool = False
    _stop: bool = field(default=False, init=False)

    @classmethod
    def for_config(cls, config: Config, dry_run: bool = False) -> LiveTrader:
        broker = OandaBroker.for_config(config)
        return cls(
            config=config,
            broker=broker,
            source=OandaSource(broker.client),
            strategy=build_strategy(config.strategy, **config.strategy_params),
            instrument=Instrument.parse(config.symbol),
            risk=RiskManager(limits=config.to_limits()),
            dry_run=dry_run,
        )

    # -- lifecycle --------------------------------------------------------

    def request_stop(self, *_args) -> None:
        """Ask the loop to finish the current cycle and exit."""
        print("\n[shutdown] finishing current cycle; positions are left open")
        self._stop = True

    def install_signal_handlers(self) -> None:
        for sig in (signal.SIGINT, signal.SIGTERM):
            signal.signal(sig, self.request_stop)

    def warmup(self) -> Candle | None:
        """Replay history through the strategy without trading."""
        needed = max(self.strategy.warmup * 3, 200)
        history = self.source.latest_complete(
            self.instrument.symbol, self.config.granularity, lookback=needed
        )
        if not history:
            raise BrokerError(f"no history returned for {self.instrument.symbol}")

        self.strategy.reset()
        for index, candle in enumerate(history[:-1]):
            ctx = StrategyContext(
                instrument=self.instrument, now=candle.time, position=None, bar_index=index
            )
            self.strategy.on_bar(candle, ctx)
        print(
            f"[warmup] replayed {len(history) - 1} bars of {self.config.granularity}; "
            f"last close {history[-1].close} @ {history[-1].time:%Y-%m-%d %H:%M} UTC"
        )
        return history[-1]

    def run(self, max_cycles: int | None = None) -> None:
        """Poll, decide, trade. Runs until stopped."""
        mode = (
            "LIVE" if self.broker.is_live
            else ("DRY RUN" if self.dry_run else "PRACTICE")
        )
        print(f"[start] {mode} | {self.instrument.symbol} {self.config.granularity} "
              f"| {self.strategy.describe()}")

        state_path = Path(self.config.state_file)
        state = LiveState.load(state_path)
        last = self.warmup()
        if state.last_candle_time is None and last is not None:
            state.last_candle_time = last.time.isoformat()
            state.save(state_path)

        account = self.broker.account()
        self.risk.start_day(datetime.now(UTC), account.equity)
        print(f"[account] balance {account.balance:,.2f} {account.currency} "
              f"| equity {account.equity:,.2f} | margin {account.margin_used:,.2f}")

        cycles = 0
        while not self._stop:
            if max_cycles is not None and cycles >= max_cycles:
                break
            cycles += 1
            try:
                self._cycle(state, state_path)
            except BrokerError as exc:
                print(f"[error] {exc}")
            except Exception as exc:  # keep the loop alive; a bad cycle is not fatal
                print(f"[error] unexpected: {type(exc).__name__}: {exc}")

            if self._stop:
                break
            time.sleep(self._sleep_seconds())

        print("[stopped]")

    # -- one iteration ----------------------------------------------------

    def _sleep_seconds(self) -> float:
        now = datetime.now(UTC)
        if not is_market_open(now):
            wait = (next_market_open(now) - now).total_seconds()
            return max(min(wait, 3600.0), 60.0)
        return float(self.config.poll_seconds)

    def _cycle(self, state: LiveState, state_path: Path) -> None:
        now = datetime.now(UTC)
        if not is_market_open(now):
            return

        candles = self.source.latest_complete(
            self.instrument.symbol, self.config.granularity, lookback=3
        )
        if not candles:
            return
        candle = candles[-1]

        if state.last_candle_time == candle.time.isoformat():
            return  # already acted on this bar

        account = self.broker.account()
        self.risk.observe(candle.time, account.equity)
        self.rates.update(self.instrument.symbol, candle.close)

        positions = self.broker.positions()
        position = positions.get(self.instrument.symbol)

        ctx = StrategyContext(
            instrument=self.instrument, now=candle.time, position=position
        )
        signal = self.strategy.on_bar(candle, ctx)

        state.last_candle_time = candle.time.isoformat()
        state.save(state_path)

        if signal.action is SignalAction.HOLD:
            return

        print(f"[signal] {candle.time:%Y-%m-%d %H:%M} {signal.action.value} "
              f"{signal.reason} (stop {signal.stop_pips} pips)")

        if signal.action is SignalAction.EXIT:
            if position is None:
                return
            if self.dry_run:
                print("  [dry-run] would close position")
                return
            trade = self.broker.close(self.instrument.symbol, signal.reason)
            if trade is not None:
                self.risk.record_realized(trade.pnl)
                print(f"  closed: {trade.pips:+.1f} pips, P&L {trade.pnl:+,.2f}")
            return

        if not signal.is_entry:
            return
        if position is not None:
            if self.dry_run:
                print("  [dry-run] would reverse position")
                return
            trade = self.broker.close(self.instrument.symbol, "reverse")
            if trade is not None:
                self.risk.record_realized(trade.pnl)
            positions = self.broker.positions()

        stop_pips = signal.stop_pips or 0.0
        if stop_pips <= 0:
            print("  skipped: entry signal carried no stop distance")
            return

        side = signal.side
        bid, ask = (
            self.broker.current_quote()
            if isinstance(self.broker, OandaBroker)
            else (candle.close, candle.close)
        )
        entry = ask if side.name == "BUY" else bid

        units = position_size(
            self.instrument, account.equity, self.risk.limits.risk_per_trade,
            stop_pips, self.rates, self.config.account_currency,
            max_units=self.risk.limits.max_units_per_trade,
        )
        if units <= 0:
            print("  skipped: position sized to zero units")
            return

        offset = self.instrument.pips_to_price(stop_pips) * side.sign
        order = Order(
            symbol=self.instrument.symbol,
            side=side,
            units=units,
            stop_loss=self.instrument.round_price(entry - offset),
            take_profit=(
                self.instrument.round_price(
                    entry + self.instrument.pips_to_price(signal.target_pips) * side.sign
                )
                if signal.target_pips else None
            ),
            reason=signal.reason,
        )

        decision = self.risk.evaluate(
            order, self.instrument, account.equity, entry, positions,
            self.rates, candle.time, self.config.account_currency, stop_pips,
        )
        if not decision.approved:
            print(f"  rejected by risk: {decision.reason}")
            return

        if self.dry_run:
            print(f"  [dry-run] would {side.value} {units:,} units @ ~{entry} "
                  f"stop {order.stop_loss} target {order.take_profit}")
            return

        fill = self.broker.submit(order)
        print(f"  filled: {fill.side.value} {abs(fill.units):,} units @ {fill.price} "
              f"| stop {order.stop_loss} | target {order.take_profit}")
