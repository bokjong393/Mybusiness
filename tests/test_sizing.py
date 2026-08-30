import pytest

from fxbot.core.instrument import Instrument
from fxbot.risk.sizing import (
    ConversionError,
    ConversionRates,
    margin_required,
    pip_value,
    pip_value_per_unit,
    position_size,
    risk_of,
)


class TestConversionRates:
    def test_same_currency_is_identity(self, rates):
        assert rates.rate("USD", "USD") == 1.0

    def test_direct_and_inverse(self, rates):
        assert rates.rate("EUR", "USD") == pytest.approx(1.0850)
        assert rates.rate("USD", "EUR") == pytest.approx(1 / 1.0850)

    def test_triangulates_through_a_vehicle_currency(self, rates):
        # EUR->JPY via USD: 1.0850 * 150 = 162.75
        assert rates.rate("EUR", "JPY") == pytest.approx(162.75)

    def test_unreachable_currency_raises_rather_than_guessing(self, rates):
        with pytest.raises(ConversionError, match="no rate path"):
            rates.rate("ZAR", "SEK")

    def test_rejects_nonpositive_rates(self):
        with pytest.raises(ValueError):
            ConversionRates().update("EUR_USD", 0)


class TestPipValue:
    def test_usd_quoted_pair_is_ten_dollars_per_lot(self, eurusd, rates):
        assert pip_value(eurusd, 100_000, rates) == pytest.approx(10.0)

    def test_jpy_quoted_pair_depends_on_the_rate(self, usdjpy, rates):
        # 100_000 * 0.01 = 1000 JPY, converted at 150 -> $6.67
        assert pip_value(usdjpy, 100_000, rates) == pytest.approx(1000 / 150)

    def test_the_naive_ten_dollar_assumption_is_wrong_by_a_third(self, usdjpy, rates):
        assert pip_value(usdjpy, 100_000, rates) < 7.0

    def test_cross_pair_pip_value_uses_the_quote(self, rates):
        gbpjpy = Instrument.parse("GBP_JPY")
        assert pip_value(gbpjpy, 100_000, rates) == pytest.approx(1000 / 150)

    def test_non_usd_account_currency(self, usdjpy, rates):
        in_eur = pip_value(usdjpy, 100_000, rates, account_ccy="EUR")
        assert in_eur == pytest.approx((1000 / 150) / 1.0850, rel=1e-6)

    def test_pip_value_scales_linearly(self, eurusd, rates):
        assert pip_value(eurusd, 10_000, rates) == pytest.approx(1.0)
        assert pip_value_per_unit(eurusd, rates) == pytest.approx(0.0001)

    def test_short_positions_have_positive_pip_value(self, eurusd, rates):
        assert pip_value(eurusd, -100_000, rates) == pytest.approx(10.0)


class TestPositionSize:
    def test_sizes_so_the_stop_costs_exactly_the_budget(self, eurusd, rates):
        units = position_size(eurusd, 10_000, 0.01, 20, rates)
        assert units == 50_000
        assert risk_of(eurusd, units, 20, rates) == pytest.approx(100.0)

    def test_jpy_sizing_accounts_for_the_conversion(self, usdjpy, rates):
        units = position_size(usdjpy, 10_000, 0.01, 20, rates)
        assert risk_of(usdjpy, units, 20, rates) == pytest.approx(100.0, abs=0.01)

    def test_wider_stop_means_smaller_size_for_equal_risk(self, eurusd, rates):
        tight = position_size(eurusd, 10_000, 0.01, 10, rates)
        wide = position_size(eurusd, 10_000, 0.01, 40, rates)
        assert tight == 4 * wide
        assert risk_of(eurusd, tight, 10, rates) == pytest.approx(
            risk_of(eurusd, wide, 40, rates)
        )

    def test_never_exceeds_the_risk_budget(self, eurusd, rates):
        for stop in (7, 13, 19, 23, 37):
            units = position_size(eurusd, 9_734.21, 0.01, stop, rates)
            assert risk_of(eurusd, units, stop, rates) <= 9_734.21 * 0.01 + 1e-9

    def test_respects_the_unit_cap(self, eurusd, rates):
        assert position_size(eurusd, 1_000_000, 0.01, 20, rates, max_units=100_000) == 100_000

    def test_no_equity_means_no_position(self, eurusd, rates):
        assert position_size(eurusd, 0, 0.01, 20, rates) == 0

    def test_a_zero_stop_is_an_error_not_an_infinite_position(self, eurusd, rates):
        with pytest.raises(ValueError, match="stop_pips"):
            position_size(eurusd, 10_000, 0.01, 0, rates)

    @pytest.mark.parametrize("bad", [0, 1, 1.5, -0.01])
    def test_rejects_impossible_risk_fractions(self, eurusd, rates, bad):
        with pytest.raises(ValueError, match="risk_fraction"):
            position_size(eurusd, 10_000, bad, 20, rates)


class TestMargin:
    def test_margin_is_a_fraction_of_notional(self, eurusd, rates):
        # 100k EUR at 1.0850 = $108,500 notional; 2% = $2,170
        assert margin_required(eurusd, 100_000, 1.0850, rates) == pytest.approx(2170.0)

    def test_leverage_changes_margin(self, rates):
        thirty_to_one = Instrument.parse("EUR_USD", margin_rate=1 / 30)
        assert margin_required(thirty_to_one, 100_000, 1.0850, rates) == pytest.approx(
            108_500 / 30
        )
