from datetime import UTC, datetime, timedelta

import pytest

from fxbot.data import csv_source
from fxbot.data.base import granularity_seconds, validate
from fxbot.data.oanda import to_candle
from fxbot.data.synthetic import generate
from fxbot.oanda_api import parse_time


class TestGranularity:
    def test_known_granularities(self):
        assert granularity_seconds("H1") == 3600
        assert granularity_seconds("m15") == 900

    def test_unknown_granularity_is_an_error(self):
        with pytest.raises(ValueError, match="unknown granularity"):
            granularity_seconds("H3")


class TestValidation:
    def test_clean_data_has_no_problems(self):
        assert validate(generate(bars=100)) == []

    def test_empty_series_is_reported(self):
        assert validate([], "EUR_USD") == ["EUR_USD: no candles"]

    def test_inverted_bar_is_caught(self):
        from fxbot.core.types import Candle
        bad = [Candle(datetime(2024, 1, 2, tzinfo=UTC), 1.08, 1.07, 1.09, 1.085)]
        assert any("below low" in p for p in validate(bad))

    def test_out_of_order_timestamps_are_caught(self):
        candles = generate(bars=10)
        shuffled = [candles[0], candles[2], candles[1]] + candles[3:]
        assert any("non-increasing" in p for p in validate(shuffled))


class TestCsv:
    def test_round_trip_preserves_prices_and_times(self, tmp_path):
        original = generate(bars=150)
        path = csv_source.write(original, tmp_path / "c.csv")
        loaded = csv_source.CsvSource(path).fetch()
        assert len(loaded) == len(original)
        assert loaded[0].time == original[0].time
        assert loaded[-1].close == pytest.approx(original[-1].close)

    def test_naive_timestamps_are_rejected_by_default(self, tmp_path):
        path = tmp_path / "n.csv"
        path.write_text("Date,Open,High,Low,Close\n"
                        "2024-01-02 10:00:00,1.085,1.086,1.084,1.0855\n")
        with pytest.raises(ValueError, match="no timezone"):
            csv_source.CsvSource(path).fetch()

    def test_naive_timestamps_are_accepted_when_asserted_utc(self, tmp_path):
        path = tmp_path / "n.csv"
        path.write_text("Date,Open,High,Low,Close\n"
                        "2024-01-02 10:00:00,1.085,1.086,1.084,1.0855\n")
        candles = csv_source.CsvSource(path, assume_utc=True).fetch()
        assert candles[0].time == datetime(2024, 1, 2, 10, tzinfo=UTC)

    def test_vendor_column_aliases_are_understood(self, tmp_path):
        path = tmp_path / "v.csv"
        path.write_text("Gmt time,BidOpen,BidHigh,BidLow,BidClose,TickVolume\n"
                        "2024-01-02T10:00:00Z,1.085,1.086,1.084,1.0855,412\n")
        candles = csv_source.CsvSource(path).fetch()
        assert candles[0].volume == 412

    def test_a_missing_column_names_itself(self, tmp_path):
        path = tmp_path / "m.csv"
        path.write_text("time,open,high\n2024-01-02T10:00:00Z,1.085,1.086\n")
        with pytest.raises(ValueError, match="missing required column"):
            csv_source.CsvSource(path).fetch()

    def test_date_filters_apply(self, tmp_path):
        original = generate(bars=200)
        path = csv_source.write(original, tmp_path / "c.csv")
        cutoff = original[100].time
        assert len(csv_source.CsvSource(path).fetch(start=cutoff)) == 100

    def test_count_returns_the_most_recent_bars(self, tmp_path):
        original = generate(bars=200)
        path = csv_source.write(original, tmp_path / "c.csv")
        assert csv_source.CsvSource(path).fetch(count=10)[-1].time == original[-1].time

    def test_missing_file_is_reported_clearly(self):
        with pytest.raises(FileNotFoundError, match="no such candle file"):
            csv_source.CsvSource("nope.csv").fetch()


class TestOandaParsing:
    @pytest.mark.parametrize("raw,expected_micro", [
        ("2024-01-02T15:30:00.000000000Z", 0),
        ("2024-01-02T15:30:00.123456789Z", 123456),
        ("2024-01-02T15:30:00Z", 0),
    ])
    def test_nanosecond_timestamps_are_handled(self, raw, expected_micro):
        assert parse_time(raw).microsecond == expected_micro

    def test_candle_conversion_keeps_both_sides_of_the_quote(self):
        candle = to_candle({
            "complete": True, "volume": 410, "time": "2024-01-02T15:00:00.000000000Z",
            "mid": {"o": "1.09400", "h": "1.09520", "l": "1.09380", "c": "1.09480"},
            "bid": {"o": "1.09395", "h": "1.09515", "l": "1.09375", "c": "1.09475"},
            "ask": {"o": "1.09405", "h": "1.09525", "l": "1.09385", "c": "1.09485"},
        })
        assert candle.close == pytest.approx(1.09480)
        assert candle.spread == pytest.approx(0.0001, abs=1e-9)
        assert candle.complete

    def test_mid_only_candles_have_no_spread(self):
        candle = to_candle({
            "complete": True, "volume": 1, "time": "2024-01-02T15:00:00Z",
            "mid": {"o": "1.0", "h": "1.0", "l": "1.0", "c": "1.0"},
        })
        assert candle.spread is None

    def test_a_candle_without_prices_is_an_error(self):
        with pytest.raises(ValueError, match="no price data"):
            to_candle({"time": "2024-01-02T15:00:00Z", "complete": True})


class TestSynthetic:
    def test_is_deterministic_for_a_given_seed(self):
        assert [c.close for c in generate(bars=50, seed=1)] == [
            c.close for c in generate(bars=50, seed=1)
        ]

    def test_different_seeds_differ(self):
        assert [c.close for c in generate(bars=50, seed=1)] != [
            c.close for c in generate(bars=50, seed=2)
        ]

    def test_only_generates_bars_while_the_market_is_open(self):
        from fxbot.core.clock import is_market_open
        assert all(is_market_open(c.time) for c in generate(bars=400))

    def test_weekend_gaps_appear_in_the_series(self):
        candles = generate(bars=400, granularity="H1")
        gaps = [b.time - a.time for a, b in zip(candles, candles[1:], strict=False)]
        assert any(g > timedelta(hours=24) for g in gaps)

    def test_jpy_pairs_are_rounded_to_three_decimals(self):
        candles = generate(symbol="USD_JPY", start_price=150.0, bars=20)
        assert all(round(c.close, 3) == c.close for c in candles)
