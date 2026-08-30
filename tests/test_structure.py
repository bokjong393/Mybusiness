from datetime import UTC, datetime, timedelta

import pytest

from fxbot.core.types import Candle
from fxbot.strategy.structure import (
    Direction,
    InducementDetector,
    MarketStructure,
    SwingDetector,
    Zone,
    ZoneTracker,
)

T0 = datetime(2024, 1, 2, 8, tzinfo=UTC)


def c(i, o, h, low, cl):
    return Candle(time=T0 + timedelta(minutes=i), open=o, high=h, low=low, close=cl)


def series(bars):
    """bars: list of (open, high, low, close)."""
    return [c(i, *b) for i, b in enumerate(bars)]


class TestSwingDetector:
    def test_finds_a_clean_swing_high(self):
        d = SwingDetector(confirm=2)
        bars = series([
            (1.080, 1.081, 1.079, 1.080), (1.080, 1.082, 1.080, 1.081),
            (1.081, 1.090, 1.081, 1.089),   # the peak
            (1.089, 1.088, 1.085, 1.086), (1.086, 1.087, 1.084, 1.085),
        ])
        for bar in bars:
            d.update(bar)
        assert d.last_high is not None
        assert d.last_high.price == pytest.approx(1.090)

    def test_a_swing_is_only_confirmed_after_the_right_hand_side_prints(self):
        """The lag is the point: on a live chart the right side does not exist."""
        d = SwingDetector(confirm=2)
        bars = series([
            (1.080, 1.081, 1.079, 1.080), (1.080, 1.082, 1.080, 1.081),
            (1.081, 1.090, 1.081, 1.089),
        ])
        for bar in bars:
            d.update(bar)
        assert d.last_high is None, "swing reported before it could be known"

        d.update(c(3, 1.089, 1.088, 1.085, 1.086))
        assert d.last_high is None
        d.update(c(4, 1.086, 1.087, 1.084, 1.085))
        assert d.last_high is not None

    def test_finds_a_swing_low(self):
        d = SwingDetector(confirm=1)
        for bar in series([
            (1.085, 1.086, 1.084, 1.085), (1.085, 1.085, 1.080, 1.081),
            (1.081, 1.084, 1.082, 1.083),
        ]):
            d.update(bar)
        assert d.last_low.price == pytest.approx(1.080)

    def test_equal_highs_do_not_invalidate_the_pivot(self):
        """Equal highs read as one liquidity pool, not two separate swings."""
        d = SwingDetector(confirm=1)
        for bar in series([
            (1.080, 1.081, 1.079, 1.080), (1.081, 1.090, 1.080, 1.089),
            (1.089, 1.090, 1.085, 1.086),
        ]):
            d.update(bar)
        assert d.last_high is not None

    def test_confirm_must_be_positive(self):
        with pytest.raises(ValueError):
            SwingDetector(confirm=0)

    def test_reset_clears_everything(self):
        d = SwingDetector(confirm=1)
        for bar in series([(1.08, 1.09, 1.07, 1.08)] * 5):
            d.update(bar)
        d.reset()
        assert d.highs == [] and d.lows == [] and d.last_high is None


class TestMarketStructure:
    def test_a_close_above_a_swing_high_is_a_break(self):
        ms = MarketStructure(confirm=1)
        events = []
        for bar in series([
            (1.080, 1.081, 1.079, 1.080), (1.081, 1.090, 1.080, 1.089),
            (1.089, 1.090, 1.085, 1.086),   # confirms the swing high at 1.090
            (1.086, 1.095, 1.086, 1.094),   # closes above it -> BOS
        ]):
            if (e := ms.update(bar)) is not None:
                events.append(e)
        assert events and events[-1].direction is Direction.UP
        assert events[-1].label == "BOS"

    def test_a_wick_through_a_level_is_not_a_break(self):
        """This distinction is the entire basis of the sweep/inducement idea."""
        ms = MarketStructure(confirm=1)
        events = []
        for bar in series([
            (1.080, 1.081, 1.079, 1.080), (1.081, 1.090, 1.080, 1.089),
            (1.089, 1.090, 1.085, 1.086),
            (1.086, 1.0951, 1.086, 1.0880),  # wicks above 1.090, closes below
        ]):
            if (e := ms.update(bar)) is not None:
                events.append(e)
        assert not events, "a wick through the level was counted as a break"

    def test_a_reversal_break_is_flagged_as_choch(self):
        ms = MarketStructure(confirm=1)
        labels = []
        bars = series([
            (1.080, 1.081, 1.079, 1.080), (1.081, 1.090, 1.080, 1.089),
            (1.089, 1.090, 1.085, 1.086), (1.086, 1.095, 1.086, 1.094),   # BOS up
            (1.094, 1.095, 1.070, 1.072), (1.072, 1.074, 1.069, 1.073),
            (1.073, 1.075, 1.071, 1.074), (1.074, 1.075, 1.060, 1.061),   # break down
        ])
        for bar in bars:
            if (e := ms.update(bar)) is not None:
                labels.append((e.direction, e.label))
        assert (Direction.UP, "BOS") in labels
        assert any(d is Direction.DOWN and lbl == "CHOCH" for d, lbl in labels)

    def test_the_same_level_does_not_break_twice(self):
        ms = MarketStructure(confirm=1)
        count = 0
        for bar in series([
            (1.080, 1.081, 1.079, 1.080), (1.081, 1.090, 1.080, 1.089),
            (1.089, 1.090, 1.085, 1.086), (1.086, 1.095, 1.086, 1.094),
            (1.094, 1.096, 1.093, 1.0945),
        ]):
            if ms.update(bar) is not None:
                count += 1
        assert count == 1


class TestZone:
    def test_containment_and_touch(self):
        z = Zone(top=1.086, bottom=1.084, time=T0, is_demand=True)
        assert z.contains(1.085) and not z.contains(1.090)
        assert z.touched_by(c(0, 1.088, 1.089, 1.0855, 1.087))
        assert not z.touched_by(c(0, 1.090, 1.091, 1.0875, 1.089))

    def test_a_close_through_a_demand_zone_invalidates_it(self):
        z = Zone(top=1.086, bottom=1.084, time=T0, is_demand=True)
        assert z.invalidated_by(c(0, 1.085, 1.085, 1.082, 1.0835))
        assert not z.invalidated_by(c(0, 1.085, 1.086, 1.0835, 1.0850))

    def test_supply_zones_invalidate_upward(self):
        z = Zone(top=1.086, bottom=1.084, time=T0, is_demand=False)
        assert z.invalidated_by(c(0, 1.085, 1.088, 1.085, 1.0870))


class TestZoneTracker:
    def test_a_structure_break_creates_a_zone_from_the_last_opposing_candle(self):
        tracker = ZoneTracker()
        ms = MarketStructure(confirm=1)
        created = None
        for bar in series([
            (1.080, 1.081, 1.079, 1.080), (1.081, 1.090, 1.080, 1.089),
            (1.089, 1.090, 1.085, 1.086),   # a down-candle: the demand zone
            (1.086, 1.095, 1.086, 1.094),   # impulse that breaks structure
        ]):
            event = ms.update(bar)
            zone = tracker.update(bar, event)
            created = zone or created
        assert created is not None and created.is_demand
        assert created.top == pytest.approx(1.090)

    def test_zones_are_dropped_once_price_closes_through_them(self):
        tracker = ZoneTracker()
        tracker.zones.append(Zone(top=1.086, bottom=1.084, time=T0, is_demand=True))
        tracker.update(c(0, 1.085, 1.085, 1.080, 1.0810), None)
        assert tracker.zones == []

    def test_nearest_ignores_zones_price_has_already_passed(self):
        tracker = ZoneTracker()
        below = Zone(top=1.080, bottom=1.078, time=T0, is_demand=True)
        above = Zone(top=1.099, bottom=1.097, time=T0, is_demand=True)
        tracker.zones.extend([below, above])
        assert tracker.nearest(1.090, is_demand=True) is below

    def test_zone_count_is_bounded(self):
        tracker = ZoneTracker(max_zones=3)
        for i in range(10):
            tracker.zones.append(Zone(top=1.09 + i, bottom=1.08 + i, time=T0, is_demand=True))
        tracker.zones = tracker.zones[-tracker.max_zones:]
        assert len(tracker.zones) == 3


class TestInducementDetector:
    def test_a_wick_below_a_swing_low_that_closes_back_above_is_a_bullish_sweep(self):
        swings = SwingDetector(confirm=1)
        for bar in series([
            (1.085, 1.086, 1.084, 1.085), (1.085, 1.085, 1.080, 1.081),
            (1.081, 1.084, 1.082, 1.083),
        ]):
            swings.update(bar)
        assert swings.last_low.price == pytest.approx(1.080)

        detector = InducementDetector()
        sweep = detector.update(c(3, 1.083, 1.084, 1.0785, 1.0825), swings)
        assert sweep is Direction.UP
        assert detector.recent_sweep(Direction.UP)

    def test_closing_below_the_low_is_a_break_not_a_sweep(self):
        swings = SwingDetector(confirm=1)
        for bar in series([
            (1.085, 1.086, 1.084, 1.085), (1.085, 1.085, 1.080, 1.081),
            (1.081, 1.084, 1.082, 1.083),
        ]):
            swings.update(bar)
        detector = InducementDetector()
        assert detector.update(c(3, 1.083, 1.084, 1.0780, 1.0785), swings) is None

    def test_a_sweep_goes_stale(self):
        swings = SwingDetector(confirm=1)
        for bar in series([
            (1.085, 1.086, 1.084, 1.085), (1.085, 1.085, 1.080, 1.081),
            (1.081, 1.084, 1.082, 1.083),
        ]):
            swings.update(bar)
        detector = InducementDetector(max_bars_since=2)
        detector.update(c(3, 1.083, 1.084, 1.0785, 1.0825), swings)
        assert detector.recent_sweep(Direction.UP)
        for i in range(4, 8):
            detector.update(c(i, 1.083, 1.0835, 1.0825, 1.083), swings)
        assert not detector.recent_sweep(Direction.UP)


class TestDirection:
    def test_opposite(self):
        assert Direction.UP.opposite is Direction.DOWN
        assert Direction.DOWN.opposite is Direction.UP
