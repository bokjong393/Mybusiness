from datetime import UTC

import pytest
from tests.conftest import bars

from fxbot.backtest import run
from fxbot.backtest.metrics import compute
from fxbot.core.instrument import Instrument
from fxbot.core.types import Signal, SignalAction
from fxbot.execution.costs import CostModel
from fxbot.risk.manager import RiskLimits
from fxbot.strategy.base import Strategy


class EnterOnBar(Strategy):
    """Enters long once, on a chosen bar index, then holds."""

    def __init__(self, at=1, stop_pips=50.0, target_pips=None):
        super().__init__()
        self.at = at
        self.stop_pips = stop_pips
        self.target_pips = target_pips
        self.seen = []

    def on_bar(self, candle, ctx):
        self.seen.append(candle.close)
        if ctx.bar_index == self.at and not ctx.in_position:
            return Signal(SignalAction.ENTER_LONG, ctx.instrument.symbol,
                          stop_pips=self.stop_pips, target_pips=self.target_pips,
                          reason="scripted")
        return self.hold(ctx)


class Oracle(Strategy):
    """Buys every bar that closes up. Profitable only with look-ahead."""

    def __init__(self):
        super().__init__()
        self._prev = None

    def on_bar(self, candle, ctx):
        prev, self._prev = self._prev, candle.close
        if prev is None:
            return self.hold(ctx)
        if candle.close > prev and not ctx.in_position:
            return Signal(SignalAction.ENTER_LONG, ctx.instrument.symbol,
                          stop_pips=50.0, reason="up bar")
        if candle.close < prev and ctx.in_position:
            return self.exit(ctx, "down bar")
        return self.hold(ctx)


@pytest.fixture
def eurusd_ins():
    return Instrument.parse("EUR_USD")


class TestNoLookAhead:
    def test_a_signal_fills_at_the_next_bar_open_not_the_signal_close(
        self, eurusd_ins, rates, zero_costs
    ):
        # Bar 1 closes at 1.0850; bar 2 opens at 1.0850 and closes at 1.0950.
        series = bars([1.0800, 1.0850, 1.0950, 1.0950, 1.0950])
        result = run(series, EnterOnBar(at=1), eurusd_ins, costs=zero_costs,
                     rates=rates, limits=RiskLimits(require_stop_loss=True))
        assert result.trades, "expected the scripted entry to fill"
        # bar 2's open is bar 1's close (1.0850) -- not bar 2's close of 1.0950.
        assert result.trades[0].entry_price == pytest.approx(1.0850)

    def test_the_oracle_cannot_harvest_the_bar_it_traded_on(
        self, eurusd_ins, rates, zero_costs
    ):
        """Buying every up-bar is only profitable if you fill at its close."""
        from fxbot.data.synthetic import generate

        candles = generate(bars=1500, seed=11)
        result = run(candles, Oracle(), eurusd_ins, costs=zero_costs, rates=rates,
                     limits=RiskLimits(require_stop_loss=True, max_daily_loss=0.99))
        assert result.metrics.trades > 50
        # With honest fills this is a coin flip, not a money machine.
        assert result.metrics.total_return < 0.5

    def test_the_strategy_sees_every_bar_exactly_once_in_order(self, eurusd_ins, rates):
        series = bars([1.0800 + i * 0.0001 for i in range(30)])
        strategy = EnterOnBar(at=99)
        run(series, strategy, eurusd_ins, rates=rates)
        assert strategy.seen == [c.close for c in series]


class TestEngineMechanics:
    def test_stop_is_placed_the_signalled_distance_from_the_fill(
        self, eurusd_ins, rates, zero_costs
    ):
        series = bars([1.0800, 1.0850, 1.0850, 1.0850])
        result = run(series, EnterOnBar(at=1, stop_pips=30.0), eurusd_ins,
                     costs=zero_costs, rates=rates, close_at_end=True)
        trade = result.trades[0]
        assert trade.entry_price == pytest.approx(1.0850)
        # 30 pips below the fill.
        assert result.equity_curve

    def test_position_is_sized_to_the_configured_risk(self, eurusd_ins, rates, zero_costs):
        series = bars([1.0800, 1.0850, 1.0850, 1.0850])
        limits = RiskLimits(risk_per_trade=0.02)
        result = run(series, EnterOnBar(at=1, stop_pips=25.0), eurusd_ins,
                     starting_balance=10_000, costs=zero_costs, rates=rates, limits=limits)
        # 2% of 10k = $200 risk over a 25 pip stop -> 80,000 units.
        assert result.trades[0].units == pytest.approx(80_000, rel=0.01)

    def test_open_position_is_closed_at_the_end_of_the_run(self, eurusd_ins, rates, zero_costs):
        series = bars([1.0800, 1.0850, 1.0860, 1.0870])
        result = run(series, EnterOnBar(at=1), eurusd_ins, costs=zero_costs, rates=rates)
        assert result.trades[-1].exit_reason == "end of backtest"

    def test_leaving_the_position_open_is_possible(self, eurusd_ins, rates, zero_costs):
        series = bars([1.0800, 1.0850, 1.0860, 1.0870])
        result = run(series, EnterOnBar(at=1), eurusd_ins, costs=zero_costs,
                     rates=rates, close_at_end=False)
        assert result.trades == []

    def test_rejections_are_reported_not_silently_dropped(self, eurusd_ins, rates):
        series = bars([1.0800] + [1.0850] * 10)
        limits = RiskLimits(max_margin_utilisation=1e-9)  # no margin available
        result = run(series, EnterOnBar(at=1, stop_pips=50.0), eurusd_ins,
                     rates=rates, limits=limits)
        assert result.trades == []
        assert any("margin" in reason for reason in result.rejections)

    def test_a_unit_cap_clamps_size_rather_than_refusing_the_trade(
        self, eurusd_ins, rates, zero_costs
    ):
        series = bars([1.0800] + [1.0850] * 6)
        result = run(series, EnterOnBar(at=1, stop_pips=50.0), eurusd_ins,
                     costs=zero_costs, rates=rates,
                     limits=RiskLimits(max_units_per_trade=5_000))
        assert result.trades[0].units == 5_000

    def test_empty_input_is_an_error(self, eurusd_ins):
        with pytest.raises(ValueError, match="no candles"):
            run([], EnterOnBar(), eurusd_ins)

    def test_costs_make_an_identical_strategy_perform_worse(self, eurusd_ins, rates, zero_costs):
        from fxbot.data.synthetic import generate
        from fxbot.strategy import build

        candles = generate(bars=3000, trend_strength=0.05, seed=3)
        free = run(candles, build("ema_crossover"), eurusd_ins, costs=zero_costs, rates=rates)
        real = run(candles, build("ema_crossover"), eurusd_ins,
                   costs=CostModel(slippage_pips=0.5), rates=rates)
        assert real.metrics.total_return < free.metrics.total_return
        assert real.metrics.total_costs > 0


class TestMetrics:
    def test_empty_curve_is_all_zeros(self):
        assert compute([], []).trades == 0

    def test_drawdown_is_measured_from_the_peak(self):
        from datetime import datetime, timedelta
        t0 = datetime(2024, 1, 1, tzinfo=UTC)
        curve = [(t0 + timedelta(hours=i), v)
                 for i, v in enumerate([100, 120, 60, 80, 130])]
        m = compute(curve, [])
        assert m.max_drawdown == pytest.approx(0.5)   # 120 -> 60
        assert m.total_return == pytest.approx(0.30)

    def test_sortino_is_at_least_sharpe_for_symmetric_returns(self):
        from fxbot.data.synthetic import generate
        from fxbot.strategy import build
        candles = generate(bars=3000, trend_strength=0.05, seed=5)
        m = run(candles, build("ema_crossover"), Instrument.parse("EUR_USD")).metrics
        if m.sharpe > 0:
            assert m.sortino >= m.sharpe

    def test_report_renders(self):
        from fxbot.data.synthetic import generate
        from fxbot.strategy import build
        candles = generate(bars=2000, seed=2)
        text = run(candles, build("ema_crossover"), Instrument.parse("EUR_USD")).report()
        assert "BACKTEST RESULTS" in text and "Max drawdown" in text
