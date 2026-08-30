import pytest
from tests.conftest import ny

from fxbot.core.types import Order, Position, Side
from fxbot.risk.manager import RiskLimits, RiskManager


@pytest.fixture
def manager():
    m = RiskManager()
    m.start_day(ny(2026, 8, 25, 10), 10_000.0)
    return m


def order(units=50_000, stop=1.0830, side=Side.BUY):
    return Order("EUR_USD", side, units, stop_loss=stop)


def evaluate(manager, eurusd, rates, *, order_=None, equity=10_000.0,
             positions=None, moment=None, stop_pips=20.0):
    return manager.evaluate(
        order_ or order(), eurusd, equity, 1.0850, positions or {}, rates,
        moment or ny(2026, 8, 25, 10), "USD", stop_pips,
    )


class TestBasicGates:
    def test_a_well_formed_order_passes(self, manager, eurusd, rates):
        assert evaluate(manager, eurusd, rates).approved

    def test_an_order_without_a_stop_is_refused(self, manager, eurusd, rates):
        decision = evaluate(manager, eurusd, rates, order_=order(stop=None))
        assert not decision and "stop loss" in decision.reason

    def test_stops_can_be_made_optional(self, eurusd, rates):
        m = RiskManager(limits=RiskLimits(require_stop_loss=False))
        m.start_day(ny(2026, 8, 25, 10), 10_000.0)
        assert evaluate(m, eurusd, rates, order_=order(stop=None)).approved

    def test_zero_units_is_refused(self, manager, eurusd, rates):
        assert not evaluate(manager, eurusd, rates, order_=order(units=0))

    def test_trading_is_refused_when_the_market_is_shut(self, manager, eurusd, rates):
        decision = evaluate(manager, eurusd, rates, moment=ny(2026, 8, 29, 12))
        assert not decision and "closed" in decision.reason

    def test_equity_floor_stops_trading(self, manager, eurusd, rates):
        decision = evaluate(manager, eurusd, rates, equity=50.0)
        assert not decision and "below floor" in decision.reason

    def test_decision_is_falsy_when_rejected(self, manager, eurusd, rates):
        assert not bool(evaluate(manager, eurusd, rates, order_=order(stop=None)))


class TestSizeAndExposure:
    def test_an_oversized_position_is_refused(self, manager, eurusd, rates):
        decision = evaluate(manager, eurusd, rates, order_=order(units=200_000))
        assert not decision and "risk" in decision.reason

    def test_the_per_trade_unit_cap_is_enforced(self, eurusd, rates):
        m = RiskManager(limits=RiskLimits(max_units_per_trade=10_000))
        m.start_day(ny(2026, 8, 25, 10), 10_000.0)
        decision = evaluate(m, eurusd, rates, order_=order(units=50_000))
        assert not decision and "per-trade cap" in decision.reason

    def test_only_one_position_per_symbol_by_default(self, manager, eurusd, rates):
        held = {"EUR_USD": Position("EUR_USD", 1000, 1.0850, ny(2026, 8, 25, 9))}
        decision = evaluate(manager, eurusd, rates, positions=held)
        assert not decision and "already holding" in decision.reason

    def test_the_open_position_cap_is_enforced(self, eurusd, rates):
        m = RiskManager(limits=RiskLimits(max_open_positions=2))
        m.start_day(ny(2026, 8, 25, 10), 10_000.0)
        held = {
            s: Position(s, 1000, 1.0, ny(2026, 8, 25, 9))
            for s in ("GBP_USD", "USD_JPY")
        }
        decision = evaluate(m, eurusd, rates, positions=held)
        assert not decision and "position cap" in decision.reason

    def test_margin_utilisation_is_capped(self, eurusd, rates):
        m = RiskManager(limits=RiskLimits(max_margin_utilisation=0.001))
        m.start_day(ny(2026, 8, 25, 10), 10_000.0)
        decision = evaluate(m, eurusd, rates)
        assert not decision and "margin" in decision.reason


class TestDailyLossLimit:
    def test_losses_within_budget_do_not_halt(self, manager, eurusd, rates):
        manager.record_realized(-200.0)      # -2% against a 3% limit
        assert not manager.halted
        # Sized to the reduced equity: 1% of 9,800 over a 20 pip stop.
        assert evaluate(manager, eurusd, rates, equity=9_800,
                        order_=order(units=49_000)).approved

    def test_breaching_the_limit_halts_trading(self, manager, eurusd, rates):
        manager.record_realized(-310.0)
        assert manager.halted
        decision = evaluate(manager, eurusd, rates, equity=9_690)
        assert not decision and "halted" in decision.reason

    def test_the_limit_counts_the_day_not_each_trade(self, manager):
        for _ in range(3):
            manager.record_realized(-110.0)  # -3.3% cumulative
        assert manager.halted
        assert manager.daily_pnl == pytest.approx(-330.0)

    def test_a_new_trading_day_clears_the_halt(self, manager, eurusd, rates):
        manager.record_realized(-400.0)
        assert manager.halted
        manager.observe(ny(2026, 8, 26, 10), 9_600.0)   # next FX day
        assert not manager.halted
        assert evaluate(manager, eurusd, rates, equity=9_600,
                        order_=order(units=48_000),
                        moment=ny(2026, 8, 26, 10)).approved

    def test_the_trading_day_rolls_at_5pm_new_york_not_midnight(self, manager):
        before = RiskManager._trading_day(ny(2026, 8, 25, 16))
        after = RiskManager._trading_day(ny(2026, 8, 25, 18))
        assert before != after
        # 18:00 Tuesday belongs to the same FX day as 09:00 Wednesday.
        assert after == RiskManager._trading_day(ny(2026, 8, 26, 9))


class TestKillSwitch:
    def test_manual_halt_blocks_everything(self, manager, eurusd, rates):
        manager.halt("maintenance")
        decision = evaluate(manager, eurusd, rates)
        assert not decision and "maintenance" in decision.reason

    def test_resume_restores_trading(self, manager, eurusd, rates):
        manager.halt("maintenance")
        manager.resume()
        assert evaluate(manager, eurusd, rates).approved

    def test_a_new_day_does_not_clear_a_manual_halt(self, manager):
        manager.halt("maintenance")
        manager.observe(ny(2026, 8, 26, 10), 10_000.0)
        assert manager.halted


class TestLimitValidation:
    @pytest.mark.parametrize("kwargs", [
        {"risk_per_trade": 0}, {"risk_per_trade": 1.5},
        {"max_daily_loss": 0}, {"max_open_positions": 0},
    ])
    def test_impossible_limits_are_rejected_at_construction(self, kwargs):
        with pytest.raises(ValueError):
            RiskLimits(**kwargs)
