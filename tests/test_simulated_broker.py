from datetime import timedelta

import pytest
from tests.conftest import bars

from fxbot.core.types import Candle, Order, Side
from fxbot.execution.base import BrokerError
from fxbot.execution.costs import CostModel
from fxbot.execution.simulated import SimulatedBroker


def broker(eurusd, rates, costs=None, balance=10_000.0):
    return SimulatedBroker(
        instrument=eurusd, starting_balance=balance,
        costs=costs or CostModel(), rates=rates,
    )


def candle(base, time, open_=None, high=None, low=None, close=None):
    return Candle(
        time=time, open=open_ if open_ is not None else base,
        high=high if high is not None else base + 0.0010,
        low=low if low is not None else base - 0.0010,
        close=close if close is not None else base,
    )


class TestSpreadAndFills:
    def test_a_buy_fills_above_the_mid(self, eurusd, rates):
        b = broker(eurusd, rates)
        series = bars([1.0850, 1.0860])
        b.open_bar(series[1])
        fill = b.submit(Order("EUR_USD", Side.BUY, 10_000, stop_loss=1.0830))
        # mid 1.0850 + half of 0.8 pips + 0.2 pips slippage
        assert fill.price == pytest.approx(1.0850 + 0.00004 + 0.00002)

    def test_a_sell_fills_below_the_mid(self, eurusd, rates):
        b = broker(eurusd, rates)
        series = bars([1.0850, 1.0860])
        b.open_bar(series[1])
        fill = b.submit(Order("EUR_USD", Side.SELL, 10_000, stop_loss=1.0880))
        assert fill.price == pytest.approx(1.0850 - 0.00004 - 0.00002)

    def test_an_immediate_round_trip_loses_the_spread(self, eurusd, rates):
        b = broker(eurusd, rates)
        series = bars([1.0850, 1.0850, 1.0850])
        b.open_bar(series[1])
        b.submit(Order("EUR_USD", Side.BUY, 100_000, stop_loss=1.0800))
        b.open_bar(series[2])
        trade = b.close("EUR_USD", "flat")
        assert trade.pnl < 0
        # Crossing 1.2 pips (spread + 2x slippage) on 100k units is about $12.
        assert trade.pnl == pytest.approx(-12.0, abs=0.5)

    def test_zero_cost_model_round_trip_is_flat(self, eurusd, rates, zero_costs):
        b = broker(eurusd, rates, costs=zero_costs)
        series = bars([1.0850, 1.0850, 1.0850])
        b.open_bar(series[1])
        b.submit(Order("EUR_USD", Side.BUY, 100_000, stop_loss=1.0800))
        b.open_bar(series[2])
        assert b.close("EUR_USD", "flat").pnl == pytest.approx(0.0, abs=1e-9)

    def test_spread_widens_outside_liquid_hours(self, eurusd, rates):
        b = broker(eurusd, rates)
        liquid = bars([1.0850, 1.0850])           # 08:00 NY
        thin = bars([1.0850, 1.0850],
                    start=liquid[0].time - timedelta(hours=8))  # 00:00 NY, Tokyo only
        b.open_bar(liquid[1])
        tight = b.expected_fill(Side.BUY)
        b2 = broker(eurusd, rates)
        b2.open_bar(thin[1])
        wide = b2.expected_fill(Side.BUY)
        assert wide > tight


class TestStopsAndTargets:
    def test_a_stop_inside_the_bar_range_fills_at_the_stop(self, eurusd, rates, zero_costs):
        b = broker(eurusd, rates, costs=zero_costs)
        series = bars([1.0850, 1.0850])
        b.open_bar(series[1])
        b.submit(Order("EUR_USD", Side.BUY, 100_000, stop_loss=1.0830))
        next_bar = candle(1.0840, series[1].time + timedelta(hours=1),
                          open_=1.0845, high=1.0850, low=1.0820, close=1.0840)
        b.open_bar(next_bar)
        closed = b.check_exits(next_bar)
        assert len(closed) == 1
        assert closed[0].exit_price == pytest.approx(1.0830)
        assert closed[0].exit_reason == "stop"

    def test_a_gap_through_the_stop_fills_at_the_open_not_the_stop(
        self, eurusd, rates, zero_costs
    ):
        """The Sunday-open case: the stop does not hold, and the loss is larger."""
        b = broker(eurusd, rates, costs=zero_costs)
        series = bars([1.0850, 1.0850])
        b.open_bar(series[1])
        b.submit(Order("EUR_USD", Side.BUY, 100_000, stop_loss=1.0830))
        gapped = candle(1.0750, series[1].time + timedelta(hours=1),
                        open_=1.0750, high=1.0760, low=1.0740, close=1.0755)
        b.open_bar(gapped)
        closed = b.check_exits(gapped)
        assert closed[0].exit_reason == "stop (gap)"
        assert closed[0].exit_price == pytest.approx(1.0750)
        # A 20-pip stop that actually cost 100 pips.
        assert closed[0].pips == pytest.approx(-100.0, abs=0.1)

    def test_when_a_bar_covers_both_levels_the_stop_wins(self, eurusd, rates, zero_costs):
        """Without tick data the order is unknowable, so it resolves against us."""
        b = broker(eurusd, rates, costs=zero_costs)
        series = bars([1.0850, 1.0850])
        b.open_bar(series[1])
        b.submit(Order("EUR_USD", Side.BUY, 100_000, stop_loss=1.0830, take_profit=1.0870))
        both = candle(1.0850, series[1].time + timedelta(hours=1),
                      open_=1.0850, high=1.0880, low=1.0820, close=1.0860)
        b.open_bar(both)
        closed = b.check_exits(both)
        assert closed[0].exit_reason == "stop"

    def test_take_profit_fills_when_only_the_target_is_touched(
        self, eurusd, rates, zero_costs
    ):
        b = broker(eurusd, rates, costs=zero_costs)
        series = bars([1.0850, 1.0850])
        b.open_bar(series[1])
        b.submit(Order("EUR_USD", Side.BUY, 100_000, stop_loss=1.0830, take_profit=1.0870))
        up = candle(1.0865, series[1].time + timedelta(hours=1),
                    open_=1.0852, high=1.0875, low=1.0848, close=1.0870)
        b.open_bar(up)
        closed = b.check_exits(up)
        assert closed[0].exit_reason == "target"
        assert closed[0].pnl > 0

    def test_short_stops_trigger_on_the_way_up(self, eurusd, rates, zero_costs):
        b = broker(eurusd, rates, costs=zero_costs)
        series = bars([1.0850, 1.0850])
        b.open_bar(series[1])
        b.submit(Order("EUR_USD", Side.SELL, 100_000, stop_loss=1.0870))
        up = candle(1.0865, series[1].time + timedelta(hours=1),
                    open_=1.0852, high=1.0880, low=1.0850, close=1.0875)
        b.open_bar(up)
        closed = b.check_exits(up)
        assert closed[0].exit_reason == "stop"
        assert closed[0].pips == pytest.approx(-20.0, abs=0.1)


class TestPnLAndAccounting:
    def test_long_profit_in_account_currency(self, eurusd, rates, zero_costs):
        b = broker(eurusd, rates, costs=zero_costs)
        series = bars([1.0850, 1.0850, 1.0900, 1.0900])
        b.open_bar(series[1])
        b.submit(Order("EUR_USD", Side.BUY, 100_000, stop_loss=1.0800))
        b.open_bar(series[3])          # opens at 1.0900
        trade = b.close("EUR_USD", "manual")
        assert trade.pips == pytest.approx(50.0, abs=0.1)
        assert trade.pnl == pytest.approx(500.0, abs=0.5)
        assert b.account().balance == pytest.approx(10_500.0, abs=0.5)

    def test_jpy_pnl_is_converted_to_the_account_currency(self, usdjpy, rates, zero_costs):
        b = SimulatedBroker(instrument=usdjpy, starting_balance=10_000.0,
                            costs=zero_costs, rates=rates)
        series = bars([150.00, 150.00, 150.50, 150.50])
        b.open_bar(series[1])
        b.submit(Order("USD_JPY", Side.BUY, 100_000, stop_loss=149.0))
        b.open_bar(series[3])          # opens at 150.50
        trade = b.close("USD_JPY", "manual")
        assert trade.pips == pytest.approx(50.0, abs=0.1)
        # 50_000 JPY converted at 150.50 (the current mark), not 1:1.
        assert trade.pnl == pytest.approx(50_000 / 150.50, rel=1e-3)

    def test_equity_tracks_unrealized_pnl(self, eurusd, rates, zero_costs):
        b = broker(eurusd, rates, costs=zero_costs)
        series = bars([1.0850, 1.0850, 1.0900, 1.0900])
        b.open_bar(series[1])
        b.submit(Order("EUR_USD", Side.BUY, 100_000, stop_loss=1.0800))
        b.open_bar(series[3])
        account = b.account()
        assert account.balance == pytest.approx(10_000.0)
        assert account.equity == pytest.approx(10_500.0, abs=0.5)
        assert account.margin_used > 0


class TestFinancing:
    def test_carry_accrues_over_a_rollover(self, eurusd, rates, zero_costs):
        costs = CostModel(spread_pips={}, fallback_spread_pips=0.0, slippage_pips=0.0,
                          swap_pips={"EUR_USD": (0.5, -0.7)})
        b = broker(eurusd, rates, costs=costs)
        series = bars([1.0850, 1.0850], step_hours=1)
        b.open_bar(series[1])
        b.submit(Order("EUR_USD", Side.BUY, 100_000, stop_loss=1.0800))
        later = candle(1.0850, series[1].time + timedelta(days=1))
        b.open_bar(later)
        b.open_bar(candle(1.0850, later.time + timedelta(hours=1)))
        trade = b.close("EUR_USD", "manual")
        assert trade.financing == pytest.approx(0.5 * 0.0001 * 100_000, abs=0.01)

    def test_no_financing_within_a_single_session(self, eurusd, rates):
        costs = CostModel(spread_pips={}, fallback_spread_pips=0.0, slippage_pips=0.0,
                          swap_pips={"EUR_USD": (0.5, -0.7)})
        b = broker(eurusd, rates, costs=costs)
        series = bars([1.0850] * 4)
        for bar in series[1:]:
            b.open_bar(bar)
            if bar is series[1]:
                b.submit(Order("EUR_USD", Side.BUY, 100_000, stop_loss=1.0800))
        assert b.close("EUR_USD", "manual").financing == 0.0


class TestGuards:
    def test_submitting_before_a_bar_is_an_error(self, eurusd, rates):
        with pytest.raises(BrokerError, match="no current bar"):
            broker(eurusd, rates).submit(Order("EUR_USD", Side.BUY, 1000, stop_loss=1.0))

    def test_wrong_symbol_is_rejected(self, eurusd, rates):
        b = broker(eurusd, rates)
        b.open_bar(bars([1.0850, 1.0850])[1])
        with pytest.raises(BrokerError, match="does not match"):
            b.submit(Order("GBP_USD", Side.BUY, 1000, stop_loss=1.0))

    def test_double_entry_is_rejected(self, eurusd, rates):
        b = broker(eurusd, rates)
        b.open_bar(bars([1.0850, 1.0850])[1])
        b.submit(Order("EUR_USD", Side.BUY, 1000, stop_loss=1.0800))
        with pytest.raises(BrokerError, match="already holding"):
            b.submit(Order("EUR_USD", Side.BUY, 1000, stop_loss=1.0800))

    def test_zero_units_is_rejected(self, eurusd, rates):
        b = broker(eurusd, rates)
        b.open_bar(bars([1.0850, 1.0850])[1])
        with pytest.raises(BrokerError, match="zero-unit"):
            b.submit(Order("EUR_USD", Side.BUY, 0, stop_loss=1.0800))

    def test_closing_nothing_returns_none(self, eurusd, rates):
        b = broker(eurusd, rates)
        b.open_bar(bars([1.0850, 1.0850])[1])
        assert b.close("EUR_USD") is None

    def test_unconvertible_quote_currency_fails_loudly(self, rates):
        from fxbot.core.instrument import Instrument
        exotic = Instrument.parse("EUR_SEK")
        b = SimulatedBroker(instrument=exotic, rates=rates, account_currency="JPY")
        with pytest.raises(BrokerError, match="cannot value"):
            b.open_bar(bars([11.50, 11.50])[1])
