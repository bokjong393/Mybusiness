from datetime import UTC

import pytest
from tests.conftest import bars, ny

from fxbot.core.instrument import Instrument
from fxbot.core.types import Position, SignalAction
from fxbot.strategy import REGISTRY, build
from fxbot.strategy.base import StrategyContext


@pytest.fixture
def ins():
    return Instrument.parse("EUR_USD")


def feed(strategy, candles, ins, position=None):
    """Push candles through a strategy, returning every signal."""
    out = []
    for i, candle in enumerate(candles):
        ctx = StrategyContext(instrument=ins, now=candle.time, position=position, bar_index=i)
        out.append(strategy.on_bar(candle, ctx))
    return out


class TestRegistry:
    def test_every_registered_strategy_builds_with_defaults(self):
        for name in REGISTRY:
            strategy = build(name)
            assert strategy.warmup > 0
            assert strategy.describe()

    def test_unknown_strategy_names_itself(self):
        with pytest.raises(KeyError, match="unknown strategy"):
            build("moon_phase")

    def test_reset_clears_indicator_state(self, ins):
        strategy = build("ema_crossover", fast=3, slow=5)
        feed(strategy, bars([1.08 + i * 0.001 for i in range(40)]), ins)
        strategy.reset()
        first = feed(strategy, bars([1.08, 1.081]), ins)
        assert all(s.action is SignalAction.HOLD for s in first)


class TestWarmup:
    def test_no_signals_are_emitted_before_warmup_completes(self, ins):
        strategy = build("ema_crossover", fast=5, slow=10, atr_period=5)
        signals = feed(strategy, bars([1.08 + i * 0.0005 for i in range(8)]), ins)
        assert all(s.action is SignalAction.HOLD for s in signals)
        assert all("warming up" in s.reason for s in signals)

    def test_donchian_waits_for_a_full_channel(self, ins):
        strategy = build("donchian_breakout", entry=10, exit_channel=5, atr_period=5)
        signals = feed(strategy, bars([1.08] * 8), ins)
        assert all(s.action is SignalAction.HOLD for s in signals)


class TestEmaCrossover:
    def test_a_sustained_rally_eventually_signals_long(self, ins):
        strategy = build("ema_crossover", fast=3, slow=8, atr_period=5)
        prices = [1.0800] * 20 + [1.0800 + i * 0.0008 for i in range(1, 25)]
        signals = feed(strategy, bars(prices), ins)
        assert any(s.action is SignalAction.ENTER_LONG for s in signals)

    def test_a_sustained_decline_eventually_signals_short(self, ins):
        strategy = build("ema_crossover", fast=3, slow=8, atr_period=5)
        prices = [1.0800] * 20 + [1.0800 - i * 0.0008 for i in range(1, 25)]
        signals = feed(strategy, bars(prices), ins)
        assert any(s.action is SignalAction.ENTER_SHORT for s in signals)

    def test_entries_carry_a_volatility_scaled_stop(self, ins):
        strategy = build("ema_crossover", fast=3, slow=8, atr_period=5)
        prices = [1.0800] * 20 + [1.0800 + i * 0.0008 for i in range(1, 25)]
        entries = [s for s in feed(strategy, bars(prices), ins) if s.is_entry]
        assert entries and all(s.stop_pips and s.stop_pips > 0 for s in entries)
        assert all(s.target_pips > s.stop_pips for s in entries)

    def test_entries_are_suppressed_outside_the_configured_sessions(self, ins):
        prices = [1.0800] * 20 + [1.0800 + i * 0.0008 for i in range(1, 25)]
        # 02:00 UTC = Tokyo only; London/New York filter should block entries.
        from datetime import datetime
        tokyo = bars(prices, start=datetime(2024, 1, 2, 2, tzinfo=UTC))
        strategy = build("ema_crossover", fast=3, slow=8, atr_period=5)
        signals = feed(strategy, tokyo, ins)
        assert not any(s.is_entry for s in signals)
        assert any("outside" in s.reason for s in signals)

    def test_an_opposing_cross_exits_even_outside_session_hours(self, ins):
        """A held position must never be stranded by an entry-only filter."""
        from datetime import datetime
        strategy = build("ema_crossover", fast=3, slow=8, atr_period=5)
        rally = [1.0800] * 20 + [1.0800 + i * 0.0008 for i in range(1, 20)]
        drop = [rally[-1] - i * 0.0015 for i in range(1, 20)]
        held = Position("EUR_USD", 10_000, 1.0800, ny(2026, 8, 25, 9))
        candles = bars(rally + drop, start=datetime(2024, 1, 2, 2, tzinfo=UTC))
        signals = feed(strategy, candles, ins, position=held)
        assert any(s.action is SignalAction.EXIT for s in signals)

    def test_fast_must_be_shorter_than_slow(self):
        with pytest.raises(ValueError, match="fast period"):
            build("ema_crossover", fast=26, slow=12)


class TestDonchianBreakout:
    def test_a_new_high_triggers_a_long(self, ins):
        strategy = build("donchian_breakout", entry=10, exit_channel=5, atr_period=5)
        prices = [1.0800 + (i % 3) * 0.0002 for i in range(25)] + [1.0900]
        signals = feed(strategy, bars(prices), ins)
        assert signals[-1].action is SignalAction.ENTER_LONG

    def test_a_new_low_triggers_a_short(self, ins):
        strategy = build("donchian_breakout", entry=10, exit_channel=5, atr_period=5)
        prices = [1.0800 + (i % 3) * 0.0002 for i in range(25)] + [1.0700]
        signals = feed(strategy, bars(prices), ins)
        assert signals[-1].action is SignalAction.ENTER_SHORT

    def test_range_bound_prices_produce_no_entries(self, ins):
        strategy = build("donchian_breakout", entry=10, exit_channel=5, atr_period=5)
        prices = [1.0800 + (i % 4) * 0.0001 for i in range(40)]
        assert not any(s.is_entry for s in feed(strategy, bars(prices), ins))

    def test_exit_channel_must_be_shorter_than_entry(self):
        with pytest.raises(ValueError, match="exit_channel"):
            build("donchian_breakout", entry=10, exit_channel=20)


class TestSignalContract:
    def test_strategies_never_size_positions(self, ins):
        """Sizing belongs to the risk layer; a Signal has no units field."""
        from fxbot.core.types import Signal
        assert not hasattr(Signal(SignalAction.HOLD, "EUR_USD"), "units")

    def test_entry_signals_always_carry_a_stop_distance(self, ins):
        from fxbot.data.synthetic import generate
        for name in REGISTRY:
            strategy = build(name)
            candles = generate(bars=1200, trend_strength=0.08, seed=4)
            entries = [s for s in feed(strategy, candles, ins) if s.is_entry]
            assert all(s.stop_pips and s.stop_pips > 0 for s in entries), name
