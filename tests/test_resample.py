from datetime import UTC, datetime, timedelta

import pytest

from fxbot.core.resample import Resampler, bucket_start
from fxbot.core.types import Candle


def m1(start, count, base=1.0800, step=0.0001):
    return [
        Candle(
            time=start + timedelta(minutes=i),
            open=base + i * step, high=base + i * step + 0.0005,
            low=base + i * step - 0.0005, close=base + i * step + 0.0002,
            volume=10.0,
        )
        for i in range(count)
    ]


class TestBucketing:
    def test_intraday_buckets_floor_to_the_granularity(self):
        moment = datetime(2024, 1, 2, 8, 47, tzinfo=UTC)
        assert bucket_start(moment, 3600).hour == 8
        assert bucket_start(moment, 900).minute == 45
        assert bucket_start(moment, 300).minute == 45

    def test_daily_buckets_anchor_to_the_fx_day_not_utc_midnight(self):
        # 20:00 UTC Tuesday is already Wednesday's FX day (past 17:00 NY).
        after = bucket_start(datetime(2024, 1, 2, 23, tzinfo=UTC), 86400)
        before = bucket_start(datetime(2024, 1, 2, 12, tzinfo=UTC), 86400)
        assert after > before


class TestResampler:
    def test_aggregates_ohlcv_correctly(self):
        r = Resampler("M15")
        emitted = [bar for c in m1(datetime(2024, 1, 2, 8, tzinfo=UTC), 20)
                   if (bar := r.update(c)) is not None]
        assert len(emitted) == 1
        bar = emitted[0]
        assert bar.open == pytest.approx(1.0800)
        assert bar.high == pytest.approx(1.0800 + 14 * 0.0001 + 0.0005)
        assert bar.low == pytest.approx(1.0800 - 0.0005)
        assert bar.volume == pytest.approx(150.0)

    def test_a_bar_is_emitted_only_once_the_next_bucket_starts(self):
        """The property that makes multi-timeframe look-ahead impossible."""
        r = Resampler("M15")
        candles = m1(datetime(2024, 1, 2, 8, tzinfo=UTC), 15)
        for candle in candles[:14]:
            assert r.update(candle) is None
        assert r.update(candles[14]) is None, "15 bars fill the bucket but do not close it"
        assert r.update(m1(datetime(2024, 1, 2, 8, 15, tzinfo=UTC), 1)[0]) is not None

    def test_last_is_always_a_completed_bar(self):
        r = Resampler("H1")
        for candle in m1(datetime(2024, 1, 2, 8, tzinfo=UTC), 90):
            r.update(candle)
        assert r.last is not None
        assert r.last.time.hour == 8
        assert r.last.complete

    def test_not_ready_until_the_first_bar_closes(self):
        r = Resampler("H1")
        for candle in m1(datetime(2024, 1, 2, 8, tzinfo=UTC), 30):
            r.update(candle)
        assert not r.ready

    def test_history_is_bounded(self):
        r = Resampler("M5", keep=10)
        for candle in m1(datetime(2024, 1, 2, 8, tzinfo=UTC), 400):
            r.update(candle)
        assert len(r.completed) <= 10

    def test_gaps_do_not_produce_phantom_bars(self):
        """A weekend gap must not synthesise the buckets it skipped."""
        r = Resampler("H1")
        emitted = []
        for candle in m1(datetime(2024, 1, 5, 20, tzinfo=UTC), 70):
            if (bar := r.update(candle)) is not None:
                emitted.append(bar)
        for candle in m1(datetime(2024, 1, 7, 22, tzinfo=UTC), 70):
            if (bar := r.update(candle)) is not None:
                emitted.append(bar)
        times = [b.time for b in emitted]
        assert len(times) == len(set(times))
        assert all(t.minute == 0 for t in times)

    def test_reset_clears_state(self):
        r = Resampler("M15")
        for candle in m1(datetime(2024, 1, 2, 8, tzinfo=UTC), 40):
            r.update(candle)
        r.reset()
        assert not r.ready and r.last is None

    def test_unknown_granularity_is_rejected(self):
        with pytest.raises(ValueError, match="unknown granularity"):
            Resampler("H3")
