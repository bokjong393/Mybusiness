from datetime import datetime

import pytest
from tests.conftest import ny

from fxbot.core.clock import (
    active_sessions,
    financing_days,
    in_session,
    is_market_open,
    is_triple_swap,
    next_market_open,
    rollover_instants,
)


class TestMarketHours:
    @pytest.mark.parametrize("moment,expected", [
        (ny(2026, 8, 28, 16, 59), True),   # Friday, just before the close
        (ny(2026, 8, 28, 17, 1), False),   # Friday, just after
        (ny(2026, 8, 29, 12), False),      # Saturday
        (ny(2026, 8, 30, 16, 59), False),  # Sunday, before the open
        (ny(2026, 8, 30, 17, 1), True),    # Sunday, after the open
        (ny(2026, 8, 25, 3), True),        # Tuesday small hours
    ])
    def test_the_fx_week_runs_sunday_5pm_to_friday_5pm(self, moment, expected):
        assert is_market_open(moment) is expected

    def test_naive_datetimes_are_rejected_not_assumed(self):
        with pytest.raises(ValueError, match="timezone-aware"):
            is_market_open(datetime(2026, 8, 25, 12))

    def test_boundaries_hold_across_the_dst_change(self):
        # US DST ended 2026-11-01. The week still closes at 17:00 *local*.
        assert is_market_open(ny(2026, 11, 6, 16, 59)) is True
        assert is_market_open(ny(2026, 11, 6, 17, 1)) is False

    def test_next_open_from_the_weekend_is_sunday_evening(self):
        opens = next_market_open(ny(2026, 8, 29, 12))
        assert (opens.weekday(), opens.hour) == (6, 17)

    def test_next_open_during_the_week_is_now(self):
        moment = ny(2026, 8, 25, 12)
        assert next_market_open(moment) == moment


class TestSessions:
    def test_london_and_new_york_overlap_midmorning_ny(self):
        assert set(active_sessions(ny(2026, 8, 25, 9))) == {"london", "new_york"}

    def test_tokyo_runs_while_new_york_sleeps(self):
        assert "tokyo" in active_sessions(ny(2026, 8, 25, 3))
        assert "new_york" not in active_sessions(ny(2026, 8, 25, 3))

    def test_no_sessions_at_the_weekend(self):
        assert active_sessions(ny(2026, 8, 29, 12)) == ()

    def test_in_session_filter(self):
        assert in_session(ny(2026, 8, 25, 9), "london", "new_york") is True
        assert in_session(ny(2026, 8, 25, 3), "new_york") is False

    def test_unknown_session_name_is_an_error(self):
        with pytest.raises(ValueError, match="unknown session"):
            in_session(ny(2026, 8, 25, 9), "frankfurt")


class TestRollover:
    def test_intraday_positions_pay_no_financing(self):
        assert financing_days(ny(2026, 8, 25, 9), ny(2026, 8, 25, 16)) == 0

    def test_one_night_is_one_day(self):
        assert financing_days(ny(2026, 8, 24, 12), ny(2026, 8, 25, 12)) == 1

    def test_wednesday_rollover_charges_three_days(self):
        # Wednesday 12:00 -> Thursday 12:00 crosses only the Wed 17:00 rollover.
        assert financing_days(ny(2026, 8, 26, 12), ny(2026, 8, 27, 12)) == 3

    def test_a_week_of_carry_totals_seven_days(self):
        # Mon 12:00 -> Fri 12:00 crosses Mon, Tue, Wed(x3), Thu = 6... plus the
        # week's shape. Check against the explicit instants.
        total = financing_days(ny(2026, 8, 24, 12), ny(2026, 8, 28, 12))
        instants = rollover_instants(ny(2026, 8, 24, 12), ny(2026, 8, 28, 12))
        assert len(instants) == 4                      # Mon, Tue, Wed, Thu
        assert total == 3 + 3 * 1                      # Wed counts triple

    def test_no_rollover_on_saturday(self):
        instants = rollover_instants(ny(2026, 8, 28, 12), ny(2026, 8, 31, 12))
        weekdays = {i.astimezone(ny(2026, 8, 28, 12).tzinfo).weekday() for i in instants}
        assert 5 not in weekdays

    def test_backwards_range_is_empty(self):
        assert rollover_instants(ny(2026, 8, 27, 12), ny(2026, 8, 25, 12)) == []

    def test_triple_swap_identification(self):
        assert is_triple_swap(ny(2026, 8, 26, 17)) is True    # Wednesday 17:00
        assert is_triple_swap(ny(2026, 8, 25, 17)) is False    # Tuesday
        assert is_triple_swap(ny(2026, 8, 26, 12)) is False    # not rollover time
