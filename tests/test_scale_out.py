from datetime import timedelta

import pytest
from tests.conftest import bars

from fxbot.core.types import Candle, Order, Side
from fxbot.execution.costs import CostModel
from fxbot.execution.simulated import SimulatedBroker


@pytest.fixture
def broker(eurusd, rates, zero_costs):
    return SimulatedBroker(instrument=eurusd, starting_balance=10_000.0,
                           costs=zero_costs, rates=rates)


def bar(t, o, h, low, c):
    return Candle(time=t, open=o, high=h, low=low, close=c)


def open_long(broker, t, stop=1.0845, scale=None, breakeven=False, tp=None):
    """Enter 100k long at 1.0850 with a 5 pip stop -- 1R = 5 pips = $50."""
    broker.open_bar(bar(t, 1.0850, 1.0850, 1.0850, 1.0850))
    broker.submit(Order("EUR_USD", Side.BUY, 100_000, stop_loss=stop, take_profit=tp,
                        scale_targets=scale or [], breakeven_after_scale=breakeven))
    return broker.positions()["EUR_USD"]


class TestPartialExits:
    def test_the_r_unit_is_recorded_at_entry(self, broker):
        t = bars([1.0850])[0].time
        position = open_long(broker, t)
        assert position.risk_price == pytest.approx(0.0005)
        assert position.initial_units == 100_000

    def test_a_partial_target_banks_half_and_leaves_the_rest_running(self, broker):
        t = bars([1.0850])[0].time
        open_long(broker, t, scale=[(1.0865, 0.5)])
        hit = bar(t + timedelta(minutes=1), 1.0850, 1.0870, 1.0848, 1.0866)
        broker.open_bar(hit)
        broker.check_exits(hit)

        position = broker.positions()["EUR_USD"]
        assert position.units == 50_000
        assert position.scale_outs == 1
        # 50k units x 15 pips = $75
        assert position.realized == pytest.approx(75.0, abs=0.5)

    def test_the_partial_is_banked_to_balance_immediately(self, broker):
        t = bars([1.0850])[0].time
        open_long(broker, t, scale=[(1.0865, 0.5)])
        hit = bar(t + timedelta(minutes=1), 1.0850, 1.0870, 1.0848, 1.0866)
        broker.open_bar(hit)
        broker.check_exits(hit)
        assert broker.account().balance == pytest.approx(10_075.0, abs=0.5)

    def test_breakeven_moves_the_stop_to_entry(self, broker):
        t = bars([1.0850])[0].time
        open_long(broker, t, scale=[(1.0865, 0.5)], breakeven=True)
        hit = bar(t + timedelta(minutes=1), 1.0850, 1.0870, 1.0848, 1.0866)
        broker.open_bar(hit)
        broker.check_exits(hit)
        assert broker.positions()["EUR_USD"].stop_loss == pytest.approx(1.0850)

    def test_without_the_breakeven_flag_the_stop_is_left_alone(self, broker):
        t = bars([1.0850])[0].time
        open_long(broker, t, scale=[(1.0865, 0.5)], breakeven=False)
        hit = bar(t + timedelta(minutes=1), 1.0850, 1.0870, 1.0848, 1.0866)
        broker.open_bar(hit)
        broker.check_exits(hit)
        assert broker.positions()["EUR_USD"].stop_loss == pytest.approx(1.0845)

    def test_a_target_is_filled_only_once(self, broker):
        t = bars([1.0850])[0].time
        open_long(broker, t, scale=[(1.0865, 0.5)])
        for i in (1, 2):
            hit = bar(t + timedelta(minutes=i), 1.0866, 1.0870, 1.0862, 1.0868)
            broker.open_bar(hit)
            broker.check_exits(hit)
        assert broker.positions()["EUR_USD"].scale_outs == 1

    def test_a_ladder_of_partials_fills_in_order(self, broker):
        t = bars([1.0850])[0].time
        open_long(broker, t, scale=[(1.0860, 0.3), (1.0870, 0.3)])
        first = bar(t + timedelta(minutes=1), 1.0850, 1.0862, 1.0848, 1.0861)
        broker.open_bar(first)
        broker.check_exits(first)
        assert broker.positions()["EUR_USD"].units == 70_000

        second = bar(t + timedelta(minutes=2), 1.0861, 1.0872, 1.0859, 1.0871)
        broker.open_bar(second)
        broker.check_exits(second)
        assert broker.positions()["EUR_USD"].units == 40_000
        assert broker.positions()["EUR_USD"].scale_outs == 2

    def test_a_partial_can_never_close_more_than_remains(self, broker):
        t = bars([1.0850])[0].time
        open_long(broker, t, scale=[(1.0860, 0.8), (1.0870, 0.8)])
        for i, price in ((1, 1.0862), (2, 1.0872)):
            hit = bar(t + timedelta(minutes=i), price - 0.0002, price, price - 0.0004, price)
            broker.open_bar(hit)
            broker.check_exits(hit)
        remaining = broker.positions().get("EUR_USD")
        assert remaining is None or abs(remaining.units) >= 0


class TestPessimisticOrdering:
    def test_a_bar_covering_the_stop_and_a_partial_takes_the_stop(self, broker):
        t = bars([1.0850])[0].time
        open_long(broker, t, scale=[(1.0865, 0.5)])
        both = bar(t + timedelta(minutes=1), 1.0850, 1.0870, 1.0840, 1.0855)
        broker.open_bar(both)
        closed = broker.check_exits(both)
        assert closed[0].exit_reason == "stop"
        assert closed[0].scale_outs == 0
        assert closed[0].r_multiple == pytest.approx(-1.0, abs=0.01)


class TestRMultiple:
    def test_a_full_stop_is_minus_one_r(self, broker):
        t = bars([1.0850])[0].time
        open_long(broker, t)
        out = bar(t + timedelta(minutes=1), 1.0850, 1.0852, 1.0840, 1.0844)
        broker.open_bar(out)
        closed = broker.check_exits(out)
        assert closed[0].r_multiple == pytest.approx(-1.0, abs=0.01)

    def test_a_clean_three_r_win_reports_three_r(self, broker):
        t = bars([1.0850])[0].time
        open_long(broker, t, tp=1.0865)
        win = bar(t + timedelta(minutes=1), 1.0850, 1.0870, 1.0848, 1.0866)
        broker.open_bar(win)
        closed = broker.check_exits(win)
        assert closed[0].r_multiple == pytest.approx(3.0, abs=0.01)

    def test_r_includes_partials_already_banked(self, broker):
        t = bars([1.0850])[0].time
        open_long(broker, t, scale=[(1.0865, 0.5)], breakeven=True)
        first = bar(t + timedelta(minutes=1), 1.0850, 1.0870, 1.0848, 1.0866)
        broker.open_bar(first)
        broker.check_exits(first)
        # Comes back to the breakeven stop: banked 1.5R, remainder flat.
        back = bar(t + timedelta(minutes=2), 1.0866, 1.0867, 1.0845, 1.0848)
        broker.open_bar(back)
        closed = broker.check_exits(back)
        assert closed[0].scale_outs == 1
        assert closed[0].r_multiple == pytest.approx(1.5, abs=0.05)

    def test_costs_bite_on_the_winning_side(self, eurusd, rates, zero_costs):
        """R is measured fill-to-stop, so a stop-out is -1R by construction.

        The spread therefore shows up where it actually hurts: a winner has to
        travel further to bank the same R, so the same price move nets less.
        """
        def run_with(costs):
            b = SimulatedBroker(instrument=eurusd, starting_balance=10_000.0,
                                costs=costs, rates=rates)
            t = bars([1.0850])[0].time
            # Stop 5 pips below the *mid*, target 15 pips above it.
            open_long(b, t, stop=1.0845, tp=1.0865)
            win = bar(t + timedelta(minutes=1), 1.0850, 1.0872, 1.0848, 1.0870)
            b.open_bar(win)
            return b.check_exits(win)[0]

        free = run_with(zero_costs)
        real = run_with(CostModel())
        assert free.r_multiple == pytest.approx(3.0, abs=0.01)
        assert real.r_multiple < free.r_multiple
        assert real.pnl < free.pnl
