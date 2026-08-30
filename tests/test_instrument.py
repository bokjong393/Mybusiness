import pytest

from fxbot.core.instrument import (
    Instrument,
    lots_to_units,
    pip_size_for,
    units_to_lots,
)


class TestPipSize:
    def test_standard_pairs_use_four_decimals(self):
        assert pip_size_for("USD") == 0.0001
        assert Instrument.parse("EUR_USD").pip_size == 0.0001

    @pytest.mark.parametrize("quote", ["JPY", "HUF", "KRW"])
    def test_two_decimal_quotes_use_a_bigger_pip(self, quote):
        assert pip_size_for(quote) == 0.01
        assert Instrument.parse(f"USD_{quote}").pip_size == 0.01

    def test_pip_size_follows_the_quote_not_the_base(self):
        # JPY as the *base* is still a 4-decimal pip.
        assert Instrument.parse("JPY_USD").pip_size == 0.0001


class TestParsing:
    @pytest.mark.parametrize("raw", ["EUR_USD", "eur/usd", "EUR-USD", "eur_usd"])
    def test_accepts_common_separators_and_case(self, raw):
        i = Instrument.parse(raw)
        assert (i.symbol, i.base, i.quote) == ("EUR_USD", "EUR", "USD")

    @pytest.mark.parametrize("raw", ["EURUSD", "EUR", "EU_USD", "EUR_USDX", ""])
    def test_rejects_malformed_symbols(self, raw):
        with pytest.raises(ValueError):
            Instrument.parse(raw)


class TestConversions:
    def test_pips_round_trip(self, eurusd, usdjpy):
        for ins, pips in ((eurusd, 25.0), (usdjpy, 25.0)):
            assert ins.price_to_pips(ins.pips_to_price(pips)) == pytest.approx(pips)

    def test_pip_values_differ_between_pair_types(self, eurusd, usdjpy):
        assert eurusd.pips_to_price(20) == pytest.approx(0.0020)
        assert usdjpy.pips_to_price(20) == pytest.approx(0.20)

    def test_display_precision_includes_the_pipette(self, eurusd, usdjpy):
        assert eurusd.display_precision == 5
        assert usdjpy.display_precision == 3


class TestUnitRounding:
    def test_rounds_toward_zero_so_risk_is_never_exceeded(self, eurusd):
        assert eurusd.round_units(1234.9) == 1234
        assert eurusd.round_units(-1234.9) == -1234

    def test_below_venue_minimum_is_no_trade(self):
        ins = Instrument.parse("EUR_USD", min_units=1000)
        assert ins.round_units(999) == 0
        assert ins.round_units(1500) == 1000

    def test_lot_helpers(self):
        assert units_to_lots(50_000) == 0.5
        assert lots_to_units(0.1) == 10_000
