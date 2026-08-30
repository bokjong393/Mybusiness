from datetime import UTC, datetime, timedelta

import pytest

from fxbot.core.instrument import Instrument
from fxbot.core.types import Candle, SignalAction
from fxbot.strategy import build
from fxbot.strategy.base import StrategyContext
from fxbot.strategy.session_sweep import SessionSweep


@pytest.fixture
def ins():
    return Instrument.parse("EUR_USD")


def feed(strategy, candles, ins, position=None):
    return [
        strategy.on_bar(
            candle,
            StrategyContext(instrument=ins, now=candle.time, position=position, bar_index=i),
        )
        for i, candle in enumerate(candles)
    ]


def m1_series(start, count, base=1.0850):
    """Flat M1 bars -- enough to advance the clock without creating setups."""
    return [
        Candle(time=start + timedelta(minutes=i), open=base, high=base + 0.0002,
               low=base - 0.0002, close=base, volume=10.0)
        for i in range(count)
    ]


class TestConstruction:
    def test_builds_from_the_registry(self):
        assert isinstance(build("session_sweep"), SessionSweep)

    def test_defaults_match_the_documented_model(self):
        s = SessionSweep()
        assert s.scale_out == ((3.0, 0.5),)
        assert s.target_r == 10.0
        assert (s.min_stop_pips, s.max_stop_pips) == (3.0, 7.0)
        assert len(s.windows) == 2

    def test_an_impossible_stop_band_is_rejected(self):
        with pytest.raises(ValueError, match="min_stop_pips"):
            SessionSweep(min_stop_pips=9, max_stop_pips=4)

    def test_a_target_inside_the_scale_ladder_is_rejected(self):
        with pytest.raises(ValueError, match="target_r"):
            SessionSweep(scale_out=((12.0, 0.5),), target_r=10.0)

    def test_a_bad_stop_mode_is_rejected(self):
        with pytest.raises(ValueError, match="stop_mode"):
            SessionSweep(stop_mode="vibes")


class TestSessionWindows:
    def test_bars_outside_a_window_never_produce_entries(self, ins):
        s = SessionSweep()
        # 03:00 UTC is outside both London windows.
        candles = m1_series(datetime(2024, 1, 2, 3, tzinfo=UTC), 120)
        signals = feed(s, candles, ins)
        assert not any(sig.is_entry for sig in signals)
        assert all(sig.reason == "outside session window" for sig in signals)

    def test_the_london_windows_are_recognised(self, ins):
        s = SessionSweep()
        # 08:30 London in January is 08:30 UTC.
        candles = m1_series(datetime(2024, 1, 2, 8, 30, tzinfo=UTC), 5)
        reasons = {sig.reason for sig in feed(s, candles, ins)}
        assert "outside session window" not in reasons

    def test_windows_follow_london_across_british_summer_time(self, ins):
        """In July, 08:30 London is 07:30 UTC -- a fixed UTC window would miss it."""
        s = SessionSweep()
        summer = m1_series(datetime(2024, 7, 2, 7, 30, tzinfo=UTC), 5)
        assert all(sig.reason != "outside session window" for sig in feed(s, summer, ins))

        wrong = m1_series(datetime(2024, 7, 2, 8, 30, tzinfo=UTC), 5)
        assert all(sig.reason == "outside session window" for sig in feed(s, wrong, ins))


class TestGating:
    def test_no_entry_before_the_higher_timeframes_are_ready(self, ins):
        s = SessionSweep()
        candles = m1_series(datetime(2024, 1, 2, 8, tzinfo=UTC), 30)
        assert not any(sig.is_entry for sig in feed(s, candles, ins))

    def test_skips_are_counted_so_filters_can_be_audited(self, ins):
        from fxbot.data.synthetic import generate

        s = SessionSweep()
        candles = generate(symbol="EUR_USD", granularity="M1", bars=20_000, seed=5)
        feed(s, candles, ins)
        assert s.skips, "no skip reasons recorded"
        assert sum(s.skips.values()) > 0

    def test_reset_clears_all_state(self, ins):
        from fxbot.data.synthetic import generate

        s = SessionSweep()
        feed(s, generate(symbol="EUR_USD", granularity="M1", bars=5_000, seed=5), ins)
        s.reset()
        assert s.skips == {}
        assert not s._htf.ready and s._ltf_structure.direction is None


class TestPositionManagement:
    def test_an_open_position_is_managed_outside_the_window_too(self, ins):
        """A held position must never be stranded by an entry-only filter."""
        from fxbot.core.types import Position

        s = SessionSweep(max_hold_bars=3)
        held = Position("EUR_USD", 10_000, 1.0850, datetime(2024, 1, 2, 3, tzinfo=UTC))
        candles = m1_series(datetime(2024, 1, 2, 3, tzinfo=UTC), 6)
        signals = feed(s, candles, ins, position=held)
        assert any(sig.action is SignalAction.EXIT for sig in signals)

    def test_max_hold_forces_an_exit(self, ins):
        from fxbot.core.types import Position

        s = SessionSweep(max_hold_bars=5)
        held = Position("EUR_USD", 10_000, 1.0850, datetime(2024, 1, 2, 8, tzinfo=UTC))
        signals = feed(s, m1_series(datetime(2024, 1, 2, 8, tzinfo=UTC), 10), ins, position=held)
        exits = [sig for sig in signals if sig.action is SignalAction.EXIT]
        assert exits and exits[0].reason == "max hold reached"


class TestSignalShape:
    def test_entries_carry_the_documented_scale_plan(self, ins):
        from fxbot.data.synthetic import generate

        s = SessionSweep(require_htf_zone=False, require_mtf_alignment=False,
                         stop_mode="fixed", fixed_stop_pips=5.0, max_trades_per_window=99)
        candles = generate(symbol="EUR_USD", granularity="M1", bars=40_000, seed=3)
        entries = [sig for sig in feed(s, candles, ins) if sig.is_entry]
        assert entries, "loosened filters still produced no entries"
        for sig in entries:
            assert sig.stop_pips == pytest.approx(5.0)
            assert sig.target_pips == pytest.approx(50.0)      # 10R
            assert sig.scale_out == ((3.0, 0.5),)
            assert sig.breakeven_after_scale

    def test_structural_stops_stay_inside_the_documented_band(self, ins):
        from fxbot.data.synthetic import generate

        s = SessionSweep(require_htf_zone=False, require_mtf_alignment=False,
                         max_trades_per_window=99)
        candles = generate(symbol="EUR_USD", granularity="M1", bars=40_000, seed=3)
        for sig in feed(s, candles, ins):
            if sig.is_entry:
                assert 3.0 <= sig.stop_pips <= 7.0
